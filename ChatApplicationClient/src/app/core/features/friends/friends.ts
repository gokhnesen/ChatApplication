import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { FriendService } from '../../services/friend-service';
import { MessageService } from '../../services/message-service';
import { UserService } from '../../services/user-service';
import { ChatSignalrService } from '../../services/chat-signalr-service';
import { Friend } from '../../shared/models/friend';
import { Message } from '../../shared/models/message';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './friends.html',
  styleUrls: ['./friends.scss']
})
export class Friends implements OnInit, OnDestroy {
  friends: Friend[] = [];
  filteredFriends: Friend[] = [];
  selectedFriend: Friend | null = null;
  searchText: string = '';
  currentUserId: string = '';
  friendMessages: Map<string, Message | null> = new Map();
  
  private messageService = inject(MessageService);
  private userService = inject(UserService);
  private signalRService = inject(ChatSignalrService);
  private messageBroadcast = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {}

  ngOnInit(): void {
    const user = this.userService.currentUser();
    if (user) {
      this.currentUserId = user.id;
      this.loadFriendsWithMessages();
      this.initializeListeners();
    }

    this.route.paramMap.subscribe((params: ParamMap) => {
      const friendId = params.get('id');
      if (friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (friend) {
          this.selectedFriend = friend;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadFriendsWithMessages(): void {
    this.subscriptions.push(
      this.friendService.getMyFriends().subscribe({
        next: (data: Friend[]) => {
          this.friends = data.map(friend => ({
            ...friend,
            avatarUrl: friend.sender?.profilePhotoUrl || 'assets/default-avatar.png'
          }));
          this.filteredFriends = [...this.friends];
          this.loadLatestMessages();
        },
        error: () => {}
      })
    );
  }

  private loadLatestMessages(): void {
    if (this.friends.length === 0) return;

    const messageRequests = this.friends.map(friend =>
      this.messageService.getLatestMessage(this.currentUserId, friend.id)
    );

    this.subscriptions.push(
      forkJoin(messageRequests).subscribe({
        next: (messages) => {
          messages.forEach((message, index) => {
            const friend = this.friends[index];
            
            if (message && message.hasMessage) {
              this.friendMessages.set(friend.id, message);
              
              if (!message.isRead && message.receiverId === this.currentUserId) {
                friend.unreadMessageCount = 1;
              }
            } else {
              this.friendMessages.set(friend.id, null);
            }
          });
          
          this.sortFriendsByLastMessage();
          this.updateView();
        },
        error: () => {}
      })
    );
  }

  private initializeListeners(): void {
    // MessageBroadcastService dinle (ana kaynak)
    this.subscriptions.push(
      this.messageBroadcast.messageUpdate$.subscribe((update) => {
        this.ngZone.run(() => {
          this.handleNewMessage(
            update.friendId,
            update.content,
            update.senderId,
            update.receiverId,
            update.sentAt,
            update.isOwn
          );
        });
      })
    );

    // SignalR de dinle (fallback)
    this.signalRService.onReceiveMessage((senderId: string, content: string) => {
      this.ngZone.run(() => {
        this.handleNewMessage(
          senderId,
          content,
          senderId,
          this.currentUserId,
          new Date(),
          false
        );
      });
    });

    this.signalRService.onMessageSent((receiverId: string, content: string) => {
      this.ngZone.run(() => {
        this.handleNewMessage(
          receiverId,
          content,
          this.currentUserId,
          receiverId,
          new Date(),
          true
        );
      });
    });
  }

  private handleNewMessage(
    friendId: string,
    content: string,
    senderId: string,
    receiverId: string,
    sentAt: Date,
    isOwn: boolean
  ): void {
    const friend = this.friends.find(f => f.id === friendId);
    if (!friend) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: senderId,
      receiverId: receiverId,
      content: content,
      sentAt: sentAt,
      isRead: false,
      hasMessage: true
    };

    this.friendMessages.set(friend.id, newMessage);

    // Eğer mesaj bize geliyorsa sayıyı artır
    if (receiverId === this.currentUserId && !isOwn) {
      friend.unreadMessageCount = (friend.unreadMessageCount || 0) + 1;
    }

    this.sortFriendsByLastMessage();
    this.updateView();
  }

  private sortFriendsByLastMessage(): void {
    this.friends.sort((a, b) => {
      const messageA = this.friendMessages.get(a.id);
      const messageB = this.friendMessages.get(b.id);
      
      const dateA = messageA?.sentAt ? new Date(messageA.sentAt).getTime() : 0;
      const dateB = messageB?.sentAt ? new Date(messageB.sentAt).getTime() : 0;
      
      return dateB - dateA;
    });
  }

  private updateView(): void {
    this.filteredFriends = [...this.friends];
    this.cdr.detectChanges();
  }

  selectFriend(friend: Friend): void {
    this.selectedFriend = friend;
    friend.unreadMessageCount = 0;
    this.cdr.detectChanges();
    this.router.navigate(['/chat', friend.id]);
  }

  filterFriends(): void {
    if (!this.searchText) {
      this.filteredFriends = [...this.friends];
      return;
    }
    const searchLower = this.searchText.toLowerCase();
    this.filteredFriends = this.friends.filter(friend =>
      friend.sender?.name?.toLowerCase().includes(searchLower) ||
      friend.sender?.lastName?.toLowerCase().includes(searchLower) ||
      friend.sender?.email?.toLowerCase().includes(searchLower) ||
      friend.name?.toLowerCase().includes(searchLower) ||
      friend.lastName?.toLowerCase().includes(searchLower) ||
      friend.email?.toLowerCase().includes(searchLower)
    );
    this.cdr.detectChanges();
  }

  getLastMessage(friend: Friend): Message | null {
    return this.friendMessages.get(friend.id) || null;
  }

  getLastMessagePreview(friend: Friend): string {
    const message = this.getLastMessage(friend);
    
    if (!message || !message.hasMessage) {
      return 'Henüz mesaj yok';
    }

    const isOwn = message.senderId === this.currentUserId;
    const prefix = isOwn ? 'Sen: ' : '';
    const content = message.content.length > 30 
      ? message.content.substring(0, 30) + '...' 
      : message.content;
    
    return prefix + content;
  }

  getLastMessageTime(friend: Friend): string {
    const message = this.getLastMessage(friend);
    
    if (!message || !message.hasMessage) {
      return '';
    }

    const date = new Date(message.sentAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}dk`;
    if (diffHours < 24) return `${diffHours}sa`;
    if (diffDays < 7) return `${diffDays}g`;
    
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  }

  isLastMessageUnread(friend: Friend): boolean {
    const message = this.getLastMessage(friend);
    return message ? !message.isRead && message.receiverId === this.currentUserId : false;
  }
}
