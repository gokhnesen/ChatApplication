import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProfilePhotoPipe } from "../../../pipes/profile-photo.pipe";

@Component({
  selector: 'app-friend-request',
  standalone: true,
  templateUrl: './friend-request.html',
  styleUrls: ['./friend-request.scss'],
  imports: [CommonModule, ProfilePhotoPipe]
})
export class FriendRequest {
  @Input() pendingRequests: any[] = [];
  @Input() requestsLoading: boolean = false;
  @Input() requestsError: string | null = null;
  @Input() processingRequests: Set<string> = new Set<string>(); // ✅ Set olarak değiştir

  @Output() respondToRequest = new EventEmitter<{ request: any; accept: boolean }>();
  @Output() close = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  trackByRequest(_: number, r: any): string {
    return r.friendshipId;
  }

  onAvatarError(evt: Event): void {
    const img = evt.target as HTMLImageElement;
    img.src = 'assets/default-avatar.png';
  }

  // ✅ Direkt Set üzerinden kontrol et
  isProcessing(id: string): boolean {
    return this.processingRequests.has(id);
  }
}
