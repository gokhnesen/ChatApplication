import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ChatSignalrService {

  private hubConnection!: signalR.HubConnection;

  startConnection(userId: string) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7055/chatHub',{accessTokenFactory: () => userId})
    .withAutomaticReconnect()
      .build();
  }

  sendMessage(message: string, senderId: string, receiverId: string) {
    return this.hubConnection.invoke('SendMessage', senderId, receiverId, message);
  }

  onReceiveMessage(callback: (senderId: string, content: string) => void){
    this.hubConnection.on('ReceiveMessage',callback);
  }

}
