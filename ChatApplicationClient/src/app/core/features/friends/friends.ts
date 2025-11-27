import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { FriendService } from '../../services/friend-service';
import { MessageService } from '../../services/message-service';
import { UserService } from '../../services/user-service';
import { ChatSignalrService } from '../../services/chat-signalr-service';
import { Friend, PendingFriendRequest } from '../../shared/models/friend';
import { Message, MessageType } from '../../shared/models/message';
import { Subscription, forkJoin } from 'rxjs';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';
import { FriendRequest } from './friend-request/friend-request';
import { NotificationService } from '../../services/notification-service';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfilePhotoPipe, FriendRequest],
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
  currentUser: any = null;
  pendingRequestCount: number = 0;
  showFriendRequests: boolean = false;
  MessageType = MessageType;
  pendingRequests: PendingFriendRequest[] = [];
  requestsLoading: boolean = false;
  requestsError: string | null = null;
  processingRequests = new Set<string>();
  private notificationSound: HTMLAudioElement | null = null;

  private messageService = inject(MessageService);
  private userService = inject(UserService);
  private signalRService = inject(ChatSignalrService);
  private messageBroadcast = inject(MessageService);
  private notificationService = inject(NotificationService);

  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private subscriptions: Subscription[] = [];
  private initialized = false;
  private pendingFriendId: string | null = null;
  private pendingRequestInterval: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {
    this.initNotificationSound();

    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.currentUser = user;
        this.currentUserId = user.id;
        this.cdr.detectChanges();
      }
    });
  }

  private initNotificationSound(): void {
    try {
      const soundPath = 'assets/sounds/notify.mp3';
      this.notificationSound = new Audio(soundPath);
      this.notificationSound.preload = 'auto';
      this.notificationSound.volume = 0.5;
    } catch {
    }
  }

  ngOnInit(): void {
    this.loadPendingRequestCount();
    this.friendService.friendsListChanges().subscribe(friends => {
      this.friends = friends;
    });

    this.subscriptions.push(
      this.route.paramMap.subscribe((params: ParamMap) => {
        this.pendingFriendId = params.get('id');
        if (this.pendingFriendId && this.friends.length) {
          const f = this.friends.find(x => x.id === this.pendingFriendId);
          if (f) {
            this.selectedFriend = f;
            this.cdr.detectChanges();
          }
        }
      })
    );

    const user = this.userService.currentUser();
    if (user) {
      this.currentUser = user;
      this.currentUserId = user.id;
      this.initAfterUser();
    } else {
      this.subscriptions.push(
        this.userService.getUserInfo().subscribe({
          next: (u) => {
            if (u) {
              this.currentUser = u;
              this.currentUserId = u.id;
              this.initAfterUser();
            }
          },
          error: () => {}
        })
      );
    }

    this.pendingRequestInterval = setInterval(() => this.loadPendingRequestCount(), 30000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.pendingRequestInterval) {
      clearInterval(this.pendingRequestInterval);
    }
  }

  loadPendingRequestCount(): void {
    this.friendService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequestCount = requests?.length || 0;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  openFriendRequests(): void {
    this.showFriendRequests = true;
    this.loadPendingRequests();
  }

  closeFriendRequests(): void {
    this.showFriendRequests = false;
    this.pendingRequests = [];
    this.requestsError = null;
  }

  loadPendingRequests(): void {
    this.requestsLoading = true;
    this.requestsError = null;

    this.friendService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequests = requests || [];
        this.pendingRequestCount = this.pendingRequests.length;
        this.requestsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.requestsError = 'Arkadaşlık istekleri yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.';
        this.requestsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  respondToRequest(request: PendingFriendRequest, accept: boolean): void {
    const fid = request.friendshipId;
    if (this.processingRequests.has(fid)) return;

    this.processingRequests.add(fid);

    this.friendService.respondToFriendRequestById(fid, accept).subscribe({
      next: () => {
        this.processingRequests.delete(fid);
        this.pendingRequests = this.pendingRequests.filter(r => r.friendshipId !== fid);
        this.pendingRequestCount = this.pendingRequests.length;
        this.loadPendingRequestCount();

        if (accept) {
          this.loadFriendsWithMessages();
          this.notificationService.show('Arkadaşlık isteği kabul edildi!', 'success');
        } else {
          this.notificationService.show('Arkadaşlık isteği reddedildi.', 'info');
        }

        if (this.pendingRequests.length === 0) {
          this.closeFriendRequests();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.processingRequests.delete(fid);
        this.notificationService.show('İsteğe yanıt verilirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  selectFriend(friend: Friend): void {
    this.selectedFriend = friend;
    friend.unreadMessageCount = 0;
    localStorage.setItem('lastSelectedFriendId', friend.id);
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

    switch (message.type) {
      case MessageType.Image:
        return prefix + '📷 Fotoğraf';
      case MessageType.Video:
        return prefix + '📹 Video';
      case MessageType.File:
        return prefix + '📎 ' + (message.attachmentName || 'Dosya');
      default:
        const content = message.content.length > 30
          ? message.content.substring(0, 30) + '...'
          : message.content;
        return prefix + content;
    }
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

  onFriendRequestRespond(event: {request: PendingFriendRequest, accept: boolean}): void {
    this.respondToRequest(event.request, event.accept);
  }

  onFriendRequestClose(): void {
    this.closeFriendRequests();
  }

  onFriendRequestRetry(): void {
    this.loadPendingRequests();
  }

  private initAfterUser(): void {
    if (this.initialized || !this.currentUserId) return;
    this.initialized = true;
    this.loadFriendsWithMessages();
    this.initializeListeners();
  }

  private loadFriendsWithMessages(): void {
    this.subscriptions.push(
      this.friendService.getMyFriends().subscribe({
        next: (data: Friend[]) => {
          this.friends = data;
          this.filteredFriends = [...this.friends];

          if (this.pendingFriendId) {
            const f = this.friends.find(x => x.id === this.pendingFriendId);
            if (f) {
              this.selectedFriend = f;
            }
          } else if (this.router.url === '/chat' || this.router.url === '/') {
            this.loadLastSelectedFriend();
          }

          this.loadLatestMessages();
        },
        error: () => {}
      })
    );
  }

  private loadLastSelectedFriend(): void {
    const lastFriendId = localStorage.getItem('lastSelectedFriendId');
    if (lastFriendId && this.friends.length > 0) {
      const lastFriend = this.friends.find(f => f.id === lastFriendId);
      if (lastFriend) {
        this.selectedFriend = lastFriend;
        this.router.navigate(['/chat', lastFriend.id]);
      } else {
        this.selectFirstFriend();
      }
    } else if (this.friends.length > 0) {
      this.selectFirstFriend();
    }
  }

  private selectFirstFriend(): void {
    if (this.friends.length > 0) {
      const firstFriend = this.friends[0];
      this.selectedFriend = firstFriend;
      this.router.navigate(['/chat', firstFriend.id]);
    }
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
    this.subscriptions.push(
      this.messageBroadcast.messageUpdate$.subscribe((update) => {
        
        this.ngZone.run(() => {
          const friendId = update?.friendId || (update?.senderId === this.currentUserId ? update.receiverId : update.senderId);
        
          if (!friendId) {
            return;
          }
          const target = this.friends.find(f => f.id === friendId);
          if (!target) {
            return;
          }
        
          this.handleNewMessage(
            friendId,
            update.content,
            update.senderId,
            update.receiverId,
            update.sentAt ? new Date(update.sentAt) : new Date(),
            !!update.isOwn,
            update.type || MessageType.Text,
            update.attachmentUrl,
            update.attachmentName
          );
        });
      })
    );

    this.signalRService.onReceiveMessage((
      senderId: string,
      content: string,
      type?: MessageType,
      attachmentUrl?: string | null,
      attachmentName?: string | null,
      attachmentSize?: number | null
    ) => {
      this.ngZone.run(() => {
        this.handleNewMessage(
          senderId,
          content,
          senderId,
          this.currentUserId,
          new Date(),
          false,
          type || MessageType.Text,
          attachmentUrl,
          attachmentName
        );
      });
    });

    this.signalRService.onMessageSent((
      receiverId: string,
      content: string,
      type?: MessageType,
      attachmentUrl?: string | null,
      attachmentName?: string | null,
      attachmentSize?: number | null
    ) => {
      this.ngZone.run(() => {
        this.handleNewMessage(
          receiverId,
          content,
          this.currentUserId,
          receiverId,
          new Date(),
          true,
          type || MessageType.Text,
          attachmentUrl,
          attachmentName
        );
      });
    });

    this.signalRService.onFriendRequestReceived((request) => {
      this.ngZone.run(() => {
        const normalizedRequest: PendingFriendRequest = {
          ...request,
          senderProfilePhotoUrl: request.senderProfilePhotoUrl ?? null
        };
        this.pendingRequests = [normalizedRequest, ...this.pendingRequests];
        this.pendingRequestCount = this.pendingRequests.length;
        this.updateView();
        this.playNotificationSound();
      });
    });

    this.signalRService.onFriendRequestAccepted((data) => {
      this.pendingRequests = this.pendingRequests.filter(r => r.friendshipId !== data.friendshipId);
      this.pendingRequestCount = this.pendingRequests.length;
      this.loadFriendsWithMessages();
      this.updateView();
    });
  }

  private handleNewMessage(
    friendId: string,
    content: string,
    senderId: string,
    receiverId: string,
    sentAt: Date,
    isOwn: boolean,
    type: MessageType = MessageType.Text,
    attachmentUrl?: string | null,
    attachmentName?: string | null
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
      hasMessage: true,
      type: type,
      attachmentUrl: attachmentUrl,
      attachmentName: attachmentName
    };

    this.friendMessages.set(friend.id, newMessage);
    if (receiverId === this.currentUserId && senderId !== this.currentUserId) {
      friend.unreadMessageCount = (friend.unreadMessageCount || 0) + 1;
      this.playNotificationSound();
    }

    this.sortFriendsByLastMessage();
    this.updateView();
  }

  private playNotificationSound(): void {
    if (!this.notificationSound) {
      return;
    }

    const playPromise = this.notificationSound.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setTimeout(() => {
            if (this.notificationSound) {
              this.notificationSound.currentTime = 0;
            }
          }, 100);
        })
        .catch(() => {
        });
    }
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
}
