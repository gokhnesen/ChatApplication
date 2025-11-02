import { User } from "./user";

export type Friend = {
    id: string;
    senderId: string;
    sender?: User;
    receiverId: string;
    receiver?: User;
    status: FriendStatus;
    requestDate: Date;
    acceptedDate?: Date;
    name: string;
    lastName: string;
    email: string;
    userName: string;
    avatarUrl?: string;
    unreadMessageCount?: number;
};

export enum FriendStatus {
    Beklemede = 'Beklemede',
    Onaylandi = 'Onaylandi',
    Rededildi = 'Rededildi',
    Engellendi = 'Engellendi'
}

export interface LastMessage {
  content: string;
  sentAt: Date;
  isRead: boolean;
  senderId: string;
}

