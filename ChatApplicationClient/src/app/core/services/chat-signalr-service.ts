import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MessageType } from '../shared/models/message';

@Injectable({
  providedIn: 'root'
})
export class ChatSignalrService {
  private hubConnection?: signalR.HubConnection;

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
      .catch(() => {});
  }

  // ✅ GÜNCELLENECEK - Attachment bilgilerini ekle
  onReceiveMessage(callback: (
    senderId: string, 
    content: string,
    type?: MessageType,
    attachmentUrl?: string | null,
    attachmentName?: string | null,
    attachmentSize?: number | null
  ) => void): void {
    this.hubConnection?.off('ReceiveMessage');
    this.hubConnection?.on('ReceiveMessage', callback);
  }

  // ✅ GÜNCELLENECEK - Attachment bilgilerini ekle
  onMessageSent(callback: (
    receiverId: string, 
    content: string,
    type?: MessageType,
    attachmentUrl?: string | null,
    attachmentName?: string | null,
    attachmentSize?: number | null
  ) => void): void {
    this.hubConnection?.off('MessageSent');
    this.hubConnection?.on('MessageSent', callback);
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

  // ✅ GÜNCELLENECEK - Attachment bilgilerini gönder
  sendMessage(
    receiverId: string, 
    content: string,
    type: MessageType = MessageType.Text,
    attachmentUrl?: string | null,
    attachmentName?: string | null,
    attachmentSize?: number | null
  ): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('SendMessage', receiverId, content, type, attachmentUrl, attachmentName, attachmentSize)
        .catch(err => console.error('SendMessage error:', err));
    }
  }

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  stopConnection(): void {
    this.hubConnection?.stop().catch(() => {});
  }
}
