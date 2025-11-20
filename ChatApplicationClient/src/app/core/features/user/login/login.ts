import { Component, inject, OnInit } from '@angular/core'; // <<< OnInit eklendi
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user-service';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router'; // <<< ActivatedRoute eklendi

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
export class Login implements OnInit { // <<< OnInit implemente edildi
  email: string = '';
  password: string = '';
  error: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;
  
  private userService = inject(UserService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // <<< Aktif rotayı almak için eklendi

  // Harici giriş sonrası yönlendirmeyi kontrol eden metod
  ngOnInit(): void {
      this.route.queryParams.subscribe(params => {
          if (params['externalAuth'] === 'true') {
              // Harici girişten başarılı dönüldü, bekleme ekranını aç
              this.isLoading = true;
              this.error = 'Harici oturum doğrulanıyor...';
              
              // Backend'e gidip Cookie'yi kontrol et ve kullanıcı bilgisini çek
              this.userService.getUserInfo(true).subscribe({
                  next: (user) => {
                      localStorage.setItem('isAuthenticated', 'true');
                      this.isLoading = false;
                      this.error = '';
                      // Kullanıcı başarılı bir şekilde doğrulandı, chat'e yönlendir
                      this.router.navigate(['/chat']);
                  },
                  error: (err) => {
                      // Cookie yok veya geçersiz
                      this.isLoading = false;
                      localStorage.setItem('isAuthenticated', 'false');
                      this.error = 'Harici giriş başarısız oldu. Lütfen tekrar deneyin.';
                      // Parametreyi URL'den temizle
                      this.router.navigate(['/login'], { replaceUrl: true }); 
                  }
              });
          }
      });
  }


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