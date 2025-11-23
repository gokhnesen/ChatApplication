import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../services/user-service';
import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { FriendService } from '../../services/friend-service';
import { NotificationService } from '../../services/notification-service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar {
  currentUser: any = null;
  currentRoute: string = '';
  currentChatId: string | null = null;
  pendingRequestsCount = 0;

  private userService = inject(UserService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  constructor() {
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.currentUser = user;
      }
    });
  }

  ngOnInit(): void {
    this.currentRoute = this.router.url;

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects || e.url;
        this.currentRoute = url;
        const chatMatch = url.match(/\/chat\/([^\/]+)/);
        const addFriendsMatch = url.match(/\/add-friends\/([^\/]+)/);
        this.currentChatId = chatMatch?.[1] || addFriendsMatch?.[1] || this.currentChatId;
      });

  }



  navigateToChat(): void {
    if (this.currentChatId) {
      this.router.navigate(['/chat', this.currentChatId]);
    } else {
      this.router.navigate(['/chat']);
    }
  }

  navigateToAddFriends(): void {
    if (this.currentChatId) {
      this.router.navigate(['/add-friends', this.currentChatId]);
    } else {
      this.router.navigate(['/add-friends']);
    }
  }

  navigateToFriendRequests(): void {
    this.router.navigate(['/friend-requests']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute.includes(route);
  }

  logout(): void {
    this.notificationService.show(
      'Çıkış yapmak istediğinize emin misiniz?',
      'confirm',
      {
        action: () => {
          this.userService.logout().subscribe({
            next: () => {
              this.notificationService.show('Çıkış başarılı!', 'success');
              this.router.navigate(['/login']);
            },
            error: (err) => {
              console.error('Logout error:', err);
              this.notificationService.show('Çıkış sırasında hata oluştu!', 'error');
              this.router.navigate(['/login']);
            }
          });
        }
      }
    );
  }
}
