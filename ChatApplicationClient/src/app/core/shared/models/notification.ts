export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'confirm';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number; 
}