import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject, effect, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from '../../services/message-service';
import { Message } from '../../shared/models/message';
import { FriendService } from '../../services/friend-service';
import { UserService } from '../../services/user-service';
import { ChatSignalrService } from '../../services/chat-signalr-service';
import { Subscription } from 'rxjs';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, ProfilePhotoPipe],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnChanges, OnInit, OnDestroy, AfterViewChecked {
  @Input() receiverUser: { id: string; name: string; lastName?: string; profilePhotoUrl?: string } = { 
    id: '', 
    name: 'Sohbet', 
    profilePhotoUrl: 'assets/default-avatar.png' 
  };
  
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  messages: Message[] = [];
  messageText: string = '';
  
  currentUser = { 
    id: '', 
    name: '', 
    avatar: 'assets/default-avatar.png' 
  };

  private userService = inject(UserService);
  private signalRService = inject(ChatSignalrService);
  private messageBroadcast = inject(MessageService);
  private subscriptions: Subscription[] = [];
  
  unreadCount: number = 0;

  private hasMarkedAsRead = false; // Yeni flag ekle

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {}

  ngOnInit(): void {
    const signalUser = this.userService.currentUser();
    
    if (signalUser) {
      this.setCurrentUserFromSignal(signalUser);
      this.initializeChat();
      this.initializeSignalR();
    } else {
      this.userService.getUserInfo().subscribe({
        next: (userInfo) => {
          if (userInfo) {
            this.setCurrentUserFromSignal(userInfo);
            this.initializeSignalR();
          }
          this.initializeChat();
        },
        error: (error) => {
          console.error('Error loading current user:', error);
        }
      });
    }
    
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.setCurrentUserFromSignal(user);
      }
    });
  }
  
  ngOnDestroy(): void {
    // Clean up all subscriptions when component is destroyed
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
    // Sadece bir kez işaretle
    if (!this.hasMarkedAsRead) {
      this.markMessagesAsRead();
    }
  }

  private markMessagesAsRead(): void {
    const unreadMessages = this.messages.filter(
      m => !m.isRead && m.receiverId === this.currentUser.id && m.senderId === this.receiverUser.id
    );

    if (unreadMessages.length > 0) {
      this.hasMarkedAsRead = true;
      
      // Backend'in beklediği format: userId ve senderId
      this.messageService.markAsRead(this.currentUser.id, this.receiverUser.id).subscribe({
        next: (response) => {
          // Local state'i güncelle
          unreadMessages.forEach(m => {
            m.isRead = true;
            m.readAt = new Date();
          });
          this.unreadCount = response.unreadCount || 0;
          
          // SignalR bildirimi (opsiyonel - backend zaten gönderiyor)
          if (this.signalRService.isConnected()) {
            const messageIds = unreadMessages.map(m => m.id);
            this.signalRService.notifyMessagesRead(messageIds);
          }
        },
        error: () => {
          this.hasMarkedAsRead = false;
        }
      });
    }
  }

  private initializeSignalR(): void {
    if (!this.currentUser.id) {
      return;
    }

    this.signalRService.startConnection(this.currentUser.id);
    
    // Başkasından mesaj geldiğinde
    this.signalRService.onReceiveMessage((senderId: string, content: string) => {
      if (senderId === this.receiverUser.id) {
        const newMessage: Message = {
          id: Date.now().toString(),
          senderId: senderId,
          receiverId: this.currentUser.id,
          content: content,
          sentAt: new Date(),
          isRead: false
        };
        
        this.messages.push(newMessage);
        setTimeout(() => this.scrollToBottom(), 0);
      }
      
      // Friends component'e bildir (her durumda)
      this.messageBroadcast.notifyNewMessage({
        friendId: senderId,
        content: content,
        senderId: senderId,
        receiverId: this.currentUser.id,
        sentAt: new Date(),
        isOwn: false
      });
    });

    this.signalRService.onMessageRead((messageIds: string[]) => {
      this.messages.forEach(m => {
        if (messageIds.includes(m.id)) {
          m.isRead = true;
          m.readAt = new Date();
        }
      });
    });

    this.signalRService.onUnreadCountUpdate((count: number) => {
      this.unreadCount = count;
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
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        const friendId = params['id'];
        
        if (friendId && friendId !== this.receiverUser.id) {
          this.subscriptions.push(
            this.friendService.getMyFriends().subscribe(friends => {
              const friend = friends.find(f => f.id === friendId);
              if (friend) {
                this.receiverUser = {
                  id: friend.id,
                  name: friend.name || '',
                  lastName: friend.lastName,
                  // Backend'den tam URL geliyor
                  profilePhotoUrl: friend.profilePhotoUrl || 'assets/default-avatar.png'
                };
                
                this.messages = [];
                this.loadMessages();
              }
            })
          );
        }
      })
    );

    if (this.receiverUser && this.receiverUser.id) {
      console.log('receiverUser already set:', this.receiverUser);
      this.loadMessages();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['receiverUser'] && changes['receiverUser'].currentValue && changes['receiverUser'].currentValue.id) {
      console.log('Receiver user changed:', this.receiverUser);
      if (this.currentUser.id) {
        this.loadMessages();
      }
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  loadMessages(): void {
    if (this.receiverUser && this.receiverUser.id && this.currentUser.id) {
      this.hasMarkedAsRead = false; // Yeni mesajlar yüklendiğinde flag'i sıfırla
      
      this.subscriptions.push(
        this.messageService.getMessages(this.currentUser.id, this.receiverUser.id)
          .subscribe({
            next: (messages) => {
              this.messages = messages;
              this.calculateUnreadCount();
              setTimeout(() => this.scrollToBottom(), 0);
            },
            error: () => {}
          })
      );
    }
  }
  
  private calculateUnreadCount(): void {
    this.unreadCount = this.messages.filter(
      m => !m.isRead && m.receiverId === this.currentUser.id
    ).length;
  }

  sendMessage() {
    if (this.messageText.trim() && this.receiverUser.id && this.currentUser.id) {
      const messageContent = this.messageText.trim();
      
      const newMessage = {
        senderId: this.currentUser.id,
        receiverId: this.receiverUser.id,
        content: messageContent
      };
      
      this.messageService.sendMessage(newMessage).subscribe({
        next: (response) => {
          const localMessage: Message = {
            id: response.id || Date.now().toString(),
            senderId: this.currentUser.id,
            receiverId: this.receiverUser.id,
            content: messageContent,
            sentAt: new Date(),
            isRead: false
          };
          this.messages.push(localMessage);
          this.messageText = '';
          setTimeout(() => this.scrollToBottom(), 0);
          
          // Friends component'e bildir
          this.messageBroadcast.notifyNewMessage({
            friendId: this.receiverUser.id,
            content: messageContent,
            senderId: this.currentUser.id,
            receiverId: this.receiverUser.id,
            sentAt: new Date(),
            isOwn: true
          });
        },
        error: () => {}
      });
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
