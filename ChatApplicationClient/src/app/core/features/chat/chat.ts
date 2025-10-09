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

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class Chat implements OnChanges, OnInit, OnDestroy, AfterViewChecked {
  @Input() receiverUser: { id: string; name: string; lastName?: string; avatar?: string } = { 
    id: '', 
    name: 'Sohbet', 
    avatar: 'assets/default-avatar.png' 
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
  private subscriptions: Subscription[] = [];
  
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

  private initializeSignalR(): void {
    if (!this.currentUser.id) {
      console.error('Cannot initialize SignalR: currentUser.id is missing');
      return;
    }

    // Start SignalR connection
    this.signalRService.startConnection(this.currentUser.id);
    
    // Set up message receiver
    this.signalRService.onReceiveMessage((senderId: string, content: string) => {
      console.log('Live message received from:', senderId, 'content:', content);
      
      // Only add message if it's from the current chat
      if (senderId === this.receiverUser.id || senderId === this.currentUser.id) {
        const newMessage: Message = {
          id: Date.now().toString(), // Temporary ID - will be replaced with actual ID from database
          senderId: senderId,
          receiverId: this.currentUser.id,
          content: content,
          sentAt: new Date(),
          isRead: false
        };
        
        this.messages.push(newMessage);
        setTimeout(() => this.scrollToBottom(), 0);
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
    this.subscriptions.push(
      this.route.params.subscribe(params => {
        const friendId = params['id'];
        console.log('Route params ID:', friendId);
        
        if (friendId) {
          if (!this.receiverUser.id) {
            this.subscriptions.push(
              this.friendService.getMyFriends().subscribe(friends => {
                const friend = friends.find(f => f.id === friendId);
                if (friend) {
                  this.receiverUser = {
                    id: friend.id,
                    name: friend.name || '',
                    lastName: friend.lastName,
                    avatar: friend.avatarUrl || 'assets/default-avatar.png'
                  };
                  console.log('Friend found and set as receiver:', this.receiverUser);
                  this.loadMessages();
                }
              })
            );
          } else {
            this.loadMessages();
          }
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
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadMessages(): void {
    if (this.receiverUser && this.receiverUser.id && this.currentUser.id) {
      console.log('ATTEMPTING TO LOAD MESSAGES between', this.currentUser.id, 'and', this.receiverUser.id);
      
      this.subscriptions.push(
        this.messageService.getMessages(this.currentUser.id, this.receiverUser.id)
          .subscribe({
            next: (messages) => {
              console.log('Messages received:', messages);
              this.messages = messages;
              setTimeout(() => this.scrollToBottom(), 0);
            },
            error: (error) => {
              console.error('Error loading messages:', error);
            }
          })
      );
    } else {
      console.warn('Cannot load messages: receiverUser.id or currentUser.id is missing');
    }
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
        console.log('Message saved to database:', response);
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
      },
      error: (error) => {
        console.error('Error saving message to database:', error);
      }
    });
  }
}
  
  private sendMessageViaHttp() {
    if (this.messageText.trim() && this.receiverUser.id && this.currentUser.id) {
      const newMessage = {
        senderId: this.currentUser.id,
        receiverId: this.receiverUser.id,
        content: this.messageText
      };
      
      console.log('Sending message via HTTP:', newMessage);
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
