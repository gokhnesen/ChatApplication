import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Friends } from '../../features/friends/friends';
import { AddFriends } from '../../features/add-friends/add-friends';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar, Friends, AddFriends],
  templateUrl: './main.html',
  styleUrls: ['./main.scss']
})
export class Main {
  showFriends = true;
  showAddFriends = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.url;
      this.showFriends = url.includes('/chat');
      this.showAddFriends = url.includes('/add-friends');
    });
  }
}
