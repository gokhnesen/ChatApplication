import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface ChatMessage {
  text: string;
  time: Date;
  user: {
    name: string;
    avatar: string;
  };
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat {
  messages: ChatMessage[] = [
    {
      text: 'Merhaba!',
      time: new Date(),
      user: { name: 'Ali', avatar: 'https://i.pravatar.cc/40?img=1' }
    },
    {
      text: 'Selam, nasılsın?',
      time: new Date(),
      user: { name: 'Ayşe', avatar: 'https://i.pravatar.cc/40?img=2' }
    }
  ];
  messageText: string = '';
  currentUser = { name: 'Ben', avatar: 'https://i.pravatar.cc/40?img=3' };
  receiverUser = { name: 'Ayşe', avatar: 'https://i.pravatar.cc/40?img=2' }; // örnek alıcı

  sendMessage() {
    if (this.messageText.trim()) {
      this.messages.push({
        text: this.messageText,
        time: new Date(),
        user: { ...this.currentUser }
      });
      this.messageText = '';
    }
  }

  // Alıcıyı değiştirmek için fonksiyon ekleyebilirsin
  setReceiver(user: { name: string; avatar: string }) {
    this.receiverUser = user;
  }
}
