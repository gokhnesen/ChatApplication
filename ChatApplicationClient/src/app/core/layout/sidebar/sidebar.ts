import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../services/user-service';

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

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
      
      // Chat ID'yi yakala
      const urlSegments = event.url.split('/');
      if (urlSegments.length >= 3) {
        const lastSegment = urlSegments[urlSegments.length - 1];
        if (lastSegment && lastSegment !== 'chat' && lastSegment !== 'add-friends') {
          this.currentChatId = lastSegment;
        }
      }
    });
  }

  ngOnInit(): void {
    this.currentRoute = this.router.url;
  }

  navigateToChat(): void {
    if (this.currentChatId) {
      this.router.navigate(['/chat', this.currentChatId]);
    } else {
      this.router.navigate(['/chat']);
    }
  }

  navigateToAddFriends(): void {
    // Chat ID'yi koru
    if (this.currentChatId) {
      this.router.navigate(['/add-friends', this.currentChatId]);
    } else {
      this.router.navigate(['/add-friends']);
    }
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute.includes(route);
  }
}
