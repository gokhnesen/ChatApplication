import { Routes } from '@angular/router';
import { Login } from './core/features/user/login/login';
import { Register } from './core/features/user/register/register';
import { Chat } from './core/features/chat/chat';
import { authGuard } from './core/guards/auth-guard';
import { Main } from './core/layout/main/main';
import { AddFriends } from './core/features/add-friends/add-friends';
import { EditUser } from './core/features/edit-user/edit-user';

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
                component: AddFriends
            },
            {
                path: ':id',
                component: Chat
            }
        ]
    },
    {
        path: 'edit-profile',
        component: Main,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                component: EditUser
            }
        ]
    },
    { path: '', redirectTo: '/login', pathMatch: 'full' }
];
