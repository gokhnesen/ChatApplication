import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { FriendService } from '../../services/friend-service';
import { Friend } from '../../shared/models/friend';

@Component({
  selector: 'app-friends',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './friends.html',
  styleUrls: ['./friends.scss']
})
export class Friends implements OnInit {
  friends: Friend[] = [];
  filteredFriends: Friend[] = [];
  selectedFriend: Friend | null = null;
  searchText: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private friendService: FriendService
  ) {}

  ngOnInit(): void {
    // Fetch friends from the API
    this.friendService.getMyFriends().subscribe((data: Friend[]) => {
      this.friends = data.map(friend => ({
        ...friend,
        avatarUrl: friend.sender?.profilePhotoUrl || 'assets/default-avatar.png'
      }));
      this.filteredFriends = [...this.friends];
    });

    this.route.paramMap.subscribe((params: ParamMap) => {
      const friendId = params.get('id');
      if (friendId) {
        const friend = this.friends.find(f => f.id === friendId);
        if (friend) {
          this.selectedFriend = friend;
        }
      }
    });
  }

selectFriend(friend: Friend): void {
  this.selectedFriend = friend;
  this.router.navigate(['/chat', friend.id]);
}

  filterFriends(): void {
    if (!this.searchText) {
      this.filteredFriends = [...this.friends];
      return;
    }
    const searchLower = this.searchText.toLowerCase();
    this.filteredFriends = this.friends.filter(friend =>
      friend.sender?.name?.toLowerCase().includes(searchLower) ||
      friend.sender?.lastName?.toLowerCase().includes(searchLower) ||
      friend.sender?.email?.toLowerCase().includes(searchLower)
    );
  }
}
