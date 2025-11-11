import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user-service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
export class Login {
  email: string = '';
  password: string = '';
  error: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  
  private userService = inject(UserService);
  private router = inject(Router);

  login() {
    if (!this.email || !this.password) {
      this.error = 'Lütfen tüm alanları doldurun';
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

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
