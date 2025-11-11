import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
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
  friendshipStatus?: 'none' | 'pending' | 'friend'; // Backend'den gelebilir
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
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private lastSearchTerm = '';
  myFriendIds = new Set<string>();
  private requestedIds = new Set<string>();
  private loadingIds = new Set<string>();
  private profilePhotoPipe = new ProfilePhotoPipe();

  constructor(
    private userService: UserService,
    private friendService: FriendService,
    private router: Router,
    private route: ActivatedRoute
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
          if (term.length === 0) {
            this.users = [];
            return of([]);
          }
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
            
            // Backend'den gelen friendship durumlarını kontrol et
            this.users.forEach(user => {
              if (user.friendshipStatus === 'pending') {
                this.requestedIds.add(user.id);
              } else if (user.friendshipStatus === 'friend') {
                this.myFriendIds.add(user.id);
              }
            });
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

  onSearchChange(): void {
    this.searchSubject.next(this.searchText);
  }

  selectUser(u: any) {
    this.router.navigate([u.id], { relativeTo: this.route });
  }

  addFriend(user: SearchUser): void {
    if (this.isAlreadyFriend(user)) { 
      alert('Zaten arkadaşsınız.'); 
      return; 
    }
    if (this.requestedIds.has(user.id)) {
      alert('Arkadaşlık isteği zaten gönderilmiş.');
      return;
    }

    this.loadingIds.add(user.id);
    this.friendService.sendFriendRequest({ receiverId: user.id }).subscribe({
      next: (res) => {
        this.loadingIds.delete(user.id);
        if (res?.isSuccess) {
          this.requestedIds.add(user.id);
          alert('Arkadaşlık isteği gönderildi!');
        } else {
          // Eğer zaten gönderilmişse, requestedIds'e ekle
          if (res?.message?.includes('zaten gönderilmiş') || 
              res?.errors?.some((e: string) => e.includes('already exists'))) {
            this.requestedIds.add(user.id);
          }
          alert(res?.message || 'Arkadaşlık isteği gönderilemedi.');
        }
      },
      error: (err) => {
        this.loadingIds.delete(user.id);
        const msg = err?.error?.message || 'Arkadaşlık isteği gönderilemedi.';
        
        // Eğer zaten gönderilmişse, requestedIds'e ekle
        if (msg.includes('zaten gönderilmiş') || 
            err?.error?.errors?.some((e: string) => e.includes('already exists'))) {
          this.requestedIds.add(user.id);
        }
        
        alert(msg);
      }
    });
  }

  addFriendByCode(): void {
    const code = this.searchText.trim();
    if (!code) return;
    this.friendService.sendFriendRequest({ friendCode: code }).subscribe({
      next: () => alert('Arkadaşlık isteği gönderildi!'),
      error: () => alert('Arkadaşlık isteği gönderilemedi.')
    });
  }

  private isExactMatch(u: SearchUser, term: string): boolean {
    const email = this.normalize(u.email);
    const userName = this.normalize(u.userName);
    const friendCode = this.normalize(u.friendCode);
    const fullName = this.normalize(`${u.name} ${u.lastName}`);
    const fullNameAlt = this.normalize(`${u.lastName} ${u.name}`);

    // TAM EŞLEŞME yerine IÇEREN kontrolü
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
