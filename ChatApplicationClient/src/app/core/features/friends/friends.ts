import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap, RouterModule } from '@angular/router';

interface Friend {
  id: number;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unread?: number;
}

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './friends.html',
  styleUrls: ['./friends.scss']
})
export class Friends implements OnInit {
  friends: Friend[] = [
    {
      id: 2,
      name: 'Ayşe',
      avatar: 'https://i.pravatar.cc/150?img=5',
      lastMessage: 'Görüşmek üzere!',
      lastMessageTime: new Date(),
      unread: 2
    },
    {
      id: 3,
      name: 'Mehmet',
      avatar: 'https://i.pravatar.cc/150?img=12',
      lastMessage: 'Tamam, anlaştık.',
      lastMessageTime: new Date(Date.now() - 3600000)
    },
    {
      id: 4,
      name: 'Zeynep',
      avatar: 'https://i.pravatar.cc/150?img=9',
      lastMessage: 'Yarın görüşelim mi?',
      lastMessageTime: new Date(Date.now() - 86400000),
      unread: 1
    },
    {
      id: 5,
      name: 'Ali',
      avatar: 'https://i.pravatar.cc/150?img=11'
    }
  ];

  filteredFriends: Friend[] = [];
  selectedFriend: Friend | null = null;
  searchText: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.filteredFriends = [...this.friends];
    
    this.route.paramMap.subscribe((params: ParamMap) => {
      const friendId = params.get('id');
      if (friendId) {
        const friend = this.friends.find(f => f.id === Number(friendId));
        if (friend) {
          this.selectedFriend = friend;
          if (friend.unread) {
            friend.unread = 0;
          }
        }
      } else if (this.friends.length > 0 && !this.selectedFriend) {
        this.router.navigate(['/chat', this.friends[0].id]);
      }
    });
  }

  selectFriend(friend: Friend): void {
    this.router.navigate(['/chat', friend.id]);
  }

  filterFriends(): void {
    if (!this.searchText) {
      this.filteredFriends = [...this.friends];
      return;
    }
    
    const searchLower = this.searchText.toLowerCase();
    this.filteredFriends = this.friends.filter(friend => 
      friend.name.toLowerCase().includes(searchLower)
    );
  }
}
