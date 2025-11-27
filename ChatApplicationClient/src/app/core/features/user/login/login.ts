import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs/operators';
import { UserService } from '../../../services/user-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, 
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  error: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });
  
  get f() {
    return this.loginForm.controls;
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (params['externalAuth'] === 'true') {
        this.isLoading = true;
        this.error = 'Harici oturum doğrulanıyor...';

        this.userService.getUserInfo(true).pipe(take(1)).subscribe({
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

  login() {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) {
      this.error = 'Lütfen hata mesajlarını kontrol edin.';
      return;
    }

    this.isLoading = true;
    this.error = '';
    
    const { email, password } = this.loginForm.value;

    this.userService.login({ 
      email: email as string, 
      password: password as string 
    }).subscribe({
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