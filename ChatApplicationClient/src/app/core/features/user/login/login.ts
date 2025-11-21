import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user-service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  email: string = '';
  password: string = '';
  error: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  // validation messages
  emailError: string = '';
  passwordError: string = '';

  // touch/submit flags
  emailTouched = false;
  passwordTouched = false;
  attemptedLogin = false;

  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    // mevcut init...
    this.route.queryParams.subscribe(params => {
      if (params['externalAuth'] === 'true') {
        this.isLoading = true;
        this.error = 'Harici oturum doğrulanıyor...';
        this.userService.getUserInfo(true).subscribe({
          next: (user) => {
            localStorage.setItem('isAuthenticated', 'true');
            this.isLoading = false;
            this.error = '';
            this.router.navigate(['/chat']);
          },
          error: (err) => {
            this.isLoading = false;
            localStorage.setItem('isAuthenticated', 'false');
            this.error = 'Harici giriş başarısız oldu. Lütfen tekrar deneyin.';
            this.router.navigate(['/login'], { replaceUrl: true }); 
          }
        });
      }
    });
  }

  private validateEmailFormat(email: string): boolean {
    if (!email) return false;
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email.toLowerCase());
  }

  canSubmit(): boolean {
    this.emailError = '';
    this.passwordError = '';

    if (!this.validateEmailFormat(this.email)) {
      this.emailError = 'Geçerli bir email girin.';
    }
    if (!this.password || this.password.trim().length < 6) {
      this.passwordError = 'Şifre en az 6 karakter olmalı.';
    }

    return !this.emailError && !this.passwordError;
  }

  login() {
    this.attemptedLogin = true;

    if (!this.canSubmit()) {
      this.error = 'Lütfen hata mesajlarını kontrol edin.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.userService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        localStorage.setItem('isAuthenticated', 'true');
        this.error = '';
        this.isLoading = false;
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        localStorage.setItem('isAuthenticated', 'false');
        this.error = err?.error?.message || 'Email veya şifre hatalı!';
        this.isLoading = false;
      }
    });
  }

  onExternalLogin(provider: 'Google' | 'Microsoft') {
    this.isLoading = true;
    this.userService.externalLogin(provider);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}