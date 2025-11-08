import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../services/user-service';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FriendService, PendingFriendRequest } from '../../services/friend-service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar implements OnInit {
  currentUser = { 
    id: 1, 
    name: 'Ben', 
    avatar: 'https://i.pravatar.cc/150?img=3' 
  };
  currentRoute: string = '';
  currentChatId: string | null = null;

  showRequests = false;
  requestsLoading = false;
  requestsError: string | null = null;
  pendingRequests: PendingFriendRequest[] = [];
  private processing = new Set<string>();
  currentUserId = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {}

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

    this.refreshRequests();
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

  navigateToProfile(): void {
    this.router.navigate(['/edit-profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute.includes(route);
  }

  toggleRequests(): void {
    this.showRequests = !this.showRequests;
    if (this.showRequests) this.refreshRequests();
  }

  refreshRequests(): void {
    this.requestsLoading = true;
    this.requestsError = null;
    this.friendService.getPendingRequests().subscribe({
      next: (list) => { this.pendingRequests = list || []; this.requestsLoading = false; },
      error: (err) => { this.requestsError = err?.error?.message || 'İstekler alınamadı.'; this.requestsLoading = false; }
    });
  }

  isProcessing(id: string): boolean {
    return this.processing.has(id);
  }

  respond(req: any, accept: boolean): void {
    const fid = req.friendshipId;
    if (this.processing.has(fid)) return;
    this.processing.add(fid);

    // receiverId’yi servis tarafı otomatik tamamlayacak helper’ı kullan
    this.friendService.respondToFriendRequestById(fid, accept).subscribe({
      next: () => {
        this.processing.delete(fid);
        this.pendingRequests = this.pendingRequests.filter(r => r.friendshipId !== fid);
      },
      error: () => { this.processing.delete(fid); }
    });
  }

  trackByRequest = (_: number, r: PendingFriendRequest) => r.friendshipId;

  onAvatarError(evt: Event) {
    const img = evt.target as HTMLImageElement;
    img.src = 'assets/default-avatar.png';
  }
}
