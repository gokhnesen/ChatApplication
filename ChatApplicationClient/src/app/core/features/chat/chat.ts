import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../services/message-service';
import { Message } from '../../shared/models/message';
import { FriendService } from '../../services/friend-service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnChanges, OnInit {
  @Input() receiverUser: { id: string; name: string; lastName?: string; avatar?: string } = { 
    id: '', 
    name: 'Sohbet', 
    avatar: 'assets/default-avatar.png' 
  };
  
  messages: Message[] = [];
  messageText: string = '';
  // Kullanıcı bilgisini gerçek uygulamada servislerden almalısınız
  currentUser = { 
    id: 'df12090d-3907-4c83-8f1a-d52b32e55a6c', // Giriş yapan kullanıcının ID'si
    name: 'Ben', 
    avatar: 'https://i.pravatar.cc/40?img=3' 
  };

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {}

  ngOnInit(): void {
    // URL'den ID alınıyor mu kontrol et
    this.route.params.subscribe(params => {
      const friendId = params['id'];
      console.log('Route params ID:', friendId);
      
      if (friendId) {
        // Eğer receiverUser zaten set edilmemişse
        if (!this.receiverUser.id) {
          // Arkadaş bilgilerini servisten al
          this.friendService.getMyFriends().subscribe(friends => {
            const friend = friends.find(f => f.id === friendId);
            if (friend) {
              // ReceiverUser'ı güncelle
              this.receiverUser = {
                id: friend.id,
                name: friend.name || '',
                lastName: friend.lastName,
                avatar: friend.avatarUrl || 'assets/default-avatar.png'
              };
              console.log('Friend found and set as receiver:', this.receiverUser);
              this.loadMessages();
            }
          });
        } else {
          this.loadMessages();
        }
      }
    });

    // Eğer receiverUser direkt olarak set edildiyse
    if (this.receiverUser && this.receiverUser.id) {
      console.log('receiverUser already set:', this.receiverUser);
      this.loadMessages();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['receiverUser'] && changes['receiverUser'].currentValue && changes['receiverUser'].currentValue.id) {
      console.log('Receiver user changed:', this.receiverUser);
      this.loadMessages();
    }
  }

  loadMessages(): void {
    if (this.receiverUser && this.receiverUser.id) {
      console.log('ATTEMPTING TO LOAD MESSAGES between', this.currentUser.id, 'and', this.receiverUser.id);
      // Hard-coded ID'leri test için kullan
      const testUserId1 = 'df12090d-3907-4c83-8f1a-d52b32e55a6c';
      const testUserId2 = '6d24208e-1ada-40c3-8aa3-e6cd9910257d';
      
      // Test için sabit ID'leri kullan
      this.messageService.getMessages( testUserId2,testUserId1)
        .subscribe({
          next: (messages) => {
            console.log('Messages received:', messages);
            this.messages = messages;
          },
          error: (error) => {
            console.error('Error loading messages:', error);
          }
        });
    } else {
      console.warn('Cannot load messages: receiverUser.id is missing');
    }
  }

  sendMessage() {
    if (this.messageText.trim() && this.receiverUser.id) {
      const newMessage = {
        senderId: this.currentUser.id,
        receiverId: this.receiverUser.id,
        content: this.messageText
      };
      
      console.log('Sending message:', newMessage);
      this.messageService.sendMessage(newMessage).subscribe({
        next: (response) => {
          console.log('Message sent successfully:', response);
          this.loadMessages();
          this.messageText = '';
        },
        error: (error) => {
          console.error('Error sending message:', error);
        }
      });
    } else {
      console.warn('Cannot send message: Empty message or missing receiverId');
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUser.id;
  }

  getReceiverFullName(): string {
    return this.receiverUser.lastName
      ? `${this.receiverUser.name} ${this.receiverUser.lastName}`
      : this.receiverUser.name;
  }
}
