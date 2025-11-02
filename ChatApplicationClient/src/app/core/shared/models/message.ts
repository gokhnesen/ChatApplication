export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
  readAt?: Date;
  hasMessage?: boolean;
}

export interface MessageUpdate {
  friendId: string;
  content: string;
  senderId: string;
  receiverId: string;
  sentAt: Date;
  isOwn: boolean;
}