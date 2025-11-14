import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../../services/user-service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="callback-loading">
      <div class="spinner"></div>
      <p>Giriş yapılıyor...</p>
    </div>
  `,
  styles: [`
    .callback-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallback implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);

  ngOnInit() {
    // ✅ URL'den token'ı al
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const error = params['error'];

      if (error) {
        alert('Giriş başarısız: ' + error);
        this.router.navigate(['/login']);
        return;
      }

      if (token) {
        // ✅ Token'ı kaydet
        localStorage.setItem('authToken', token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // ✅ Kullanıcı bilgisini çek
        this.userService.getUserInfo().subscribe({
          next: (userInfo) => {
            // ✅ Chat'e yönlendir
            this.router.navigate(['/chat']);
          },
          error: (error) => {
            console.error('Kullanıcı bilgisi alınamadı:', error);
            this.router.navigate(['/login']);
          }
        });
      } else {
        this.router.navigate(['/login']);
      }
    });
  }
}