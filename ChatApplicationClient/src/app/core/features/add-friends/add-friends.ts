import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
import { NotificationService } from '../../services/notification-service'; // EKLE
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';

interface SearchUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userName: string;
  friendCode: string;
  profilePhotoUrl: string | null;
  friendshipStatus?: 'none' | 'pending' | 'friend';
}

@Component({
  selector: 'app-add-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,ProfilePhotoPipe],
  templateUrl: './add-friends.html',
  styleUrls: ['./add-friends.scss']
})
export class AddFriends implements OnInit, OnDestroy {
  searchText: string = '';
  users: SearchUser[] = [];
  isLoading: boolean = false;
  searchError: string = ''; // yeni

  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private lastSearchTerm = '';
  myFriendIds = new Set<string>();
  private requestedIds = new Set<string>();
  private loadingIds = new Set<string>();
  private profilePhotoPipe = new ProfilePhotoPipe();

  // izin verilen karakterler: harfler, rakamlar ve boşluk
  private allowedPattern = /^[\p{L}\p{N}\s]*$/u;

  constructor(
    private userService: UserService,
    private friendService: FriendService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Mevcut arkadaşları yükle
    this.subscriptions.push(
      this.friendService.getMyFriends().subscribe({
        next: (friends: any[]) => {
          this.myFriendIds = new Set((friends || []).map(f => f.id));
        },
        error: () => {}
      })
    );

    // Bekleyen arkadaşlık isteklerini yükle
    this.loadPendingRequests();

    this.subscriptions.push(
      this.searchSubject.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          const term = searchTerm.trim();
          this.lastSearchTerm = term;
          // VALIDASYON: en az 2 karakter gerekli
          if (term.length === 0) {
            this.searchError = '';
            this.users = [];
            return of([]);
          }
          if (term.length < 2) {
            this.searchError = 'Lütfen en az 2 karakter girin.';
            this.users = [];
            return of([]);
          }
          this.searchError = '';
          this.isLoading = true;
          return this.userService.searchUsers(term);
        })
      ).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response && response.isSuccess) {
            const term = this.normalize(this.lastSearchTerm);
            const data: SearchUser[] = response.data || [];
            this.users = data.filter(u => this.isExactMatch(u, term));
            this.users.forEach(user => {
              if (user.friendshipStatus === 'pending') {
                this.requestedIds.add(user.id);
              } else if (user.friendshipStatus === 'friend') {
                this.myFriendIds.add(user.id);
              }
            });
            // ekstra pending kontrolü
            this.checkPendingRequestsForUsers();
          } else {
            this.users = [];
          }
        },
        error: () => {
          this.isLoading = false;
          this.users = [];
        }
      })
    );
  }

  private loadPendingRequests(): void {
    // Gönderilen bekleyen istekleri yükle
    this.friendService.getPendingRequests().subscribe({
      next: (requests: any[]) => {
        // Sadece kendimin gönderdiği istekleri al (sender olarak)
        const sentRequests = (requests || []).filter((r: any) => r.senderId === this.userService.currentUser()?.id);
        this.requestedIds = new Set(sentRequests.map((r: any) => r.receiverId));
      },
      error: () => {}
    });
  }

  private checkPendingRequestsForUsers(): void {
    // Arama sonuçlarındaki kullanıcılar için bekleyen istekleri kontrol et
    if (this.users.length === 0) return;
    
    this.friendService.getPendingRequests().subscribe({
      next: (requests: any[]) => {
        const sentRequests = (requests || []).filter((r: any) => r.senderId === this.userService.currentUser()?.id);
        this.requestedIds = new Set(sentRequests.map((r: any) => r.receiverId));
      },
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubject.complete();
  }

  // helper: özel karakter kontrolü (Unicode harf/sayı/boşluk dışındakileri reddeder)
  private containsInvalidChars(text: string): boolean {
    if (!text) return false;
    // Unicode property escape: tüm dillerdeki harfler ve sayılar ile boşluğu izin ver
    return /[^\p{L}\p{N}\s]/u.test(text);
  }

  onSearchKeydown(ev: KeyboardEvent): void {
    const k = ev.key;

    const controlKeys = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter','Home','End','Escape'];
    if (controlKeys.includes(k)) return;

    if (k.length === 1 && !this.allowedPattern.test(k)) {
      ev.preventDefault();
      this.searchError = 'Özel karakter kullanmayın.';
      setTimeout(() => { if (this.searchError === 'Özel karakter kullanmayın.') this.searchError = ''; }, 2000);
    }
  }

  onSearchPaste(ev: ClipboardEvent): void {
    ev.preventDefault();
    const text = ev.clipboardData?.getData('text/plain') || '';
    const sanitized = Array.from(text).filter(ch => this.allowedPattern.test(ch)).join('').slice(0, 10);
    if (!sanitized || sanitized.length === 0) {
      this.searchError = 'Yapıştırılan içerikte geçersiz karakterler var.';
      setTimeout(() => { this.searchError = ''; }, 2500);
      return;
    }
    this.searchText = sanitized;
    this.onSearchChange();
  }

  onSearchChange(): void {
    const raw = (this.searchText || '');
    const cleaned = Array.from(raw).filter(ch => this.allowedPattern.test(ch)).join('').slice(0, 10);
    if (cleaned !== raw) {
      this.searchText = cleaned;
      this.searchError = 'Geçersiz karakterler otomatik olarak kaldırıldı.';
      setTimeout(() => { if (this.searchError === 'Geçersiz karakterler otomatik olarak kaldırıldı.') this.searchError = ''; }, 1800);
    }

    // mevcut kontroller (uzunluk, özel karakter, min 2) devam eder
    if (this.searchText.length > 10) {
      this.searchError = 'En fazla 10 karakter girebilirsiniz.';
      this.users = [];
      return;
    }

    const trimmed = this.searchText.trim();

    if (trimmed.length === 0) {
      this.searchError = '';
      this.users = [];
      this.searchSubject.next(this.searchText);
      return;
    }
    if (trimmed.length < 2) {
      this.searchError = 'Lütfen en az 2 karakter girin.';
      this.users = [];
      return;
    }

    this.searchError = '';
    this.searchSubject.next(this.searchText);
  }

  selectUser(u: any) {
    this.router.navigate([u.id], { relativeTo: this.route });
  }

  addFriend(user: SearchUser): void {
    if (this.isAlreadyFriend(user)) { 
      this.notificationService.show('Zaten arkadaşsınız.', 'info');
      return; 
    }
    if (this.requestedIds.has(user.id)) {
      this.notificationService.show('Arkadaşlık isteği zaten gönderilmiş.', 'warning');
      return;
    }

    this.loadingIds.add(user.id);
    this.friendService.sendFriendRequest({ receiverId: user.id }).subscribe({
      next: (res) => {
        this.loadingIds.delete(user.id);
        if (res?.isSuccess) {
          this.requestedIds.add(user.id);
          this.notificationService.show('Arkadaşlık isteği gönderildi!', 'success');
        } else {
          if (res?.message?.includes('zaten gönderilmiş') || 
              res?.errors?.some((e: string) => e.includes('already exists'))) {
            this.requestedIds.add(user.id);
          }
          this.notificationService.show(res?.message || 'Arkadaşlık isteği gönderilemedi.', 'error');
        }
      },
      error: (err) => {
        this.loadingIds.delete(user.id);
        const msg = err?.error?.message || 'Arkadaşlık isteği gönderilemedi.';
        if (msg.includes('zaten gönderilmiş') || 
            err?.error?.errors?.some((e: string) => e.includes('already exists'))) {
          this.requestedIds.add(user.id);
        }
        this.notificationService.show(msg, 'error');
      }
    });
  }

  addFriendByCode(): void {
    const code = this.searchText.trim();
    if (!code) return;
    this.friendService.sendFriendRequest({ friendCode: code }).subscribe({
      next: () => this.notificationService.show('Arkadaşlık isteği gönderildi!', 'success'),
      error: () => this.notificationService.show('Arkadaşlık isteği gönderilemedi.', 'error')
    });
  }

  private isExactMatch(u: SearchUser, term: string): boolean {
    const email = this.normalize(u.email);
    const userName = this.normalize(u.userName);
    const friendCode = this.normalize(u.friendCode);
    const fullName = this.normalize(`${u.name} ${u.lastName}`);
    const fullNameAlt = this.normalize(`${u.lastName} ${u.name}`);

    return email.includes(term)
        || userName.includes(term)
        || friendCode.includes(term)
        || fullName.includes(term)
        || fullNameAlt.includes(term);
  }

  private normalize(text: string): string {
    return (text || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  }

  isAlreadyFriend(user: SearchUser): boolean {
    const me = this.userService.currentUser();
    return (me && user.id === me.id) || this.myFriendIds.has(user.id);
  }

  isRequesting(user: SearchUser): boolean {
    return this.loadingIds.has(user.id);
  }

  isRequestSent(user: SearchUser): boolean {
    return this.requestedIds.has(user.id);
  }

  getUserAvatar(user: SearchUser): string {
    return this.profilePhotoPipe.transform(user.profilePhotoUrl);
  }

}
