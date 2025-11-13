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
  private subscriptions: Subscription[] = [];
  
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
  
  // ✅ YENİ: Dropdown menü kontrolü
  showUserMenu: boolean = false;
  
  // ✅ YENİ: Arkadaş listesi için
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
    
    if (signalUser) {
      this.setCurrentUserFromSignal(signalUser);
      this.initializeChat();
      this.initializeSignalR();
      this.loadFriendsList(); // ✅ Arkadaş listesini yükle
    } else {
      this.userService.getUserInfo().subscribe({
        next: (userInfo) => {
          this.setCurrentUserFromSignal(userInfo);
          this.initializeChat();
          this.initializeSignalR();
          this.loadFriendsList(); // ✅ Arkadaş listesini yükle
        },
        error: (error) => {
          console.error('Kullanıcı bilgisi alınamadı:', error);
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

  // ✅ YENİ: Arkadaş listesini yükle
  private loadFriendsList(): void {
    this.friendService.getMyFriends().subscribe({
      next: (friends) => {
        this.friendsList = friends;
      },
      error: (error) => {
        console.error('Arkadaş listesi yüklenemedi:', error);
      }
    });
  }

  // ✅ YENİ: Bir sonraki arkadaşa geç
  private navigateToNextFriend(): void {
    if (this.friendsList.length === 0) {
      // Arkadaş kalmadıysa, friends sayfasına yönlendir
      this.router.navigate(['/friends']);
      return;
    }

    // Mevcut arkadaşı listeden çıkar
    const currentIndex = this.friendsList.findIndex(f => f.id === this.receiverUser.id);
    if (currentIndex !== -1) {
      this.friendsList.splice(currentIndex, 1);
    }

    // Bir sonraki arkadaşa geç
    if (this.friendsList.length > 0) {
      const nextFriend = this.friendsList[0];
      this.router.navigate(['/chat', nextFriend.id]);
    } else {
      // Arkadaş kalmadıysa, friends sayfasına yönlendir
      this.router.navigate(['/friends']);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.stopCamera();
    this.stopVideoRecording();
    this.closeVideoRecorder();
  }

  private shouldScrollToBottom: boolean = true; // ✅ YENİ: Scroll kontrolü için flag

  ngAfterViewChecked() {
    // ✅ GÜNCELLENECEK: Sadece yeni mesaj geldiğinde scroll yap
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false; // İlk scroll'dan sonra durdur
    }
    
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
    
    this.signalRService.onReceiveMessage((
      senderId: string, 
      content: string,
      type?: MessageType,
      attachmentUrl?: string | null,
      attachmentName?: string | null,
      attachmentSize?: number | null
    ) => {
      if (senderId === this.receiverUser.id) {
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
        
        this.messages.push(newMessage);
        this.shouldScrollToBottom = true; // ✅ Yeni mesaj gelince scroll yap
      }
      
      // Friends component'e bildir
      this.messageBroadcast.notifyNewMessage({
        friendId: senderId,
        content: content,
        senderId: senderId,
        receiverId: this.currentUser.id,
        sentAt: new Date(),
        isOwn: false,
        type: type || MessageType.Text,
        attachmentUrl: attachmentUrl,
        attachmentName: attachmentName
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
      console.log('✅ Mesaj başarıyla iletildi:', { receiverId, content, type, attachmentUrl });
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
      if (this.messagesContainer?.nativeElement) {
        const element = this.messagesContainer.nativeElement;
        // Zorla scroll
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
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
              this.shouldScrollToBottom = true; // ✅ Mesajlar yüklenince bir kez scroll yap
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

  // ============ VIDEO KAYIT FONKSİYONLARI ============

  // Video kaydedici aç
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
          audio: true // Ses de kaydet
        });

        if (this.videoPreviewElement && this.videoPreviewElement.nativeElement) {
          this.videoPreviewElement.nativeElement.srcObject = this.videoStream;
          this.videoPreviewElement.nativeElement.play();
        }
      }, 100);
    } catch (error) {
      console.error('Kamera/Mikrofon erişim hatası:', error);
      alert('Kamera veya mikrofona erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.');
      this.showVideoRecorder = false;
    }
  }

  // Video kaydını başlat
  startVideoRecording() {
    if (!this.videoStream) return;

    this.recordedChunks = [];
    this.recordingDuration = 0;

    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps
    };

    try {
      this.mediaRecorder = new MediaRecorder(this.videoStream, options);
    } catch (e) {
      // Eğer vp9 desteklenmiyorsa, varsayılan codec'i kullan
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
      
      // Blob'u File'a çevir
      const file = new File([blob], `video-${Date.now()}.webm`, {
        type: 'video/webm'
      });
      
      this.selectedFile = file;
      
      // Önizleme videoyu göster
      setTimeout(() => {
        if (this.recordedVideoElement && this.recordedVideoElement.nativeElement) {
          this.recordedVideoElement.nativeElement.src = this.recordedVideoUrl!;
        }
      }, 100);
    };

    this.mediaRecorder.start();
    this.isRecording = true;

    // Süre sayacı
    this.recordingTimer = setInterval(() => {
      this.recordingDuration++;
      
      // Max süre doldu mu?
      if (this.recordingDuration >= this.maxRecordingDuration) {
        this.stopVideoRecording();
      }
    }, 1000);
  }

  // Video kaydını durdur
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

  // Video kaydı süresini formatla
  formatRecordingTime(): string {
    const minutes = Math.floor(this.recordingDuration / 60);
    const seconds = this.recordingDuration % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Kalan süreyi formatla
  getRemainingTime(): string {
    const remaining = this.maxRecordingDuration - this.recordingDuration;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Kaydı tekrar çek
  retakeVideo() {
    if (this.recordedVideoUrl) {
      URL.revokeObjectURL(this.recordedVideoUrl);
    }
    this.recordedVideoUrl = null;
    this.selectedFile = null;
    this.recordedChunks = [];
    this.recordingDuration = 0;
  }

  // Video kaydediciyi kapat
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

  // Kaydedilen videoyu kullan
  useRecordedVideo() {
    if (this.selectedFile) {
      this.selectedFilePreview = this.recordedVideoUrl;
      this.closeVideoRecorder();
    }
  }

  // Video dosya seçimi (galeri)
  onVideoFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Video mu kontrol et
    if (!file.type.startsWith('video/')) {
      alert('Lütfen geçerli bir video dosyası seçin!');
      return;
    }

    // 50MB kontrolü (videolar daha büyük olabilir)
    if (file.size > 50 * 1024 * 1024) {
      alert('Video boyutu 50MB\'dan büyük olamaz!');
      return;
    }

    this.selectedFile = file;

    // Video önizleme
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedFilePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Video süresini al
  getVideoDuration(videoElement: HTMLVideoElement): number {
    return Math.round(videoElement.duration);
  }

  // ============ DOSYA SEÇİMİ GÜNCELLEMESİ ============
  
  // Dosya seçimi
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Video ise
    if (file.type.startsWith('video/')) {
      this.onVideoFileSelected(event);
      return;
    }

    // 10MB kontrolü
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan büyük olamaz!');
      return;
    }

    this.selectedFile = file;

    // Resim ise önizleme göster
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

  // Dosya iptal
  cancelFile() {
    this.selectedFile = null;
    this.selectedFilePreview = null;
  }

  // Mesaj gönder (dosya varsa dosyayla)
 async sendMessage() {
  // Dosya varsa sendMessageWithFile çağır
  if (this.selectedFile) {
    await this.sendMessageWithFile();
    return; // ✅ ZORUNLU: Return ile fonksiyondan çık!
  }

  // Normal text mesaj gönder
  await this.sendTextMessage();
}

  // Normal metin mesajı gönder
  async sendTextMessage() {
    if (!this.messageText?.trim() || !this.receiverUser.id || !this.currentUser.id) return;

    const command = {
      senderId: this.currentUser.id,
      receiverId: this.receiverUser.id,
      content: this.messageText,
      type: MessageType.Text
    };

    console.log('📤 Mesaj gönderiliyor:', command);

    try {
      const result = await this.messageService.sendMessage(command).toPromise();
      
      console.log('✅ API Response:', result);
      
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
        
        this.messages.push(newMessage);
        this.messageText = '';
        
        this.shouldScrollToBottom = true; // ✅ Mesaj gönderince scroll yap
        
        // SignalR ile karşı tarafa bildir
        if (this.signalRService.isConnected()) {
          this.signalRService.sendMessage(
            this.receiverUser.id, 
            command.content,
            MessageType.Text
          );
        }
        
        // Friends component'e bildir
        this.messageBroadcast.notifyNewMessage({
          friendId: this.receiverUser.id,
          content: command.content,
          senderId: this.currentUser.id,
          receiverId: this.receiverUser.id,
          sentAt: new Date(),
          isOwn: true,
          type: MessageType.Text
        });
      }
    } catch (error: any) {
      console.error('❌ Mesaj gönderme hatası:', error);
      alert(error.message || 'Mesaj gönderilemedi!');
    }
  }

  async sendMessageWithFile() {
    if (!this.selectedFile || !this.receiverUser.id || !this.currentUser.id) return;

    this.isUploading = true;
    
    try {
      const uploadResult = await this.messageService.uploadFile(this.selectedFile).toPromise();
      
      console.log('📤 Upload result:', uploadResult);
      
      if (!uploadResult || !uploadResult.isSuccess) {
        throw new Error(uploadResult?.message || 'Dosya yüklenemedi');
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

      console.log('📤 Sending message command:', messageCommand);

      const sendResult = await this.messageService.sendMessage(messageCommand).toPromise();
      
      console.log('✅ Send result:', sendResult);
      
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
        
        this.shouldScrollToBottom = true; // ✅ Dosya gönderince scroll yap
        
        if (this.signalRService.isConnected()) {
          this.signalRService.sendMessage(
            this.receiverUser.id, 
            messageCommand.content,
            messageCommand.type,
            messageCommand.attachmentUrl,
            messageCommand.attachmentName,
            messageCommand.attachmentSize
          );
        }
        
        this.messageBroadcast.notifyNewMessage({
          friendId: this.receiverUser.id,
          content: messageCommand.content,
          senderId: this.currentUser.id,
          receiverId: this.receiverUser.id,
          sentAt: new Date(),
          isOwn: true,
          type: messageCommand.type,
          attachmentUrl: messageCommand.attachmentUrl,
          attachmentName: messageCommand.attachmentName
        });
        
        console.log('✅ Mesaj başarıyla gönderildi ve UI güncellendi');
      }
    } catch (error: any) {
      console.error('❌ Dosya gönderme hatası:', error);
      alert(error.message || 'Dosya gönderilemedi!');
    } finally {
      this.isUploading = false;
    }
  }

  // Dosya boyutu formatla
  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Resim hata durumu
  onImageError(event: any) {
    event.target.src = 'assets/image-error.png';
  }

  // Resim önizleme aç
 

  // Resim önizleme kapat
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

  openImagePreview(url: string | null | undefined) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  // Kamerayı aç
  async openCamera() {
    try {
      this.showCamera = true;
      
      // Biraz bekle ki ViewChild initialize olsun
      setTimeout(async () => {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user' // Ön kamera
          },
          audio: false
        });

        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.cameraStream;
          this.videoElement.nativeElement.play();
        }
      }, 100);
    } catch (error) {
      console.error('Kamera erişim hatası:', error);
      alert('Kameraya erişilemedi. Lütfen tarayıcı izinlerini kontrol edin.');
      this.showCamera = false;
    }
  }

  // Fotoğraf çek
  capturePhoto() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Canvas boyutunu video boyutuna ayarla
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Video frame'ini canvas'a çiz
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Canvas'ı Blob'a çevir
    canvas.toBlob((blob) => {
      if (blob) {
        // Blob'u File objesine çevir
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });

        // Canvas'tan base64 al (önizleme için)
        this.capturedImage = canvas.toDataURL('image/jpeg', 0.9);
        
        // Dosya olarak kaydet
        this.selectedFile = file;
        this.selectedFilePreview = this.capturedImage;

        // Kamerayı kapat
        this.stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }

  // Kamerayı kapat
  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.showCamera = false;
    this.capturedImage = null;
  }

  // Fotoğrafı tekrar çek
  retakePhoto() {
    this.capturedImage = null;
    this.selectedFile = null;
    this.selectedFilePreview = null;
    this.openCamera();
  }

  // ✅ YENİ: Menüyü aç/kapat
  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  // ✅ GÜNCELLENECEK: Arkadaşı sil ve listeyi yenile
  removeFriend() {
    if (!confirm(`${this.getReceiverFullName()} kişisini arkadaş listesinden silmek istediğinize emin misiniz?`)) {
      return;
    }

    this.friendService.removeFriend(this.receiverUser.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          console.log('Arkadaş başarıyla silindi.');
          this.showUserMenu = false;
          
          // ✅ Listeyi yenile ve sonraki arkadaşa geç
          this.friendService.getMyFriends().subscribe({
            next: (friends) => {
              this.friendsList = friends;
              this.navigateToNextFriend();
            },
            error: (error) => {
              console.error('Arkadaş listesi yenilenemedi:', error);
              this.navigateToNextFriend();
            }
          });
        } else {
          alert(response.message || 'Arkadaş silinemedi.');
        }
      },
      error: (error) => {
        console.error('Arkadaş silme hatası:', error);
        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  }

  // ✅ GÜNCELLENECEK: Kullanıcıyı engelle ve listeyi yenile
  blockUser() {
    if (!confirm(`${this.getReceiverFullName()} kişisini engellemek istediğinize emin misiniz? Bu kişi size mesaj gönderemeyecek.`)) {
      return;
    }

    this.friendService.blockUser(this.currentUser.id, this.receiverUser.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          console.log('Kullanıcı başarıyla engellendi.');
          this.showUserMenu = false;
          
          // ✅ Listeyi yenile ve sonraki arkadaşa geç
          this.friendService.getMyFriends().subscribe({
            next: (friends) => {
              this.friendsList = friends;
              this.navigateToNextFriend();
            },
            error: (error) => {
              console.error('Arkadaş listesi yenilenemedi:', error);
              this.navigateToNextFriend();
            }
          });
        } else {
          alert(response.message || 'Kullanıcı engellenemedi.');
        }
      },
      error: (error) => {
        console.error('Engelleme hatası:', error);
        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  }
}
