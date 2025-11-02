import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

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

  onReceiveMessage(callback: (senderId: string, content: string) => void): void {
    this.hubConnection?.off('ReceiveMessage');
    this.hubConnection?.on('ReceiveMessage', callback);
  }

  onMessageSent(callback: (receiverId: string, content: string) => void): void {
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

  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  stopConnection(): void {
    this.hubConnection?.stop().catch(() => {});
  }
}
