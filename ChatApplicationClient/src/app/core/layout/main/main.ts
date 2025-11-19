import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../sidebar/sidebar';
import { Friends } from '../../features/friends/friends';
import { AddFriends } from '../../features/add-friends/add-friends';
import { UserService } from '../../services/user-service';
import { filter } from 'rxjs/operators';
import { Notifications } from "../../shared/notifications/notifications";

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar, Friends, AddFriends, Notifications],
  templateUrl: './main.html',
  styleUrls: ['./main.scss']
})
export class Main implements OnInit {
  showFriends = true;
  showAddFriends = false;
  private router = inject(Router);
  private userService = inject(UserService);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.url;
      this.showFriends = url.includes('/chat');
      this.showAddFriends = url.includes('/add-friends');
    });
  }

  ngOnInit(): void {
    if (this.router.url === '/' || this.router.url === '/chat') {
      this.redirectToLastChat();
    }
  }

  private redirectToLastChat(): void {
    const lastFriendId = localStorage.getItem('lastSelectedFriendId');
    if (lastFriendId) {
      this.router.navigate(['/chat', lastFriendId]);
    }
  }
}
