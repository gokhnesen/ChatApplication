import { HttpClient } from '@angular/common/http';
import { Injectable, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { User } from '../shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://localhost:7055/api';
  currentUser = signal<any>(null);

  constructor(
    private httpClient: HttpClient,
    private router: Router
  ) {
    effect(() => {
      const user = this.currentUser();
    });
  }

  register(values: any) {
    return this.httpClient.post(this.apiUrl + '/user/register', values, { withCredentials: true });
  }

  getAuthStatus(): Observable<{ isAuthenticated: boolean }> {
    return this.httpClient.get<{ isAuthenticated: boolean }>(`${this.apiUrl}/auth-status`);
  }

  login(payload: { email?: string; userName?: string; password: string }) {
    // Cookie-based login endpoint
    const url = `${this.apiUrl}/login?useCookies=true&useSessionCookies=true`;
    return this.httpClient.post<any>(url, payload, { withCredentials: true }).pipe(
      // Cookie is set by server. Then load the user.
      switchMap(() => this.getUserInfo()),
      tap(() => localStorage.setItem('isAuthenticated', 'true')),
      catchError(err => {
        localStorage.removeItem('isAuthenticated');
        throw err;
      })
    );
  }

  getUserInfo() {
    return this.httpClient.get<User>('https://localhost:7055/api/User/user-info', { withCredentials: true })
      .pipe(tap(u => {
        this.currentUser.set(u);
        localStorage.setItem('currentUser', JSON.stringify(u));
      }));
  }

  // Optionally call this on app start to restore session from cookie
  tryRestoreSession() {
    return this.getUserInfo().pipe(
      catchError(() => of(null))
    ).subscribe();
  }

  logout() {
    this.currentUser.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
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

  getProfilePhotoUrlByUserId(userId: string): string {
    return `${this.apiUrl}/user/profile-photo/${userId}`;
  }

  updateProfile(data: { userId: string; name: string; lastName: string; profilePhotoUrl?: string }): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/User/update-profile`, data, { withCredentials: true })
      .pipe(
        tap(res => {
          if (res?.isSuccess !== false) {
            this.getUserInfo().subscribe();
          }
        })
      );
  }
}
