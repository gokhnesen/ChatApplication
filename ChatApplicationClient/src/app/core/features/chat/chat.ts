import { Component, Input, OnChanges, OnInit, OnDestroy, AfterViewChecked, SimpleChanges, ViewChild, ElementRef, HostListener, inject, effect } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../../services/message-service';
import { Message, MessageType } from '../../shared/models/message';
import { FriendService } from '../../services/friend-service';
import { UserService } from '../../services/user-service';
import { ChatSignalrService } from '../../services/chat-signalr-service';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { AttachFilePipe } from "../../pipes/attach-file.pipe";
import { NotificationService } from '../../services/notification-service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    ProfilePhotoPipe,
    PickerComponent,
    AttachFilePipe
  ],
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
  
  selectedFile: File | null = null;
  selectedFilePreview: string | null = null;
  isUploading: boolean = false;
  imagePreviewUrl: string | null = null;
  MessageType = MessageType;
  
  private userService = inject(UserService);
  private signalRService = inject(ChatSignalrService);
  private messageBroadcast = inject(MessageService);
  private notificationService = inject(NotificationService);
  private subscriptions: Subscription[] = [];
  private presenceSub: Subscription | null = null;
  private presenceIntervalId: any = null;
  
  unreadCount: number = 0;
  private hasMarkedAsRead = false;
  showEmojiPicker = false;

  showCamera: boolean = false;
  cameraStream: MediaStream | null = null;
  capturedImage: string | null = null;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  
  showVideoRecorder: boolean = false;
  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  recordedVideoUrl: string | null = null;
  recordingDuration: number = 0;
  recordingTimer: any = null;
  maxRecordingDuration: number = 60;
  videoStream: MediaStream | null = null;
  @ViewChild('videoPreviewElement') videoPreviewElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('recordedVideoElement') recordedVideoElement!: ElementRef<HTMLVideoElement>;
  currentUser: any;
  
  showUserMenu: boolean = false;
  private friendsList: any[] = [];
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const emojiPicker = document.querySelector('.emoji-picker-wrapper');
    const emojiButton = document.querySelector('.emoji-btn');
    const userMenu = document.querySelector('.user-menu-dropdown');
    const menuButton = document.querySelector('.user-menu-btn');
    
    if (this.showEmojiPicker && 
        emojiPicker && 
        !emojiPicker.contains(target) && 
        emojiButton && 
        !emojiButton.contains(target)) {
      this.showEmojiPicker = false;
    }

    if (this.showUserMenu && 
        userMenu && 
        !userMenu.contains(target) && 
        menuButton && 
        !menuButton.contains(target)) {
      this.showUserMenu = false;
    }
  }

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private friendService: FriendService
  ) {}

  ngOnInit(): void {
    const signalUser = this.userService.currentUser();
    this.friendService.friendsListChanges().subscribe(friends => {
      this.friendsList = friends;
    });

    this.subscriptions.push(
      this.messageBroadcast.messageUpdate$.subscribe((update: any) => {
        if (!update) return;

        const curId = this.currentUser?.id;
        if (curId) {
          const targetUserId = update.targetUserId || update.receiverId || null;
          const senderId = update.senderId || null;
          if (targetUserId && targetUserId !== curId && senderId !== curId) {
            return;
          }
        } else {
          return;
        }
        // --- /yeni filtre ---

        // Eğer update üzerinde conversationId varsa kullan; yoksa friendId fallback
        const activeConvId = (curId && this.receiverUser?.id) ? [curId, this.receiverUser.id].sort().join('|') : '';

        const incomingConvId = update.conversationId || '';

        if (incomingConvId) {
          if (!activeConvId || incomingConvId !== activeConvId) {
            return; // konuşma uyuşmuyorsa ignore et
          }
        } else {
          // conversationId yoksa eski friendId mantığı ile kontrol et
          let friendId = update.friendId || '';
          if (!friendId && update.senderId && update.receiverId && curId) {
            friendId = (update.senderId === curId ? update.receiverId : update.senderId);
          }
          if (!friendId || friendId !== this.receiverUser.id) return;
        }

        // Minimal mesaj oluşturma ve ekleme (var olan mesaj yapısına uyarla)
        const newMsg: Message = {
          id: update.messageId || update.id || Date.now().toString(),
          senderId: update.senderId || '',
          receiverId: update.receiverId || this.currentUser.id,
          content: update.content || '',
          sentAt: update.sentAt ? new Date(update.sentAt) : new Date(),
          isRead: !!update.isRead,
          type: update.type || MessageType.Text,
          attachmentUrl: update.attachmentUrl,
          attachmentName: update.attachmentName,
          attachmentSize: update.attachmentSize
        };

        this.messages.push(newMsg);
        this.shouldScrollToBottom = true;
      })
    );

    if (signalUser) {
      this.setCurrentUserFromSignal(signalUser);
      this.initializeChat();
      this.initializeSignalR();
      this.loadFriendsList();
    } else {
      this.userService.getUserInfo().subscribe({
        next: (userInfo) => {
          this.setCurrentUserFromSignal(userInfo);
          this.initializeChat();
          this.initializeSignalR();
          this.loadFriendsList();
        },
        error: () => {}
      });
    }
    
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.setCurrentUserFromSignal(user);
      }
    });

    this.presenceSub = this.signalRService.presence$.subscribe(p => {
      if (!p || !p.userId) return;
      if (p.userId.startsWith('____')) return;
      this.presenceMap[p.userId] = !!p.isOnline;
      for (const m of this.messages) {
        if (m.senderId === p.userId) {
          // @ts-ignore
          m.isOnline = !!p.isOnline;
        }
      }
    });
  }

  private presenceMap: Record<string, boolean> = {};

  isUserOnline(userId: string): boolean {
    if (!userId) return false;

    if (this.presenceMap.hasOwnProperty(userId)) {
      return !!this.presenceMap[userId];
    }

    const friend = this.friendsList?.find(f => f.id === userId);
    if (friend) {
      return !!friend.isOnline;
    }

    const m = this.messages.find(x => x.senderId === userId);
    // @ts-ignore
    if (m && typeof m.isOnline !== 'undefined') return !!m.isOnline;

    return false;
  }

  private loadFriendsList(): void {
    this.friendService.getMyFriends().subscribe({
      next: (friends) => {
        this.friendsList = friends;
        this.startPresenceTracking();
      },
      error: () => {}
    });
  }

  private startPresenceTracking(): void {
    this.stopPresenceTracking();

    this.presenceSub = this.signalRService.presence$.subscribe(payload => {
      if (!payload || !payload.userId) return;

      if (payload.userId === '____RECONNECTED____') {
        this.checkFriendsPresence();
        return;
      }
      if (payload.userId === '____CLOSED____') return;

      const isOnline = !!payload.isOnline;

      this.presenceMap[payload.userId] = isOnline;

      if (this.friendsList) {
        const f = this.friendsList.find(x => x.id === payload.userId);
        if (f) {
          f.isOnline = isOnline;
          f.lastSeen = isOnline ? null : (payload.lastSeen ? new Date(payload.lastSeen) : f.lastSeen);
        }
      }

      this.messages.forEach(m => {
          if (m.senderId === payload.userId) {
              // @ts-ignore
              m.isOnline = isOnline; 
          }
      });
    });

    this.checkFriendsPresence();
    this.presenceIntervalId = setInterval(() => this.checkFriendsPresence(), 30_000);
  }

  private stopPresenceTracking(): void {
    if (this.presenceSub) {
      this.presenceSub.unsubscribe();
      this.presenceSub = null;
    }
    if (this.presenceIntervalId) {
      clearInterval(this.presenceIntervalId);
      this.presenceIntervalId = null;
    }
  }

  private checkFriendsPresence(): void {
    const ids = (this.friendsList || []).map(f => f.id).filter(Boolean);
    if (ids.length === 0) return;
    this.signalRService.refreshPresence(ids).catch(() => {});
  }

  private navigateToNextFriend(): void {
    if (this.friendsList.length === 0) {
      this.router.navigate(['/friends']);
      return;
    }

    const currentIndex = this.friendsList.findIndex(f => f.id === this.receiverUser.id);
    if (currentIndex !== -1) {
      this.friendsList.splice(currentIndex, 1);
    }

    if (this.friendsList.length > 0) {
      const nextFriend = this.friendsList[0];
      this.router.navigate(['/chat', nextFriend.id]);
    } else {
      this.router.navigate(['/friends']);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.presenceSub) { this.presenceSub.unsubscribe(); this.presenceSub = null; }
    this.stopCamera();
    this.stopVideoRecording();
    this.closeVideoRecorder();
  }

  private shouldScrollToBottom: boolean = true;

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
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
      this.messageService.markAsRead(this.currentUser.id, this.receiverUser.id).subscribe({
        next: (response) => {
          unreadMessages.forEach(m => {
            m.isRead = true;
            m.readAt = new Date();
          });
          this.unreadCount = response.unreadCount || 0;
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

  // helper to determine which friendId should be used when broadcasting a message
  private getBroadcastFriendId(msg: { senderId: string; receiverId: string }): string {
    if (!this.currentUser || !this.currentUser.id) return msg.senderId || msg.receiverId || '';
    return msg.senderId === this.currentUser.id ? msg.receiverId : msg.senderId;
  }

 // chat.ts dosyası

private initializeSignalR(): void {
  if (!this.currentUser.id) {
    return;
  }

  this.signalRService.startConnection(this.currentUser.id);
  
  this.signalRService.onReceiveMessage((senderId: string, content: string, type?: MessageType, attachmentUrl?: string | null, attachmentName?: string | null, attachmentSize?: number | null) => {
      
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: senderId,
        receiverId: this.currentUser.id,
        content: content,
        sentAt: new Date(),
        isRead: false,
        type: type || MessageType.Text,
        attachmentUrl: attachmentUrl,
        attachmentName: attachmentName,
        attachmentSize: attachmentSize
      };

      
      const convId = [senderId || '', this.currentUser.id || ''].sort().join('|');
      const friendId = senderId || this.currentUser.id; // Mesajı gönderen arkadaşımızdır

      this.messageBroadcast.notifyNewMessage({
        friendId,
        content: content,
        senderId: senderId,
        receiverId: this.currentUser.id,
        sentAt: newMessage.sentAt,
        isOwn: false,
        type: newMessage.type,
        attachmentUrl: newMessage.attachmentUrl,
        attachmentName: newMessage.attachmentName,
        messageId: newMessage.id,
        conversationId: convId, // Filtreleme için kritik
        targetUserId: this.currentUser.id
      });
  });

  // Mesaj  (Backend'den tetiklenirse)
  this.signalRService.onMessageSent((
    receiverId: string, 
    content: string,
    type?: MessageType,
    attachmentUrl?: string | null,
    attachmentName?: string | null,
    attachmentSize?: number | null
  ) => {
  
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
      this.loadMessages();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['receiverUser'] && changes['receiverUser'].currentValue && changes['receiverUser'].currentValue.id) {
      if (this.currentUser.id) {
        this.loadMessages();
      }
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch {
    }
  }
  
  loadMessages(): void {
    if (this.receiverUser && this.receiverUser.id && this.currentUser.id) {
      this.hasMarkedAsRead = false;
      this.subscriptions.push(
        this.messageService.getMessages(this.currentUser.id, this.receiverUser.id)
          .subscribe({
            next: (messages) => {
              this.messages = messages;
              this.calculateUnreadCount();
              this.shouldScrollToBottom = true;
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

  async openVideoRecorder() {
    try {
      this.showVideoRecorder = true;
      
      setTimeout(async () => {
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });

        if (this.videoPreviewElement && this.videoPreviewElement.nativeElement) {
          this.videoPreviewElement.nativeElement.srcObject = this.videoStream;
          this.videoPreviewElement.nativeElement.play();
        }
      }, 100);
    } catch {
      alert('Kamera veya mikrofona erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.');
      this.showVideoRecorder = false;
    }
  }

  startVideoRecording() {
    if (!this.videoStream) return;

    this.recordedChunks = [];
    this.recordingDuration = 0;

    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    };

    try {
      this.mediaRecorder = new MediaRecorder(this.videoStream, options);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.videoStream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      this.recordedVideoUrl = URL.createObjectURL(blob);
      const file = new File([blob], `video-${Date.now()}.webm`, {
        type: 'video/webm'
      });
      this.selectedFile = file;
      setTimeout(() => {
        if (this.recordedVideoElement && this.recordedVideoElement.nativeElement) {
          this.recordedVideoElement.nativeElement.src = this.recordedVideoUrl!;
        }
      }, 100);
    };

    this.mediaRecorder.start();
    this.isRecording = true;

    this.recordingTimer = setInterval(() => {
      this.recordingDuration++;
      if (this.recordingDuration >= this.maxRecordingDuration) {
        this.stopVideoRecording();
      }
    }, 1000);
  }

  stopVideoRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  formatRecordingTime(): string {
    const minutes = Math.floor(this.recordingDuration / 60);
    const seconds = this.recordingDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getRemainingTime(): string {
    const remaining = this.maxRecordingDuration - this.recordingDuration;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  retakeVideo() {
    if (this.recordedVideoUrl) {
      URL.revokeObjectURL(this.recordedVideoUrl);
    }
    this.recordedVideoUrl = null;
    this.selectedFile = null;
    this.recordedChunks = [];
    this.recordingDuration = 0;
  }

  closeVideoRecorder() {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }
    
    if (this.recordedVideoUrl) {
      URL.revokeObjectURL(this.recordedVideoUrl);
    }
    
    this.stopVideoRecording();
    this.showVideoRecorder = false;
    this.recordedVideoUrl = null;
    this.recordingDuration = 0;
  }

  useRecordedVideo() {
    if (this.selectedFile) {
      this.selectedFilePreview = this.recordedVideoUrl;
      this.closeVideoRecorder();
    }
  }

  onVideoFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Lütfen geçerli bir video dosyası seçin!');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Video boyutu 50MB\'dan büyük olamaz!');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedFilePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  getVideoDuration(videoElement: HTMLVideoElement): number {
    return Math.round(videoElement.duration);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      this.onVideoFileSelected(event);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan büyük olamaz!');
      return;
    }

    this.selectedFile = file;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedFilePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFilePreview = null;
    }
  }

  cancelFile() {
    this.selectedFile = null;
    this.selectedFilePreview = null;
  }

 async sendMessage() {
  if (this.selectedFile) {
    await this.sendMessageWithFile();
    return;
  }
  await this.sendTextMessage();
}

// chat.ts içindeki sendTextMessage fonksiyonu

async sendTextMessage() {
  if (!this.messageText?.trim() || !this.receiverUser.id || !this.currentUser.id) return;

  if (this.receiverUser.id === AI_USER.id) {
    const userMsg = this.messageText.trim();
    
    this.messages.push({
      id: Date.now().toString(),
      senderId: this.currentUser.id,
      receiverId: AI_USER.id,
      content: userMsg,
      sentAt: new Date(),
      isRead: true,
      type: MessageType.Text
    });

    this.messageText = '';
    this.shouldScrollToBottom = true;

    try {
      const resp = await this.messageService.ask(this.currentUser.id, userMsg).toPromise();
      const aiText = resp?.response || resp?.text || 'Yanıt alınamadı.';

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: AI_USER.id,
        receiverId: this.currentUser.id,
        content: aiText,
        sentAt: new Date(),
        isRead: true,
        type: MessageType.Text
      };

      const convId = [this.currentUser.id, AI_USER.id].sort().join('|');
      
      this.messageBroadcast.notifyNewMessage({
        friendId: AI_USER.id,
        content: aiMessage.content,
        senderId: aiMessage.senderId,
        receiverId: aiMessage.receiverId,
        sentAt: aiMessage.sentAt,
        isOwn: false,
        type: aiMessage.type,
        messageId: aiMessage.id,
        conversationId: convId,
        targetUserId: this.currentUser.id
      });

    } catch (err: any) {
      this.notificationService.show('Yapay zekadan yanıt alınırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
    }
    return;
  }

  const command: Message = {
    senderId: this.currentUser.id,
    receiverId: this.receiverUser.id,
    content: this.messageText,
    type: MessageType.Text,
    id: '',
    sentAt: new Date(),
    isRead: false
  };

  try {
    const result = await this.messageService.sendMessage(command).toPromise();
    
    if (result) {
      const newMessage: Message = {
        id: result.messageId || result.id || Date.now().toString(),
        senderId: this.currentUser.id,
        receiverId: this.receiverUser.id,
        content: command.content,
        sentAt: result.sentAt ? new Date(result.sentAt) : new Date(),
        isRead: false,
        type: MessageType.Text
      };
      
      this.messageText = '';
      

      
      const friendId = this.getBroadcastFriendId(newMessage) || this.receiverUser.id;
      const convId = [this.currentUser.id, this.receiverUser.id].sort().join('|');

      this.messageBroadcast.notifyNewMessage({
        friendId,
        messageId: newMessage.id,
        content: command.content,
        senderId: this.currentUser.id,
        receiverId: this.receiverUser.id,
        sentAt: new Date(),
        isOwn: true,
        type: MessageType.Text,
        attachmentUrl: newMessage.attachmentUrl,
        attachmentName: newMessage.attachmentName,
        conversationId: convId,
        targetUserId: this.currentUser.id
      });
    }
  } catch (error: any) {
    this.notificationService.show('Mesajınız gönderilirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
  }
}
  async sendMessageWithFile() {
    if (!this.selectedFile || !this.receiverUser.id || !this.currentUser.id) return;

    this.isUploading = true;
    try {
      const uploadResult = await this.messageService.uploadFile(this.selectedFile).toPromise();
      
      if (!uploadResult || !uploadResult.isSuccess) {
        throw new Error('Dosya yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.');
      }

      const messageCommand = {
        senderId: this.currentUser.id,
        receiverId: this.receiverUser.id,
        content: this.messageText || uploadResult.attachmentName,
        type: uploadResult.type,
        attachmentUrl: uploadResult.attachmentUrl,
        attachmentName: uploadResult.attachmentName,
        attachmentSize: uploadResult.attachmentSize
      };

      const sendResult = await this.messageService.sendMessage(messageCommand).toPromise();
      
      if (sendResult) {
        const newMessage: Message = {
          id: sendResult.messageId || sendResult.id || Date.now().toString(),
          senderId: this.currentUser.id,
          receiverId: this.receiverUser.id,
          content: messageCommand.content,
          sentAt: sendResult.sentAt ? new Date(sendResult.sentAt) : new Date(),
          isRead: false,
          type: messageCommand.type,
          attachmentUrl: messageCommand.attachmentUrl,
          attachmentName: messageCommand.attachmentName,
          attachmentSize: messageCommand.attachmentSize
        };
        
        this.messages.push(newMessage);
        this.messageText = '';
        this.selectedFile = null;
        this.selectedFilePreview = null;
        this.shouldScrollToBottom = true;
        
        const friendId = this.getBroadcastFriendId(newMessage) || this.receiverUser.id;
        const convId = [this.currentUser.id, this.receiverUser.id].sort().join('|');
        this.messageBroadcast.notifyNewMessage({
          friendId,
          messageId: newMessage.id,
          content: messageCommand.content,
          senderId: this.currentUser.id,
          receiverId: this.receiverUser.id,
          sentAt: new Date(),
          isOwn: true,
          type: messageCommand.type,
          attachmentUrl: messageCommand.attachmentUrl,
          attachmentName: messageCommand.attachmentName,
          attachmentSize: messageCommand.attachmentSize,
          conversationId: convId,
          targetUserId: this.currentUser.id
        });
      }
    } catch (error: any) {
      this.notificationService.show('Dosyanız gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      this.isUploading = false;
    }
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }


  closeImagePreview() {
    this.imagePreviewUrl = null;
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(event: any) {
    const emoji = event.emoji.native;
    this.messageText = (this.messageText || '') + emoji;
  }

  isOwnMessage(message: Message): boolean {
    return message.senderId === this.currentUser.id;
  }

  getReceiverFullName(): string {
    return this.receiverUser.lastName
      ? `${this.receiverUser.name} ${this.receiverUser.lastName}`
      : this.receiverUser.name;
  }

  openImagePreview(url: string | null | undefined): void {
    if (!url) return;
  
    let finalUrl = url;    
  
    if (url.startsWith('/uploads') || url.startsWith('uploads')) {
      const base = (environment.apiUrl || '').replace(/\/api$/, '').replace(/\/$/, '');
      finalUrl = url.startsWith('/') ? base + url : base + '/' + url;
    } else if (!/^https?:\/\//i.test(url)) {
      const base = (environment.apiUrl || '').replace(/\/api$/, '').replace(/\/$/, '');
      finalUrl = base + '/' + url.replace(/^\//, '');
    }
  
    this.imagePreviewUrl = finalUrl;
  }

  async openCamera() {
    try {
      this.showCamera = true;
      
      setTimeout(async () => {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });

        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.cameraStream;
          this.videoElement.nativeElement.play();
        }
      }, 100);
    } catch {
      this.notificationService.show('Kameraya erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.', 'error');
      this.showCamera = false;
    }
  }

  capturePhoto() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });

        this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        
        this.selectedFile = file;
        this.selectedFilePreview = this.capturedImage;

        this.stopCamera();
        this.notificationService.show('Fotoğraf çekildi!', 'success');
      }
    }, 'image/jpeg', 0.9);
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.showCamera = false;
    this.capturedImage = null;
  }

  retakePhoto() {
    this.capturedImage = null;
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.openCamera();
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  async removeFriend() {
    this.notificationService.show(
      `${this.getReceiverFullName()} kişisini arkadaş listesinden silmek istediğinize emin misiniz?`,
      'confirm',
      {
        action: () => {
          this.friendService.removeFriend(this.receiverUser.id).subscribe({
            next: () => {
              this.showUserMenu = false;
              this.notificationService.show('Arkadaş başarıyla silindi.', 'success');
              window.location.reload();
            },
            error: () => {
              this.notificationService.show('Arkadaşınız silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            }
          });
        }
      }
    );
  }

  async blockUser() {
    this.notificationService.show(
      `${this.getReceiverFullName()} kişisini engellemek istediğinize emin misiniz? Bu kişi size mesaj gönderemeyecek.`,
      'confirm',
      {
        action: () => {
          this.friendService.blockUser(this.currentUser.id, this.receiverUser.id).subscribe({
            next: (response) => {
              if (response.isSuccess) {
                this.notificationService.show('Kullanıcı başarıyla engellendi.', 'success');
                this.showUserMenu = false;
                this.friendService.getMyFriends().subscribe({
                  next: (friends) => {
                    this.friendsList = friends;
                    this.navigateToNextFriend();
                  },
                  error: () => {
                    this.navigateToNextFriend();
                  }
                });
              } else {
                this.notificationService.show('Kullanıcı engellenemedi, lütfen tekrar deneyin.', 'error');
              }
            },
            error: () => {
              this.notificationService.show('Kullanıcı engellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            }
          });
        }
      }
    );
  }

}

const AI_USER = {
  id: 'ai-bot',
  name: 'Yapay Zeka',
  profilePhotoUrl: 'assets/ai-avatar.png'
};