import { HttpClient } from '@angular/common/http';
import { Injectable, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, switchMap, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  currentUser = signal<any>(null);
  
  // ✅ Cache mekanizması
  private userInfoCache$?: Observable<User>;

  constructor(
    private httpClient: HttpClient,
    private router: Router
  ) {
    effect(() => {
      const user = this.currentUser();
    });
  }
  
  deleteAccount(userId: string): Observable<any> {
    const url = `${this.apiUrl}/User/delete-account`;
    const body = { userId };
    return this.httpClient.request<any>('delete', url, { body, withCredentials: true });
  }

  register(values: any) {
    return this.httpClient.post(this.apiUrl + '/user/register', values, { withCredentials: true });
  }

  getAuthStatus(): Observable<{ isAuthenticated: boolean }> {
    return this.httpClient.get<{ isAuthenticated: boolean }>(`${this.apiUrl}/auth-status`);
  }

  login(payload: { email?: string; userName?: string; password: string }) {
    const url = `${this.apiUrl}/login?useCookies=true&useSessionCookies=true`;
    return this.httpClient.post<any>(url, payload, { withCredentials: true }).pipe(
      switchMap(() => this.getUserInfo(true)), // ✅ Force refresh
      tap(() => localStorage.setItem('isAuthenticated', 'true')),
      catchError(err => {
        localStorage.removeItem('isAuthenticated');
        throw err;
      })
    );
  }

  getUserInfo(forceRefresh: boolean = false): Observable<User> {
    if (!forceRefresh && this.userInfoCache$) {
      return this.userInfoCache$;
    }

    this.userInfoCache$ = this.httpClient.get<User>(`${this.apiUrl}/User/user-info`, { withCredentials: true })
      .pipe(
        tap(u => {
          this.currentUser.set(u);
          localStorage.setItem('currentUser', JSON.stringify(u));
        }),
        shareReplay(1), 
        catchError(error => {
          this.userInfoCache$ = undefined;
          throw error;
        })
      );

    return this.userInfoCache$;
  }

  tryRestoreSession(): Observable<User | null> {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuth) {
      return of(null);
    }

    return this.getUserInfo().pipe(
      catchError(() => {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
        return of(null);
      })
    );
  }

  logout() {
    this.currentUser.set(null);
    this.userInfoCache$ = undefined; // ✅ Cache'i temizle
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('lastSelectedFriendId');
    }
    
    return this.httpClient.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      catchError(error => {
        console.error('Logout error:', error);
        return of(null);
      })
    );
  }

  uploadProfilePhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.httpClient.post(`${this.apiUrl}/user/upload-profile-photo`, formData, { withCredentials: true });
  }

  searchUsers(searchTerm: string): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/User/list?searchTerm=${searchTerm}`);
  }

  updateProfile(data: { userId: string; name: string; lastName: string; profilePhotoUrl?: string }): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/User/update-profile`, data, { withCredentials: true })
      .pipe(
        tap(res => {
          if (res?.isSuccess !== false) {
            this.getUserInfo(true).subscribe(); // ✅ Force refresh
          }
        })
      );
  }

  getBlockedUsers(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/User/list?onlyBlocked=true`, { withCredentials: true });
  }

  externalLogin(provider: 'Google' | 'Microsoft') {
  const returnUrl = `${window.location.origin}/login-callback`; 
  window.location.href = `${this.apiUrl}/User/external-login?provider=${provider}&returnUrl=${returnUrl}`;
}

  changePassword(payload: { userId?: string; currentPassword: string; newPassword: string }) {
    return this.httpClient.post<any>(`${this.apiUrl}/User/change-password`, payload, { withCredentials: true });
  }

}
