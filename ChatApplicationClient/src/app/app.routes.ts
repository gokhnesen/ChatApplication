import { Routes } from '@angular/router';
import { Login } from './core/features/user/login/login';
import { Register } from './core/features/user/register/register';
import { Chat } from './core/features/chat/chat';
import { authGuard } from './core/guards/auth-guard';
import { Main } from './core/layout/main/main';
import { AddFriends } from './core/features/add-friends/add-friends';
import { Settings } from './core/features/settings/settings';

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
                component: Chat,
                canActivate: [authGuard]
            },
            {
                path: '',
                redirectTo: '/chat/default', 
                pathMatch: 'full'
            }
        ]
    },
    {
        path: 'add-friends',
        component: Main,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                component: AddFriends,
                children: [
                    {
                        path: ':id',
                        component: Chat
                    }
                ]
            }
        ]
    },
    {
        path: 'settings',
        component: Main,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                component: Settings
            }
        ]
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];
