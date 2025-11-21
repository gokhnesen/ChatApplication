import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { FriendService } from '../../services/friend-service';
import { ProfilePhotoPipe } from '../../pipes/profile-photo.pipe';
import { NotificationService } from '../../services/notification-service'; // EKLE
import { AbstractControl } from '@angular/forms';
import { CustomValidators } from '../../shared/validators/custom-validators';

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
  private notificationService = inject(NotificationService); // EKLE

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

  // durum izleme - template ngModel için
  nameTouched = false;
  lastNameTouched = false;
  attemptedSave = false;
  CustomValidators: any;

  // ------ Yeni: Şifre değiştirme modal ve form alanları
  showChangePasswordModal = false;
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  attemptedChange = false;

  // göz butonları için state
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
                this.notificationService.show(response.message || 'Kullanıcı engellenemedi.', 'error');
              }
            },
            error: (error) => {
              console.error('Engelleme hatası:', error);
              this.notificationService.show('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            }
          });
        }
      }
    );
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

  // blur eventleri (template'den çağır)
  onNameBlur(): void { this.nameTouched = true; }
  onLastNameBlur(): void { this.lastNameTouched = true; }

  // alan hatası kontrolü (ngModel kullanımıyla CustomValidators çağırılır)
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

    // Validasyon (ngModel tabanlı)
    if (this.hasNameError() || this.hasLastNameError()) {
      this.notificationService.show('Lütfen isim ve soyadı alanlarını kontrol edin.', 'error');
      return;
    }

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
          this.attemptedSave = false;
          this.nameTouched = false;
          this.lastNameTouched = false;
          this.notificationService.show('Profil güncellendi!', 'success');
        } else {
          this.notificationService.show(response.message || 'Profil güncellenemedi.', 'error');
        }
      },
      error: (error) => {
        console.error('Profil güncelleme hatası:', error);
        this.notificationService.show('Bir hata oluştu.', 'error');
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

  // ✅ Engeli kaldır (notification ile)
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
                this.notificationService.show(response.message || 'Engel kaldırılamadı.', 'error');
              }
            },
            error: (error) => {
              console.error('Engel kaldırma hatası:', error);
              this.notificationService.show('Bir hata oluştu.', 'error');
            }
          });
        }
      }
    );
  }

  // Arkadaşlık kodunu kopyala
  copyFriendCode(): void {
    if (this.currentUser?.friendCode) {
      navigator.clipboard.writeText(this.currentUser.friendCode).then(() => {
        alert('Arkadaşlık kodu kopyalandı!');
      });
    }
  }

  // ---------- Yeni: şifre gösterimi (kare sayısı)
  // Backend password length sağlıyorsa kullanılır, yoksa varsayılan 8 gösterilir
  get passwordMaskCount(): number {
    return this.currentUser?.passwordLength ?? 8;
  }
  get passwordMaskArray(): any[] {
    return new Array(this.passwordMaskCount);
  }

  // ---------- Yeni: Şifre değiştir modal kontrolleri
  openChangePasswordModal(): void {
    this.showChangePasswordModal = true;
    this.passwordForm.currentPassword = '';
    this.passwordForm.newPassword = '';
    this.passwordForm.confirmPassword = '';
    this.attemptedChange = false;

    // reset göz durumları
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
    // basit "sahte" AbstractControl nesnesi ngModel ile validasyon kullanımı için
    return { value } as AbstractControl;
  }

  hasCurrentPasswordError(): boolean {
    // zorunlu kontrol: boş olamaz
    const val = this.passwordForm.currentPassword || '';
    return val.trim().length === 0;
  }

  hasNewPasswordError(): boolean {
    const control = this.makeControl(this.passwordForm.newPassword);
    // passwordStrength dönerse hata objesi veya null
    const res = CustomValidators.passwordStrength(8)(control as AbstractControl);
    return !!res;
  }

  // Yeni: mevcut şifre ile yeni şifre aynı mı kontrolü
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

    // Backend'in beklediği userId alanını ekleyin (varsa session/cookie yerine)
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
        const msg = err?.error?.title || err?.error?.message || 'Şifre değiştirilirken hata oluştu mevcut şifrenizi kontrol edin.';
        this.notificationService.show(msg, 'error');
        console.error('changePassword error', err);
      }
    });
  }
}
