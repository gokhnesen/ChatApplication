import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ProfilePhotoPipe],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class Settings implements OnInit {
  private userService = inject(UserService);
  private friendService = inject(FriendService);

  currentUser: any = null;
  blockedUsers: any[] = [];
  isLoadingBlocked = false;

  // ✅ YENİ: Arkadaş listesi ve modal
  friendsList: any[] = [];
  showAddBlockModal = false;
  isLoadingFriends = false;
  searchFriendText = '';
  filteredFriends: any[] = [];

  // Profil düzenleme
  isEditingProfile = false;
  editForm = {
    name: '',
    lastName: ''
  };

  // Profil fotoğrafı
  selectedFile: File | null = null;
  isUploadingPhoto = false;

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadBlockedUsers();
  }

  loadUserInfo(): void {
    const user = this.userService.currentUser();
    if (user) {
      this.currentUser = user;
      this.editForm.name = user.name;
      this.editForm.lastName = user.lastName;
    } else {
      this.userService.getUserInfo().subscribe({
        next: (user) => {
          this.currentUser = user;
          this.editForm.name = user.name;
          this.editForm.lastName = user.lastName;
        }
      });
    }
  }

  loadBlockedUsers(): void {
    this.isLoadingBlocked = true;
    this.userService.getBlockedUsers().subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.blockedUsers = response.data || [];
        }
        this.isLoadingBlocked = false;
      },
      error: (error) => {
        console.error('Engellenenler yüklenemedi:', error);
        this.isLoadingBlocked = false;
      }
    });
  }

  // ✅ YENİ: Arkadaş ekleme modalını aç
  openAddBlockModal(): void {
    this.showAddBlockModal = true;
    this.searchFriendText = '';
    this.loadFriendsList();
  }

  // ✅ YENİ: Modalı kapat
  closeAddBlockModal(): void {
    this.showAddBlockModal = false;
    this.friendsList = [];
    this.filteredFriends = [];
    this.searchFriendText = '';
  }

  // ✅ YENİ: Arkadaş listesini yükle (engellenmemiş olanlar)
  loadFriendsList(): void {
    this.isLoadingFriends = true;
    this.friendService.getMyFriends().subscribe({
      next: (friends) => {
        // Zaten engellenenler hariç
        const blockedIds = this.blockedUsers.map(u => u.id);
        this.friendsList = friends.filter(f => !blockedIds.includes(f.id));
        this.filteredFriends = [...this.friendsList];
        this.isLoadingFriends = false;
      },
      error: (error) => {
        console.error('Arkadaş listesi yüklenemedi:', error);
        this.isLoadingFriends = false;
      }
    });
  }

  // ✅ YENİ: Arkadaş ara
  filterFriends(): void {
    if (!this.searchFriendText.trim()) {
      this.filteredFriends = [...this.friendsList];
      return;
    }

    const searchLower = this.searchFriendText.toLowerCase();
    this.filteredFriends = this.friendsList.filter(f =>
      f.name?.toLowerCase().includes(searchLower) ||
      f.lastName?.toLowerCase().includes(searchLower) ||
      f.email?.toLowerCase().includes(searchLower)
    );
  }

  // ✅ YENİ: Arkadaşı engelle
  blockFriend(friend: any): void {
    if (!confirm(`${friend.name} ${friend.lastName} kişisini engellemek istediğinize emin misiniz?`)) {
      return;
    }

    this.friendService.blockUser(this.currentUser.id, friend.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          // Engellenenler listesine ekle
          this.blockedUsers.push(friend);
          
          // Arkadaş listesinden çıkar
          this.friendsList = this.friendsList.filter(f => f.id !== friend.id);
          this.filterFriends();
          
          alert('Kullanıcı başarıyla engellendi!');
          
          // Arkadaş kalmadıysa modalı kapat
          if (this.friendsList.length === 0) {
            this.closeAddBlockModal();
          }
        } else {
          alert(response.message || 'Kullanıcı engellenemedi.');
        }
      },
      error: (error) => {
        console.error('Engelleme hatası:', error);
        alert('Bir hata oluştu. Lütfen tekrar deneyin.');
      }
    });
  }

  // Profil düzenleme
  startEditProfile(): void {
    this.isEditingProfile = true;
  }

  cancelEditProfile(): void {
    this.isEditingProfile = false;
    this.editForm.name = this.currentUser.name;
    this.editForm.lastName = this.currentUser.lastName;
  }

  saveProfile(): void {
    const data = {
      userId: this.currentUser.id,
      name: this.editForm.name,
      lastName: this.editForm.lastName,
      profilePhotoUrl: this.currentUser.profilePhotoUrl
    };

    this.userService.updateProfile(data).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.currentUser.name = this.editForm.name;
          this.currentUser.lastName = this.editForm.lastName;
          this.isEditingProfile = false;
          alert('Profil güncellendi!');
        } else {
          alert(response.message || 'Profil güncellenemedi.');
        }
      },
      error: (error) => {
        console.error('Profil güncelleme hatası:', error);
        alert('Bir hata oluştu.');
      }
    });
  }

  // Profil fotoğrafı yükleme
  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadPhoto();
    }
  }

  uploadPhoto(): void {
    if (!this.selectedFile) return;

    this.isUploadingPhoto = true;
    this.userService.uploadProfilePhoto(this.selectedFile).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.currentUser.profilePhotoUrl = response.profilePhotoUrl;
          this.userService.getUserInfo().subscribe();
          alert('Profil fotoğrafı güncellendi!');
        }
        this.isUploadingPhoto = false;
        this.selectedFile = null;
      },
      error: (error) => {
        console.error('Fotoğraf yükleme hatası:', error);
        alert('Fotoğraf yüklenemedi.');
        this.isUploadingPhoto = false;
        this.selectedFile = null;
      }
    });
  }

  // Engeli kaldır
  unblockUser(user: any): void {
    if (!confirm(`${user.name} ${user.lastName} kişisinin engelini kaldırmak istediğinize emin misiniz?`)) {
      return;
    }

    this.friendService.unblockUser(user.id).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.blockedUsers = this.blockedUsers.filter(u => u.id !== user.id);
          alert('Engel kaldırıldı!');
        } else {
          alert(response.message || 'Engel kaldırılamadı.');
        }
      },
      error: (error) => {
        console.error('Engel kaldırma hatası:', error);
        alert('Bir hata oluştu.');
      }
    });
  }

  // Arkadaşlık kodunu kopyala
  copyFriendCode(): void {
    if (this.currentUser?.friendCode) {
      navigator.clipboard.writeText(this.currentUser.friendCode).then(() => {
        alert('Arkadaşlık kodu kopyalandı!');
      });
    }
  }
}
