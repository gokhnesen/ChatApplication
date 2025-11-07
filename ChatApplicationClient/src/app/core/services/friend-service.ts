import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { UserService } from './user-service';
import { Friend } from '../shared/models/friend';

export interface PendingFriendRequest {
  friendshipId: string;
  senderId: string;
  senderName: string;
  senderLastName: string;
  senderEmail: string;
  requestDate: string;
  senderPhotoUrl: string | null; // yeni alan
}

@Injectable({
  providedIn: 'root'
})
export class FriendService {
    private apiUrl = 'https://localhost:7055/api';
    private httpClient = inject(HttpClient);
    private userService = inject(UserService);

    respondToFriendRequest(command: any): Observable<any> {
        return this.httpClient.post<any>(`${this.apiUrl}/friend/respond`, command, { withCredentials: true });
    }

    getMyFriends(): Observable<Friend[]> {
      return this.httpClient.get<Friend[]>(`${this.apiUrl}/friend/my-friends`, { withCredentials: true })
        .pipe(
          map((friends: Friend[]) => friends.map(f => ({
            ...f,
            profilePhotoUrl: f.profilePhotoUrl 
              ? `https://localhost:7055${f.profilePhotoUrl}` 
              : undefined
          })))
        );
    }

    getPendingRequests(): Observable<PendingFriendRequest[]> {
      return this.httpClient.get<PendingFriendRequest[]>(
        `${this.apiUrl}/friend/pending-requests`,
        { withCredentials: true }
      );
    }

    sendFriendRequest(target: { receiverId?: string; friendCode?: string }): Observable<any> {
      const url = `${this.apiUrl}/Friend/send-request`;
      const post = (senderId: string) => {
        const payload: any = { senderId };
        if (target.receiverId) payload.receiverId = target.receiverId;
        if (target.friendCode) payload.friendCode = target.friendCode;
        return this.httpClient.post(url, payload, { withCredentials: true });     
      };

      const me = this.userService.currentUser();
      if (me?.id) {
        return post(me.id);
      }
      return this.userService.getUserInfo().pipe(
        switchMap(u => post(u.id))
      );
    }
    respondToFriendRequestById(friendshipId: string, accept: boolean): Observable<any> {
      const me = this.userService.currentUser();
      const post = (receiverId: string) =>
        this.httpClient.post<any>(`${this.apiUrl}/friend/respond`, { friendshipId, receiverId, accept }, { withCredentials: true });

      if (me?.id) return post(me.id);
      return this.userService.getUserInfo().pipe(switchMap(u => post(u.id)));
    }
}
