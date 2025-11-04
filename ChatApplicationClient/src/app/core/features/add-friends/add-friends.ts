import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

interface SearchUser {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userName: string;
  friendCode: string;
  profilePhotoUrl: string | null;
}

@Component({
  selector: 'app-add-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  // Arkadaş kontrolü ve buton durumu için
  myFriendIds = new Set<string>();
  private requestedIds = new Set<string>();
  private loadingIds = new Set<string>();

  constructor(
    private userService: UserService,
    private friendService: FriendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Mevcut arkadaşları yükle (zaten arkadaş mı kontrolü için)
    this.subscriptions.push(
      this.friendService.getMyFriends().subscribe({
        next: (friends: any[]) => {
          this.myFriendIds = new Set((friends || []).map(f => f.id));
        },
        error: () => {}
      })
    );

    this.subscriptions.push(
      this.searchSubject.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          const term = searchTerm.trim();
          this.lastSearchTerm = term;
          if (term.length === 0) {
            this.users = [];
            return of([]); // boş observable döndür
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

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubject.complete();
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchText);
  }

  selectUser(user: SearchUser): void {
    // Kullanıcıyı seç ve chat ekranını göster
    this.router.navigate(['/add-friends', user.id]);
  }

  addFriend(user: SearchUser): void {
    if (this.isAlreadyFriend(user)) { alert('Zaten arkadaşsınız.'); return; }
    if (this.isRequesting(user)) return;

    this.loadingIds.add(user.id);
    this.friendService.sendFriendRequest({ receiverId: user.id }).subscribe({
      next: (res) => {
        this.loadingIds.delete(user.id);
        if (res?.isSuccess) {
          this.requestedIds.add(user.id);
          alert('Arkadaşlık isteği gönderildi!');
        } else {
          alert(res?.message || 'Arkadaşlık isteği gönderilemedi.');
        }
      },
      error: (err) => {
        this.loadingIds.delete(user.id);
        const msg = err?.error?.message || 'Arkadaşlık isteği gönderilemedi.';
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

  getUserAvatar(user: SearchUser): string {
    return user.profilePhotoUrl || 'assets/default-avatar.png';
  }

  private isExactMatch(u: SearchUser, term: string): boolean {
    const email = this.normalize(u.email);
    const userName = this.normalize(u.userName);
    const friendCode = this.normalize(u.friendCode);
    const fullName = this.normalize(`${u.name} ${u.lastName}`);
    const fullNameAlt = this.normalize(`${u.lastName} ${u.name}`);

    return term === email
        || term === userName
        || term === friendCode
        || term === fullName
        || term === fullNameAlt;
  }

  private normalize(text: string): string {
    return (text || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
  }

  isAlreadyFriend(user: SearchUser): boolean {
    const me = this.userService.currentUser();
    return (me && user.id === me.id) || this.myFriendIds.has(user.id);
  }

  isRequesting(user: SearchUser): boolean {
    return this.loadingIds.has(user.id) || this.requestedIds.has(user.id);
  }
}
