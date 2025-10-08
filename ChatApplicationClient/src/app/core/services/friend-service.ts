import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Friend } from '../shared/models/friend';

@Injectable({
  providedIn: 'root'
})
export class FriendService {
    private apiUrl = 'https://localhost:7055/api';
    private httpClient = inject(HttpClient);

    sendFriendRequest(command: any): Observable<any> {
        return this.httpClient.post<any>(`${this.apiUrl}/friend/send-request`, command);
    }

    respondToFriendRequest(command: any): Observable<any> {
        return this.httpClient.post<any>(`${this.apiUrl}/friend/respond`, command);
    }

    getMyFriends(): Observable<Friend[]> {
        return this.httpClient.get<Friend[]>(`${this.apiUrl}/friend/my-friends`);
    }

    getPendingRequests(): Observable<Friend[]> {
        return this.httpClient.get<Friend[]>(`${this.apiUrl}/friend/pending-requests`);
    }
}
