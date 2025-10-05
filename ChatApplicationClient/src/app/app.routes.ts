import { Routes } from '@angular/router';
import { Login } from './core/features/user/login/login';
import { Register } from './core/features/user/register/register';
import { Chat } from './core/features/chat/chat';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'chat', component: Chat, canActivate: [authGuard] },
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];
