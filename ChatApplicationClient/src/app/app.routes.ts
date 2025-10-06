import { Routes } from '@angular/router';
import { Login } from './core/features/user/login/login';
import { Register } from './core/features/user/register/register';
import { Chat } from './core/features/chat/chat';
import { authGuard } from './core/guards/auth-guard';
import { Main } from './core/layout/main/main';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    {
        path: 'chat',
        component: Main, 
        canActivate: [authGuard],
        children: [
            {
                path: ':id',
                component: Chat, // Ana Main içinde Chat gösterilecek
                canActivate: [authGuard]
            },
            {
                path: '',
                redirectTo: '/chat/default', 
                pathMatch: 'full'
            }
        ]
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];
