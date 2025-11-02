import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Message, MessageUpdate } from '../shared/models/message';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'https://localhost:7055/api';
  private httpClient = inject(HttpClient);
  private messageUpdateSubject = new Subject<MessageUpdate>();



    messageUpdate$ = this.messageUpdateSubject.asObservable();
  notifyNewMessage(update: MessageUpdate): void {
    this.messageUpdateSubject.next(update);
  }
  sendMessage(command: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/message`, command);
  }

  getMessages(userId1: string, userId2: string): Observable<Message[]> {
    return this.httpClient.get<Message[]>(`${this.apiUrl}/message/${userId1}/${userId2}`);
  }

  // Backend'e userId ve senderId gönder
  markAsRead(userId: string, senderId: string): Observable<any> {
    return this.httpClient.put(`${this.apiUrl}/message/mark-as-read`, { 
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
}
