import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Notification, NotificationType } from '../shared/models/notification';

export interface ConfirmNotification extends Notification {
  action?: () => void;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = new Subject<ConfirmNotification[]>();
  private notificationsList: ConfirmNotification[] = [];

  get notifications() {
    return this._notifications.asObservable();
  }

  show(
    message: string,
    type: NotificationType = 'info',
    options?: { duration?: number; action?: () => void }
  ) {
    if (type === 'confirm') {
      this.notificationsList = this.notificationsList.filter(n => n.type !== 'confirm');
    }
    const id = Math.random().toString(36).substring(2, 10);
    const notification: ConfirmNotification = {
      id,
      message,
      type,
      duration: options?.duration ?? (type === 'confirm' ? undefined : 2000),
      ...(type === 'confirm' && options?.action ? { action: options.action } : {})
    };
    this.notificationsList.push(notification);
    this._notifications.next([...this.notificationsList]);
    if (type !== 'confirm') {
      setTimeout(() => this.remove(id), notification.duration);
    }
    return id;
  }

  remove(id: string) {
    this.notificationsList = this.notificationsList.filter(n => n.id !== id);
    this._notifications.next([...this.notificationsList]);
  }
}
