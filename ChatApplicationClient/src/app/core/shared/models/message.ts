export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
  readAt?: Date;
  hasMessage?: boolean;
  
  type: MessageType;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  attachmentDuration?: number | null;
}

export enum MessageType {
  Text = 0,
  Image = 1,
  File = 2,
  Video = 3
}

export interface MessageUpdate {
  friendId: string;
  content: string;
  senderId: string;
  receiverId: string;
  sentAt: Date;
  isOwn: boolean;
  type?: MessageType; // ✅ EKLE
  attachmentUrl?: string | null; // ✅ EKLE
  attachmentName?: string | null; // ✅ EKLE
}