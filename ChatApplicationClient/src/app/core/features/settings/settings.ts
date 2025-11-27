import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';
import { NotificationService } from '../../services/notification-service'; 
import { AbstractControl } from '@angular/forms';
import { CustomValidators } from '../../shared/validators/custom-validators';
import { Router } from '@angular/router';
import { finalize, tap } from 'rxjs';

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
  private notificationService = inject(NotificationService); 
  private router = inject(Router);

  currentUser: any = null;
  blockedUsers: any[] = [];
  isLoadingBlocked = false;

  friendsList: any[] = [];
  showAddBlockModal = false;
  isLoadingFriends = false;
  searchFriendText = '';
  filteredFriends: any[] = [];

  isEditingProfile = false;
  editForm = {
    name: '',
    lastName: '',
    userName: ''
  };

  selectedFile: File | null = null;
  isUploadingPhoto = false;

  nameTouched = false;
  lastNameTouched = false;
  attemptedSave = false;
  CustomValidators: any;

  showChangePasswordModal = false;
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  attemptedChange = false;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

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
      this.editForm.userName = user.userName;
    } else {
      this.userService.getUserInfo().subscribe({
        next: (user) => {
          this.currentUser = user;
          this.editForm.name = user.name;
          this.editForm.lastName = user.lastName;
          this.editForm.userName = user.userName;
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
        this.isLoadingBlocked = false;
        this.notificationService.show('Engellenen kullanıcılar yüklenirken bir hata oluştu.', 'error');
      }
    });
  }

  openAddBlockModal(): void {
    this.showAddBlockModal = true;
    this.searchFriendText = '';
    this.loadFriendsList();
  }

  closeAddBlockModal(): void {
    this.showAddBlockModal = false;
    this.friendsList = [];
    this.filteredFriends = [];
    this.searchFriendText = '';
  }

  loadFriendsList(): void {
    this.isLoadingFriends = true;
    this.friendService.getMyFriends().subscribe({
      next: (friends) => {
        const blockedIds = this.blockedUsers.map(u => u.id);
        this.friendsList = friends.filter(f => !blockedIds.includes(f.id));
        this.filteredFriends = [...this.friendsList];
        this.isLoadingFriends = false;
      },
      error: (error) => {
        this.isLoadingFriends = false;
        this.notificationService.show('Arkadaş listesi yüklenirken bir hata oluştu.', 'error');
      }
    });
  }

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

  blockFriend(friend: any): void {
    this.notificationService.show(
      `${friend.name} ${friend.lastName} kişisini engellemek istediğinize emin misiniz?`,
      'confirm',
      {
        action: () => {
          this.friendService.blockUser(this.currentUser.id, friend.id).subscribe({
            next: (response) => {
              if (response.isSuccess) {
                this.blockedUsers.push(friend);
                this.friendsList = this.friendsList.filter(f => f.id !== friend.id);
                this.filterFriends();
                this.notificationService.show('Kullanıcı başarıyla engellendi!', 'success');
                if (this.friendsList.length === 0) {
                  this.closeAddBlockModal();
                }
              } else {
                this.notificationService.show('Kullanıcı engellenemedi, lütfen tekrar deneyin.', 'error');
              }
            },
            error: (error) => {
              this.notificationService.show('Kullanıcı engellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            }
          });
        }
      }
    );
  }

  startEditProfile(): void {
    this.isEditingProfile = true;
  }

  cancelEditProfile(): void {
    this.isEditingProfile = false;
    this.editForm.name = this.currentUser.name;
    this.editForm.lastName = this.currentUser.lastName;
    this.editForm.userName = this.currentUser.userName;
  }

  onNameBlur(): void { this.nameTouched = true; }
  onLastNameBlur(): void { this.lastNameTouched = true; }

  hasNameError(): boolean {
    const control = { value: this.editForm.name } as AbstractControl;
    const notWs = !!CustomValidators.notWhitespace(control);
    const minLen = !!CustomValidators.minLength(2)(control);
    return notWs || minLen;
  }

  hasLastNameError(): boolean {
    const control = { value: this.editForm.lastName } as AbstractControl;
    const notWs = !!CustomValidators.notWhitespace(control);
    const minLen = !!CustomValidators.minLength(2)(control);
    return notWs || minLen;
  }

  saveProfile(): void {
    this.attemptedSave = true;

    if (this.hasNameError() || this.hasLastNameError()) {
      this.notificationService.show('Lütfen isim ve soyadı alanlarını kontrol edin.', 'error');
      return;
    }

    const data = {
      userId: this.currentUser.id,
      name: this.editForm.name,
      lastName: this.editForm.lastName,
      profilePhotoUrl: this.currentUser.profilePhotoUrl,
      userName: this.editForm.userName
    };

    this.userService.updateProfile(data).subscribe({
      next: (response) => {
        const respondedUser = response?.data ?? response?.user ?? response;
        const isSuccessFlag = response?.isSuccess === true || response?.success === true || response?.status === 'success';
        const looksLikeUserObj = !!(respondedUser && (respondedUser.id || respondedUser.userId || respondedUser.name));

        if (isSuccessFlag || looksLikeUserObj) {
          if (looksLikeUserObj) {
            this.currentUser = { ...this.currentUser, ...respondedUser };
          } else {
            this.currentUser.name = this.editForm.name;
            this.currentUser.lastName = this.editForm.lastName;
            this.currentUser.userName = this.editForm.userName;
          }

          this.isEditingProfile = false;
          this.attemptedSave = false;
          this.nameTouched = false;
          this.lastNameTouched = false;
          this.notificationService.show(response?.message ?? 'Profil güncellendi!', 'success');

        } else {
          this.notificationService.show('Profiliniz güncellenirken bir sorun oluştu. Lütfen tekrar deneyin.', 'error');
        }
      },
      error: (error) => {
        this.notificationService.show('Profiliniz güncellenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
      }
    });
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadPhoto();
    }
  }

 uploadPhoto(): void {
    if (!this.selectedFile || !this.currentUser) return;

    this.isUploadingPhoto = true;
    const userId = this.currentUser.id || this.currentUser.userId; 

    this.userService.uploadProfilePhoto(this.selectedFile, userId).pipe(
      finalize(() => {
        this.isUploadingPhoto = false;
        this.selectedFile = null;
      })
    ).subscribe({
      next: (response) => {
        if (response.isSuccess) {
          this.notificationService.show('Profil fotoğrafı başarıyla güncellendi!', 'success');
          

          
          this.loadUserInfo(); 
        } else {
          this.notificationService.show('Fotoğraf yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.', 'error');
        }
      },
      error: (error) => {
        this.notificationService.show('Fotoğraf yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
      }
    });
  }

  unblockUser(user: any): void {
    this.notificationService.show(
      `${user.name} ${user.lastName} kişisinin engelini kaldırmak istediğinize emin misiniz?`,
      'confirm',
      {
        action: () => {
          this.friendService.unblockUser(user.id).subscribe({
            next: (response) => {
              if (response.isSuccess) {
                this.blockedUsers = this.blockedUsers.filter(u => u.id !== user.id);
                this.notificationService.show('Engel kaldırıldı!', 'success');
              } else {
                this.notificationService.show('Kullanıcının engeli kaldırılamadı, lütfen tekrar deneyin.', 'error');
              }
            },
            error: (error) => {
              this.notificationService.show('Kullanıcının engeli kaldırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            }
          });
        }
      }
    );
  }

  copyFriendCode(): void {
    if (this.currentUser?.friendCode) {
      navigator.clipboard.writeText(this.currentUser.friendCode).then(() => {
        alert('Arkadaşlık kodu kopyalandı!');
      });
    }
  }

  get passwordMaskCount(): number {
    return this.currentUser?.passwordLength ?? 8;
  }
  get passwordMaskArray(): any[] {
    return new Array(this.passwordMaskCount);
  }

  openChangePasswordModal(): void {
    this.showChangePasswordModal = true;
    this.passwordForm.currentPassword = '';
    this.passwordForm.newPassword = '';
    this.passwordForm.confirmPassword = '';
    this.attemptedChange = false;

    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
    this.passwordForm.currentPassword = '';
    this.passwordForm.newPassword = '';
    this.passwordForm.confirmPassword = '';
    this.attemptedChange = false;
  }

  private makeControl(value: any): AbstractControl {
    return { value } as AbstractControl;
  }

  hasCurrentPasswordError(): boolean {
    const val = this.passwordForm.currentPassword || '';
    return val.trim().length === 0;
  }

  hasNewPasswordError(): boolean {
    const control = this.makeControl(this.passwordForm.newPassword);
    const res = CustomValidators.passwordStrength(8)(control as AbstractControl);
    return !!res;
  }

  isNewPasswordSameAsCurrent(): boolean {
    const current = (this.passwordForm.currentPassword || '').trim();
    const nw = (this.passwordForm.newPassword || '').trim();
    if (!current || !nw) return false;
    return current === nw;
  }

  passwordsMatch(): boolean {
    return this.passwordForm.newPassword === this.passwordForm.confirmPassword;
  }

  submitChangePassword(): void {
    this.attemptedChange = true;

    if (this.hasCurrentPasswordError()) {
      this.notificationService.show('Mevcut şifre boş olamaz.', 'error');
      return;
    }

    if (this.isNewPasswordSameAsCurrent()) {
      this.notificationService.show('Yeni şifre mevcut şifre ile aynı olamaz.', 'error');
      return;
    }

    if (this.hasNewPasswordError()) {
      this.notificationService.show('Yeni şifre güvenlik kurallarını sağlamıyor.', 'error');
      return;
    }

    if (!this.passwordsMatch()) {
      this.notificationService.show('Yeni şifre ve tekrarı eşleşmiyor.', 'error');
      return;
    }

    const userId = this.currentUser?.userId ?? this.currentUser?.id ?? this.currentUser?.userID ?? null;
    if (!userId) {
      this.notificationService.show('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return;
    }

    const payload = {
      userId,
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    };

    this.userService.changePassword(payload).subscribe({
      next: (res) => {
        this.notificationService.show(res?.message ?? 'Şifre başarıyla değiştirildi.', 'success');
        this.closeChangePasswordModal();
      },
      error: (err) => {
        this.notificationService.show('Şifre değiştirilirken bir hata oluştu. Lütfen mevcut şifrenizi kontrol edin.', 'error');
      }
    });
  }

  confirmDeleteAccount(): void {
    const userId = this.currentUser?.userId ?? this.currentUser?.id ?? this.currentUser?.userID ?? null;
    if (!userId) {
      this.notificationService.show('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.', 'error');
      return;
    }

    this.notificationService.show(
      'Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      'confirm',
      {
        action: () => {
          this.userService.deleteAccount(userId).subscribe({
            next: (res) => {
              if (res?.isSuccess !== false) {
                this.notificationService.show(res?.message ?? 'Hesabınız silindi.', 'success');
                this.userService.logout().subscribe({
                  next: () => {
                    this.router.navigate(['/login']).catch(() => { window.location.href = '/'; });
                  },
                  error: () => {
                    window.location.href = '/';
                  }
                });
              } else {
                this.notificationService.show('Hesabınız silinirken bir sorun oluştu. Lütfen tekrar deneyin.', 'error');
              }
            },
            error: (err) => {
              this.notificationService.show('Hesap silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
            }
          });
        }
      }
    );
  }
}
