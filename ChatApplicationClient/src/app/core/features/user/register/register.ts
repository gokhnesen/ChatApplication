import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user-service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  name: string = '';
  lastName: string = '';
  email: string = '';
  password: string = '';
  error: string = '';
  private userService =  inject(UserService);



register() {
  this.userService.register({ email: this.email, password: this.password, name: this.name, lastName: this.lastName }).subscribe({
    next: (res: any) => {
      if (res.isSuccess) {
        localStorage.setItem('isAuthenticated', 'true');
        alert('Kayıt başarılı!');
        this.error = '';
        // chat ekranına yönlendirme
      } else {
        localStorage.setItem('isAuthenticated', 'false');
        this.error = res.message || 'Kayıt başarısız!';
      }
    },
    error: (err) => {
      localStorage.setItem('isAuthenticated', 'false');
      this.error = 'Kayıt başarısız!';
    }
  });
}
}
