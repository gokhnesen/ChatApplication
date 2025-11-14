import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user-service';
import { map, catchError, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const userService = inject(UserService);
  const router = inject(Router);

  if (typeof window === 'undefined' || !window.localStorage) {
    router.navigate(['/login']);
    return false;
  }

  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    router.navigate(['/login']);
    return false;
  }

  // CurrentUser varsa direkt geç
  const currentUser = userService.currentUser();
  if (currentUser && currentUser.id) {
    return true;
  }

  // CurrentUser yoksa backend'den al
  return userService.getUserInfo().pipe(
    map(user => {
      if (user && user.id) {
        return true;
      }
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('currentUser');
      router.navigate(['/login']);
      return false;
    }),
    catchError(() => {
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('currentUser');
      router.navigate(['/login']);
      return of(false);
    })
  );
};
