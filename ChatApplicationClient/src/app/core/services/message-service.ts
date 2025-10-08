import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Message } from '../shared/models/message';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'https://localhost:7055/api';
  private httpClient = inject(HttpClient);

  sendMessage(command: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/message`, command);
  }

  getMessages(userId1: string, userId2: string): Observable<Message[]> {
    return this.httpClient.get<Message[]>(`${this.apiUrl}/message/${userId1}/${userId2}`);
  }
}
