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
  userName: string = '';
  email: string = '';
  password: string = '';
  error: string = '';
  selectedPhoto: File | null = null;
  photoPreviewUrl: string | null = null;
  isUploading: boolean = false;
  successMessage: string = '';

  nameError: string = '';
  lastNameError: string = '';
  emailError: string = '';
  passwordError: string = '';
  photoError: string = '';

  nameTouched = false;
  lastNameTouched = false;
  emailTouched = false;
  passwordTouched = false;
  attemptedRegister = false;

  private userService = inject(UserService);
  private router = inject(Router);

  onPhotoSelected(event: Event) {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      const file = element.files[0];

      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        this.photoError = 'Geçersiz dosya tipi. JPEG/PNG/WEBP olabilir.';
        this.selectedPhoto = null;
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.photoError = 'Dosya çok büyük. Maksimum 5MB olabilir.';
        this.selectedPhoto = null;
        return;
      }

      this.photoError = '';
      this.selectedPhoto = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreviewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedPhoto);
    }
  }

  private validateEmailFormat(email: string): boolean {
    if (!email) return false;
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email.toLowerCase());
  }

  private validatePasswordStrength(pw: string): boolean {
    if (!pw) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(pw);
    return pw.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial;
  }

  isFormValid(): boolean {
    this.nameError = '';
    this.lastNameError = '';
    this.emailError = '';
    this.passwordError = '';

    if (!this.name || this.name.trim().length < 2) {
      this.nameError = 'İsim en az 2 karakter olmalı.';
    }
    if (!this.lastName || this.lastName.trim().length < 2) {
      this.lastNameError = 'Soyad en az 2 karakter olmalı.';
    }
    if (!this.validateEmailFormat(this.email)) {
      this.emailError = 'Geçerli bir email girin.';
    }
    if (!this.validatePasswordStrength(this.password)) {
      this.passwordError = 'Şifre en az 8 karakter olmalı, büyük/küçük harf, sayı ve özel karakter içermeli.';
    }

    return !this.nameError && !this.lastNameError && !this.emailError && !this.passwordError && !this.photoError;
  }

  async register() {
    this.attemptedRegister = true;

    if (!this.isFormValid()) {
      this.error = 'Lütfen hata mesajlarını kontrol edin.';
      return;
    }

    try {
      this.isUploading = true;
      this.error = '';
      let profilePhotoUrl: string | undefined = undefined;
      
      if (this.selectedPhoto) {
        try {
          const uploadResult = await this.userService.uploadProfilePhoto(this.selectedPhoto).toPromise();
          if (uploadResult?.isSuccess) {
            profilePhotoUrl = uploadResult.profilePhotoUrl;
          } else {
            this.error = 'Fotoğraf yüklenirken bir hata oluştu. Lütfen tekrar deneyin.';
            this.isUploading = false;
            return;
          }
        } catch (uploadError: any) {
          console.error('Photo upload error:', uploadError);
          this.error = 'Fotoğraf yüklenemedi. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.';
          this.isUploading = false;
          return;
        }
      }
      
      this.userService.register({ 
        email: this.email, 
        password: this.password, 
        name: this.name, 
        userName: this.userName,
        lastName: this.lastName,
        profilePhotoUrl: profilePhotoUrl
      }).subscribe({
        next: (res: any) => {
          this.isUploading = false;
          if (res.isSuccess) {
            this.successMessage = 'Kayıt işlemi başarılı! Giriş sayfasına yönlendiriliyorsunuz...';
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.handleRegistrationError(res);
          }
        },
        error: (err) => {
          this.handleRegistrationError(err);
        }
      });
    } catch (error: any) {
      this.isUploading = false;
      this.error = 'İşlem sırasında beklenmedik bir hata oluştu.';
      console.error('Unexpected registration error:', error);
    }
  }

  private handleRegistrationError(errorSource: any) {
    this.isUploading = false;
    localStorage.setItem('isAuthenticated', 'false');

    const message = errorSource?.error?.message || errorSource?.message || '';
    
    console.error('Registration error details:', errorSource);

    if (message.toLowerCase().includes('email') && message.toLowerCase().includes('zaten')) {
      this.error = 'Bu e-posta adresi zaten kayıtlı.';
    } else if (message.toLowerCase().includes('username') && message.toLowerCase().includes('zaten')) {
      this.error = 'Bu kullanıcı adı zaten alınmış.';
    } else if (message.toLowerCase().includes('zaten kullanılıyor')) {
      this.error = 'Girdiğiniz e-posta veya kullanıcı adı zaten kullanılıyor.';
    }
    else {
      this.error = 'Kayıt sırasında bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
    }
  }
}
