import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class Chat implements OnChanges {
  @Input() receiverUser: any = { name: 'Sohbet', avatar: 'assets/default-avatar.png' }; // Varsayılan değer
  
  messages: ChatMessage[] = [];
  messageText: string = '';
  currentUser = { name: 'Ben', avatar: 'https://i.pravatar.cc/40?img=3' };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['receiverUser'] && changes['receiverUser'].currentValue) {
      // Aquí podrías cargar los mensajes para este usuario específico
      // Por ejemplo, llamando a un servicio
      this.loadMessages();
    }
  }

  loadMessages(): void {
    // Simulación - Reemplaza esto con tu lógica real
    this.messages = [
      {
        text: 'Merhaba!',
        time: new Date(),
        user: { name: this.currentUser.name, avatar: this.currentUser.avatar }
      },
      {
        text: 'Selam, nasılsın?',
        time: new Date(),
        user: { name: this.receiverUser.name, avatar: this.receiverUser.avatar }
      }
    ];
  }

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
}
