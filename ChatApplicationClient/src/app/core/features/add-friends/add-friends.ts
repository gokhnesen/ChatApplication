import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
import { Subject, Subscription } from 'rxjs';
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

  constructor(
    private userService: UserService,
    private friendService: FriendService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.searchSubject.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(searchTerm => {
          if (searchTerm.trim().length === 0) {
            this.users = [];
            return [];
          }
          this.isLoading = true;
          return this.userService.searchUsers(searchTerm);
        })
      ).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response && response.isSuccess) {
            this.users = response.data || [];
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
    this.friendService.sendFriendRequest(user.id).subscribe({
      next: (response) => {
        alert('Arkadaşlık isteği gönderildi!');
      },
      error: (error) => {
        alert('Arkadaşlık isteği gönderilemedi.');
      }
    });
  }

  getUserAvatar(user: SearchUser): string {
    return user.profilePhotoUrl || 'assets/default-avatar.png';
  }
}
