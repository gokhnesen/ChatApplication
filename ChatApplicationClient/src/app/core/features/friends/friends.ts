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

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfilePhotoPipe],
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
  MessageType = MessageType; // ✅ HTML'de kullanmak için
  
  pendingRequests: PendingFriendRequest[] = [];
  requestsLoading: boolean = false;
  requestsError: string | null = null;
  private processingRequests = new Set<string>();

  private messageService = inject(MessageService);
  private userService = inject(UserService);
  private signalRService = inject(ChatSignalrService);
  private messageBroadcast = inject(MessageService);
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
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.currentUser = user;
        this.currentUserId = user.id;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.loadPendingRequestCount();

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

    // Her 30 saniyede bir istek sayısını güncelle
    this.pendingRequestInterval = setInterval(() => this.loadPendingRequestCount(), 30000);
  }

  loadPendingRequestCount(): void {
    this.friendService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequestCount = requests?.length || 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Bekleyen istek sayısı alınamadı:', err);
      }
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
        this.requestsError = err?.error?.message || 'İstekler yüklenirken hata oluştu';
        this.requestsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isProcessingRequest(friendshipId: string): boolean {
    return this.processingRequests.has(friendshipId);
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
        
        // Eğer kabul edildiyse arkadaş listesini yenile
        if (accept) {
          this.loadFriendsWithMessages();
        }
        
        // Eğer tüm istekler işlendiyse modalı kapat
        if (this.pendingRequests.length === 0) {
          this.closeFriendRequests();
        }
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.processingRequests.delete(fid);
        alert(err?.error?.message || 'İstek işlenirken hata oluştu');
        this.cdr.detectChanges();
      }
    });
  }

  trackByRequest(_: number, r: PendingFriendRequest): string {
    return r.friendshipId;
  }

  onAvatarError(evt: Event): void {
    const img = evt.target as HTMLImageElement;
    img.src = 'assets/default-avatar.png';
  }

  private initAfterUser(): void {
    if (this.initialized || !this.currentUserId) return;
    this.initialized = true;
    this.loadFriendsWithMessages();
    this.initializeListeners();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Interval'ı temizle
    if (this.pendingRequestInterval) {
      clearInterval(this.pendingRequestInterval);
    }
  }

  selectFriend(friend: Friend): void {
    this.selectedFriend = friend;
    friend.unreadMessageCount = 0;
    // Son seçilen arkadaşı localStorage'a kaydet
    localStorage.setItem('lastSelectedFriendId', friend.id);
    this.cdr.detectChanges();
    this.router.navigate(['/chat', friend.id]);
  }

  private loadFriendsWithMessages(): void {
    this.subscriptions.push(
      this.friendService.getMyFriends().subscribe({
        next: (data: Friend[]) => {
          this.friends = data;
          this.filteredFriends = [...this.friends];
          
          // Pending friend ID varsa onu seç
          if (this.pendingFriendId) {
            const f = this.friends.find(x => x.id === this.pendingFriendId);
            if (f) {
              this.selectedFriend = f;
            }
          } 
          // Route'da ID yoksa ve chat sayfasındaysak son seçileni yükle
          else if (this.router.url === '/chat' || this.router.url === '/') {
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
        // Route'a yönlendir
        this.router.navigate(['/chat', lastFriend.id]);
      } else {
        // Son arkadaş listede yoksa ilk arkadaşı seç
        this.selectFirstFriend();
      }
    } else if (this.friends.length > 0) {
      // Hiç seçim yoksa ilk arkadaşı seç
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
            update.isOwn,
            update.type || MessageType.Text,
            update.attachmentUrl,
            update.attachmentName
          );
        });
      })
    );

    // ✅ GÜNCELLENECEK - 6 parametre al
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

    // ✅ GÜNCELLENECEK - 6 parametre al
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
  }

  private handleNewMessage(
    friendId: string,
    content: string,
    senderId: string,
    receiverId: string,
    sentAt: Date,
    isOwn: boolean,
    type: MessageType = MessageType.Text, // ✅ TİP PARAMETRESİ EKLE
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
      type: type, // ✅ TİPİ EKLE
      attachmentUrl: attachmentUrl,
      attachmentName: attachmentName
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

  // ✅ YENİ FONKSİYON: Mesaj önizlemesini tip bazlı göster
  getLastMessagePreview(friend: Friend): string {
    const message = this.getLastMessage(friend);
    
    if (!message || !message.hasMessage) {
      return 'Henüz mesaj yok';
    }

    const isOwn = message.senderId === this.currentUserId;
    const prefix = isOwn ? 'Sen: ' : '';

    // Mesaj tipine göre önizleme
    switch (message.type) {
      case MessageType.Image:
        return prefix + '📷 Fotoğraf';
      
      case MessageType.Video:
        return prefix + '📹 Video';
      
      case MessageType.File:
        return prefix + '📎 ' + (message.attachmentName || 'Dosya');
      
      case MessageType.Text:
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
}
