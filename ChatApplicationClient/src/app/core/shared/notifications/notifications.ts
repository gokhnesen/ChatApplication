import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification-service';
import { Notification } from '../../shared/models/notification';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class Notifications {
  notifications = signal<Notification[]>([]);
  constructor(private notificationService: NotificationService) {
    this.notificationService.notifications.subscribe(list => this.notifications.set(list));
  }

  remove(id: string) {
    this.notificationService.remove(id);
  }

  confirm(n: any) {
    if (n.action) n.action();
    this.remove(n.id);
  }
}
