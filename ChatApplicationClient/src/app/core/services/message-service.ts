import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Message, MessageUpdate, MessageType } from '../shared/models/message';
import { environment } from '../../../environments/environment';
import { UserService } from './user-service';



@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);
  private userService = inject(UserService);
  private messageUpdateSubject = new Subject<MessageUpdate>();

  messageUpdate$ = this.messageUpdateSubject.asObservable();

  notifyNewMessage(update: MessageUpdate): void {
    const cur = this.userService.currentUser();
    const curId = cur?.id;

    let computedFriendId = update.friendId || '';

    if (!computedFriendId || computedFriendId === '' || (curId && computedFriendId === curId)) {
      if (update.senderId && update.receiverId && curId) {
        computedFriendId = (update.senderId === curId ? update.receiverId : update.senderId) || '';
      } else {
        computedFriendId = update.senderId || update.receiverId || '';
      }
    }

    const s = update.senderId || '';
    const r = update.receiverId || '';
    let conversationId = '';
    if (s && r) {
      const pair = [s, r].sort();
      conversationId = pair.join('|');
    } else if (computedFriendId && curId) {
      const pair = [curId, computedFriendId].sort();
      conversationId = pair.join('|');
    }

    update.friendId = computedFriendId;
    (update as any).targetUserId = update.receiverId || null;
    (update as any).conversationId = conversationId;

    this.messageUpdateSubject.next(update);
  }

  sendMessage(command: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/message/send`, command);
  }

  getMessages(userId1: string, userId2: string): Observable<Message[]> {
    return this.httpClient.get<Message[]>(`${this.apiUrl}/message/${userId1}/${userId2}`);
  }

  markAsRead(userId: string, senderId: string): Observable<any> {
    return this.httpClient.post(`${this.apiUrl}/message/mark-as-read`, { 
      userId, 
      senderId 
    });
  }

  getUnreadCount(userId: string): Observable<number> {
    return this.httpClient.get<number>(`${this.apiUrl}/message/unread-count/${userId}`);
  }

  getLatestMessage(userId1: string, userId2: string): Observable<Message> {
    return this.httpClient.get<Message>(`${this.apiUrl}/message/latest/${userId1}/${userId2}`);
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.httpClient.post<any>(`${this.apiUrl}/message/upload-attachment`, formData);
  }

  getFileType(file: File): MessageType {
    if (file.type.startsWith('image/')) return MessageType.Image;
    if (file.type.startsWith('video/')) return MessageType.Video;
    return MessageType.File;
  }

  createFilePreview(file: File): Observable<string> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        observer.next(e.target.result);
        observer.complete();
      };
      
      reader.onerror = (error) => {
        observer.error(error);
      };
      
      reader.readAsDataURL(file);
    });
  }

  validateFileSize(file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } {
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Dosya boyutu ${maxSizeMB}MB'dan büyük olamaz!`
      };
    }
    
    return { valid: true };
  }

  capturePhotoFromCamera(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<File> {
    return new Promise((resolve, reject) => {
      const context = canvasElement.getContext('2d');
      if (!context) {
        reject(new Error('Canvas context alınamadı'));
        return;
      }

      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      context.drawImage(videoElement, 0, 0);

      canvasElement.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve(file);
        } else {
          reject(new Error('Blob oluşturulamadı'));
        }
      }, 'image/jpeg', 0.9);
    });
  }

  createVideoFromBlob(chunks: Blob[]): File {
    const blob = new Blob(chunks, { type: 'video/webm' });
    return new File([blob], `video-${Date.now()}.webm`, { type: 'video/webm' });
  }

  async uploadAndSendMedia(
    file: File,
    senderId: string,
    receiverId: string,
    caption?: string
  ): Promise<any> {
    const uploadResult = await this.uploadFile(file).toPromise();
    
    if (!uploadResult || !uploadResult.isSuccess) {
      throw new Error(uploadResult?.message || 'Dosya yüklenemedi');
    }

    const messageCommand = {
      senderId,
      receiverId,
      content: caption || uploadResult.attachmentName,
      type: uploadResult.type,
      attachmentUrl: uploadResult.attachmentUrl,
      attachmentName: uploadResult.attachmentName,
      attachmentSize: uploadResult.attachmentSize
    };

    return await this.sendMessage(messageCommand).toPromise();
  }

    ask(userId: string, message: string): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/message/ask`, { userId, message });
  }
}
