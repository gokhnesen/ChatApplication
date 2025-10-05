import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user-service';
import { CommonModule } from '@angular/common';

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
  private userService = inject(UserService);

login() {
  this.userService.login({ email: this.email, password: this.password }).subscribe({
next: (res) => {
  localStorage.setItem('isAuthenticated', 'true');
  this.error = '';
  window.location.href = '/chat';
},
    error: (err) => {
      localStorage.setItem('isAuthenticated', 'false');
      this.error = 'Giriş başarısız!';
    }
  });
}
}
