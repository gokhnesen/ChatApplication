export type Message = {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    sentAt: Date;
    isRead: boolean;
}