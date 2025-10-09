import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user-service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  name: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  error: string = '';
  selectedPhoto: File | null = null;
  photoPreviewUrl: string | null = null;
  isUploading: boolean = false;
  
  private userService = inject(UserService);
  private router = inject(Router);

  onPhotoSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.selectedPhoto = element.files[0];
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedPhoto);
    }
  }

  async register() {
    // Validate form
    if (!this.name || !this.lastName || !this.email || !this.password) {
      this.error = 'Lütfen tüm alanları doldurun.';
      return;
    }
    
    try {
      this.isUploading = true;
      this.error = '';
      let profilePhotoUrl: string | undefined = undefined;
      
      // Upload photo if selected
      if (this.selectedPhoto) {
        try {
          const uploadResult = await this.userService.uploadProfilePhoto(this.selectedPhoto).toPromise();
          if (uploadResult?.isSuccess) {
            profilePhotoUrl = uploadResult.profilePhotoUrl;
          } else {
            this.error = uploadResult?.message || 'Fotoğraf yüklenirken bir hata oluştu.';
            this.isUploading = false;
            return;
          }
        } catch (uploadError: any) {
          console.error('Photo upload error:', uploadError);
          this.error = 'Fotoğraf yüklenemedi: ' + (uploadError.message || 'Bilinmeyen hata');
          this.isUploading = false;
          return;
        }
      }
      
      // Register user with photo URL if available
      this.userService.register({ 
        email: this.email, 
        password: this.password, 
        name: this.name, 
        lastName: this.lastName,
        profilePhotoUrl: profilePhotoUrl
      }).subscribe({
        next: (res: any) => {
          this.isUploading = false;
          if (res.isSuccess) {
            localStorage.setItem('isAuthenticated', 'true');
            // Store any tokens or user info
            if (res.token) {
              localStorage.setItem('token', res.token);
            }
            
            // Navigate to dashboard/home
            this.router.navigate(['/dashboard']);
          } else {
            localStorage.setItem('isAuthenticated', 'false');
            this.error = res.message || 'Kayıt başarısız!';
          }
        },
        error: (err) => {
          this.isUploading = false;
          localStorage.setItem('isAuthenticated', 'false');
          this.error = err.error?.message || 'Kayıt sırasında bir hata oluştu.';
          console.error('Registration error:', err);
        }
      });
    } catch (error: any) {
      this.isUploading = false;
      this.error = error.message || 'İşlem sırasında bir hata oluştu.';
    }
  }
}
