import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';

@Component({
  selector: 'app-edit-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-user.html',
  styleUrls: ['./edit-user.scss']
})
export class EditUser implements OnInit {
  userId = '';
  name = '';
  lastName = '';
  profilePhotoUrl = '';
  currentPhotoPreview = '';
  
  selectedPhoto: File | null = null;
  photoPreviewUrl: string | null = null;
  
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    const user = this.userService.currentUser();
    if (user) {
      this.fillForm(user);
    } else {
      this.userService.getUserInfo().subscribe({
        next: (u) => this.fillForm(u),
        error: () => this.error = 'Kullanıcı bilgileri alınamadı.'
      });
    }
  }

  private fillForm(user: any): void {
    this.userId = user.id;
    this.name = user.name || '';
    this.lastName = user.lastName || '';
    this.profilePhotoUrl = user.profilePhotoUrl || '';
    this.currentPhotoPreview = user.profilePhotoUrl 
      ? `https://localhost:7055${user.profilePhotoUrl}`
      : 'assets/default-avatar.png';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedPhoto = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(this.selectedPhoto);
    }
  }

  async updateProfile(): Promise<void> {
    this.error = null;
    this.success = null;

    if (!this.name.trim() || !this.lastName.trim()) {
      this.error = 'Ad ve soyad zorunludur.';
      return;
    }

    this.loading = true;

    try {
      let uploadedPhotoUrl = this.profilePhotoUrl;
      
      // Yeni fotoğraf seçildiyse yükle ve dönen URL'i kullan
      if (this.selectedPhoto) {
        const uploadRes = await this.userService.uploadProfilePhoto(this.selectedPhoto).toPromise();
        if (uploadRes?.isSuccess && uploadRes?.profilePhotoUrl) {
          uploadedPhotoUrl = uploadRes.profilePhotoUrl; // Backend'den dönen yeni URL
        }
      }

      // Profil güncelle - yeni fotoğraf URL'i ile
      const payload = {
        userId: this.userId,
        name: this.name.trim(),
        lastName: this.lastName.trim(),
        profilePhotoUrl: uploadedPhotoUrl
      };

      this.userService.updateProfile(payload).subscribe({
        next: () => {
          this.loading = false;
          this.success = 'Profil başarıyla güncellendi!';
          // Önizlemeyi güncelle
          this.currentPhotoPreview = uploadedPhotoUrl 
            ? `https://localhost:7055${uploadedPhotoUrl}`
            : 'assets/default-avatar.png';
          this.photoPreviewUrl = null;
          this.selectedPhoto = null;
          setTimeout(() => this.router.navigate(['/chat']), 1500);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Profil güncellenemedi.';
        }
      });
    } catch (err: any) {
      this.loading = false;
      this.error = err?.error?.message || 'Fotoğraf yüklenemedi.';
    }
  }

  cancel(): void {
    this.router.navigate(['/chat']);
  }
}
