import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, tap, catchError } from 'rxjs';
import { User } from '../shared/models/user';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://localhost:7055/api/';
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  currentUser = signal<User | null>(null);

  constructor() {
    if (this.isBrowser()) {
      // Sayfa yüklendiğinde kullanıcı bilgilerini kontrol et
      this.checkCurrentUser();
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // LocalStorage'da veya signal'de kullanıcı var mı kontrol et, yoksa API'den al
  private checkCurrentUser(): void {
    if (this.currentUser()) return; // Zaten yüklüyse işlem yapma

    if (this.isBrowser()) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          this.currentUser.set(user);
          console.log('User loaded from localStorage:', user);
        } catch (error) {
          console.error('Error parsing stored user', error);
          localStorage.removeItem('currentUser');
          this.getUserInfo().subscribe(); // Hata durumunda API'den tekrar al
        }
      } else {
        // LocalStorage'da yoksa API'den kontrol et
        this.getUserInfo().subscribe();
      }
    }
  }

  register(values: any) {
    return this.http.post(this.apiUrl + 'user/register', values, {withCredentials:true});
  }

  getAuthStatus(): Observable<{ isAuthenticated: boolean }> {
    return this.http.get<{ isAuthenticated: boolean }>(`${this.apiUrl}auth-status`);
  }

  login(values: any) {
    const params = new HttpParams().append('useCookies', true);
    return this.http.post<User>(this.apiUrl + 'login', values, { params, withCredentials: true }).pipe(
      tap(user => {
        this.currentUser.set(user);
        if (this.isBrowser()) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      })
    );
  }

  getUserInfo() {
    return this.http.get<User>(this.apiUrl + 'user/user-info', { withCredentials: true }).pipe(
      map(user => {
        this.currentUser.set(user);
        if (this.isBrowser()) {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
        return user;
      }),
      catchError(error => {
        console.error('Error fetching user info:', error);
        return of(null);
      })
    );
  }

 

  logout() {
    this.currentUser.set(null);
    if (this.isBrowser()) {
      localStorage.removeItem('currentUser');
    }
    return this.http.post(`${this.apiUrl}logout`, {}, {withCredentials: true}).pipe(
      catchError(error => {
        console.error('Logout error:', error);
        return of(null);
      })
    );
  }
}
