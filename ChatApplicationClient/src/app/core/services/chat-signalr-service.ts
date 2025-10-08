import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ChatSignalrService {

  private hubConnection!: signalR.HubConnection;

  startConnection(userId: string) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7055/chathub', { accessTokenFactory: () => userId })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch(err => console.error('SignalR start error:', err));
  }

  sendMessage(message: string, senderId: string, receiverId: string) {
    return this.hubConnection.invoke('SendMessage', senderId, receiverId, message);
  }

  onReceiveMessage(callback: (senderId: string, content: string) => void){
    this.hubConnection.on('ReceiveMessage',callback);
  }

}
