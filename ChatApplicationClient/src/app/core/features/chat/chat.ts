import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, inject, effect } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../services/message-service';
import { Message } from '../../shared/models/message';
import { FriendService } from '../../services/friend-service';
import { UserService } from '../../services/user-service';

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
  
  // Initialize current user with default values
  currentUser = { 
    id: '', 
    name: '', 
    avatar: 'assets/default-avatar.png' 
  };

  private userService = inject(UserService);
  
  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {}

  ngOnInit(): void {
    // First check if we already have the current user in the signal
    const signalUser = this.userService.currentUser();
    
    if (signalUser) {
      // Use the user from the signal if available
      this.setCurrentUserFromSignal(signalUser);
      this.initializeChat();
    } else {
      // Otherwise, fetch the current user info
      this.userService.getUserInfo().subscribe({
        next: (userInfo) => {
          if (userInfo) {
            this.setCurrentUserFromSignal(userInfo);
          }
          this.initializeChat();
        },
        error: (error) => {
          console.error('Error loading current user:', error);
        }
      });
    }
    
    // Subscribe to changes in the currentUser signal using a signal effect
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.setCurrentUserFromSignal(user);
      }
    });
  }
  
  private setCurrentUserFromSignal(user: any): void {
    this.currentUser = {
      id: user.id,
      name: user.name || user.userName || '',
      avatar: user.profilePhotoUrl || 'assets/default-avatar.png'
    };
    console.log('Current user set:', this.currentUser);
  }

  private initializeChat(): void {
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
      // Only load messages if we already have the current user info
      if (this.currentUser.id) {
        this.loadMessages();
      }
    }
  }

  loadMessages(): void {
    if (this.receiverUser && this.receiverUser.id && this.currentUser.id) {
      console.log('ATTEMPTING TO LOAD MESSAGES between', this.currentUser.id, 'and', this.receiverUser.id);
      
      this.messageService.getMessages(this.currentUser.id, this.receiverUser.id)
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
      console.warn('Cannot load messages: receiverUser.id or currentUser.id is missing');
    }
  }

  sendMessage() {
    if (this.messageText.trim() && this.receiverUser.id && this.currentUser.id) {
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
      console.warn('Cannot send message: Empty message or missing receiverId/currentUserId');
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
