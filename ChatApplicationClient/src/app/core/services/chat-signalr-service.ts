import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MessageType } from '../shared/models/message';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatSignalrService {
  private hubConnection?: signalR.HubConnection;
  private presenceSubject = new Subject<{ userId: string; isOnline: boolean; lastSeen?: string | null }>();
  public presence$ = this.presenceSubject.asObservable();
 
  startConnection(userId: string): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7055/chathub', {
        accessTokenFactory: () => {
          return localStorage.getItem('authToken') || '';
        }
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    this.hubConnection
      .start()
      .then(() => {
      })
      .catch((err) => {
      });
 
    this.hubConnection.on('PresenceUpdated', (payload: { userId: string; isOnline: boolean; lastSeen?: string }) => {
      try {
        this.presenceSubject.next({ userId: payload.userId, isOnline: !!payload.isOnline, lastSeen: payload.lastSeen ?? null });
      } catch (e) {
      }
    });
  }

  isUserOnline(userId: string): Promise<boolean> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      return Promise.resolve(false);
    }
    return this.hubConnection.invoke<boolean>('IsUserOnline', userId).catch(() => false);
  }
  
  async refreshPresence(userIds: string[]): Promise<void> {
    if (!userIds || userIds.length === 0) return;
    for (const id of userIds) {
      try {
        const online = await this.isUserOnline(id);
        this.presenceSubject.next({ userId: id, isOnline: online, lastSeen: online ? null : null });
      } catch {
        this.presenceSubject.next({ userId: id, isOnline: false, lastSeen: null });
      }
    }
  }


onReceiveMessage(callback: (
    senderId: string, 
    content: string,
    type: MessageType,
    attachmentUrl: string | null,
    attachmentName: string | null,
    attachmentSize: number | null,
    messageId: string, 
    sentAt: string     
) => void): void {
    this.hubConnection?.off('ReceiveMessage');
    this.hubConnection?.on('ReceiveMessage', (
        senderId: string, 
        content: string,
        type: MessageType,
        attachmentUrl: string | null,
        attachmentName: string | null,
        attachmentSize: number | null,
        messageId: string, 
        sentAt: string     
    ) => {
        callback(senderId, content, type, attachmentUrl, attachmentName, attachmentSize, messageId, sentAt);
    });
}


  onMessageSent(callback: (
    receiverId: string, 
    content: string,
    type: MessageType,
    attachmentUrl: string | null,
    attachmentName: string | null,
    attachmentSize: number | null
  ) => void): void {
    this.hubConnection?.off('MessageSent');
    this.hubConnection?.on('MessageSent', (
      receiverId: string, 
      content: string,
      type: MessageType,
      attachmentUrl: string | null,
      attachmentName: string | null,
      attachmentSize: number | null
    ) => {
      callback(receiverId, content, type, attachmentUrl, attachmentName, attachmentSize);
    });
  }

  onMessageError(callback: (error: string) => void): void {
    this.hubConnection?.off('MessageError');
    this.hubConnection?.on('MessageError', callback);
  }

  onMessageRead(callback: (messageIds: string[]) => void): void {
    this.hubConnection?.off('MessageRead');
    this.hubConnection?.on('MessageRead', callback);
  }

  onUnreadCountUpdate(callback: (count: number) => void): void {
    this.hubConnection?.off('UpdateUnreadMessageCount');    
    this.hubConnection?.on('UpdateUnreadMessageCount', callback);
  }

  notifyMessagesRead(messageIds: string[]): Promise<void> { 
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('NotifyMessagesRead', messageIds)
        .catch(() => {});
    }
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  stopConnection(): void {
    this.hubConnection?.stop().catch(() => {});
  }

  onFriendRequestReceived(callback: (
  request: {
    friendshipId: string;
    senderId: string;
    senderName: string;
    senderLastName: string;
    senderEmail: string;
    senderProfilePhotoUrl?: string | null;
    requestDate: string;
  }
) => void): void {
  this.hubConnection?.off('FriendRequestReceived');
  this.hubConnection?.on('FriendRequestReceived', callback);
}

onFriendRequestAccepted(callback: (
  data: {
    friendshipId: string;
    senderId: string;
    receiverId: string;
    acceptedAt: string;
  }
) => void): void {
  this.hubConnection?.off('FriendRequestAccepted');
  this.hubConnection?.on('FriendRequestAccepted', callback);
}
}
