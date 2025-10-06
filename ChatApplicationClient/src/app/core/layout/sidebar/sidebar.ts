import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar {
  currentUser = { 
    id: 1, 
    name: 'Ben', 
    avatar: 'https://i.pravatar.cc/150?img=3' 
  };
}
