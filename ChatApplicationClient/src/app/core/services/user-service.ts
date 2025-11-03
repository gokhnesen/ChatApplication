import { HttpClient } from '@angular/common/http';
import { Injectable, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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

  login(values: any) {
    return this.httpClient.post<User>(this.apiUrl + '/login', values, { withCredentials: true }).pipe(
      tap(user => {
        this.currentUser.set(user);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(user));
        }
      })
    );
  }

  getUserInfo() {
    return this.httpClient.get<User>(this.apiUrl + '/user/user-info', { withCredentials: true }).pipe(
      map(user => {
        this.currentUser.set(user);
        if (typeof window !== 'undefined') {
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

    return this.httpClient.post(`${this.apiUrl}/user/upload-profile-photo`, formData);
  }

  searchUsers(searchTerm: string): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/User/list?searchTerm=${searchTerm}`);
  }
}
