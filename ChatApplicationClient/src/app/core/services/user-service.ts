import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../shared/models/user';



@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://localhost:7055/api/';
  private http = inject(HttpClient);
  currentUser = signal<User | null>(null);


  register(values: any) {
    return this.http.post(this.apiUrl + 'user/register', values,{withCredentials:true});
  }

  getAuthStatus(): Observable<{ isAuthenticated: boolean }> {
    return this.http.get<{ isAuthenticated: boolean }>(`${this.apiUrl}auth-status`);
  }

  login(values: any) {
    const params = new HttpParams().append('useCookies', true);
    return this.http.post<User>(this.apiUrl + 'login', values, { params, withCredentials: true }).pipe(
      tap(user => this.currentUser.set(user))
      
    );
  }
}
