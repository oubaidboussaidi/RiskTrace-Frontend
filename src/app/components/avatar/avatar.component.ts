import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarService } from '../../services/avatar.service';
import { Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';


/**
 * Reusable avatar component.
 *
 * Usage (display only):
 *   <app-avatar [name]="user.fullName" [imageUrl]="user.profileImageUrl" [size]="40"></app-avatar>
 *
 * Usage (with upload button — e.g. Settings page):
 *   <app-avatar [name]="user.fullName" [imageUrl]="user.profileImageUrl"
 *               [size]="80" [editable]="true" [entityId]="user.id" entityType="user"
 *               (avatarChanged)="onAvatarChanged($event)"></app-avatar>
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="avatar-wrapper" [style.width.px]="size" [style.height.px]="size"
         [class.editable]="editable" (click)="editable && triggerUpload()">

      <!-- Image mode -->
      <img *ngIf="resolvedUrl" [src]="resolvedUrl" class="avatar-img"
           [style.width.px]="size" [style.height.px]="size"
           [style.font-size.px]="size * 0.38"
           alt="avatar" (error)="onImgError()" />

      <!-- Initials fallback -->
      <div *ngIf="!resolvedUrl" class="avatar-initials"
           [style.width.px]="size" [style.height.px]="size"
           [style.font-size.px]="size * 0.38"
           [style.background]="bgColor">
        {{ initials }}
      </div>

      <!-- Hover overlay for editable -->
      <div *ngIf="editable" class="avatar-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size * 0.35" [attr.height]="size * 0.35"
             viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>

      <!-- Hidden file input -->
      <input *ngIf="editable" #fileInput type="file" accept="image/*"
             style="display:none" (change)="onFileSelected($event)" />

      <!-- Uploading spinner -->
      <div *ngIf="isUploading" class="avatar-uploading">
        <div class="avatar-spinner"></div>
      </div>
    </div>

    <!-- Remove button (shown below if editable and has image) -->
    <button *ngIf="editable && resolvedUrl && !isUploading"
            class="avatar-remove-btn" (click)="removeImage($event)"
            title="Remove image">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
      {{ 'COMMON.REMOVE' | translate }}
    </button>
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .avatar-wrapper {
      position: relative;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar-wrapper.editable {
      cursor: pointer;
    }
    .avatar-img {
      object-fit: cover;
      border-radius: 50%;
      display: block;
    }
    .avatar-initials {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      user-select: none;
    }
    .avatar-overlay {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .avatar-wrapper.editable:hover .avatar-overlay {
      opacity: 1;
    }
    .avatar-uploading {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(0,0,0,0.55);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-spinner {
      width: 22px;
      height: 22px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .avatar-remove-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(248, 81, 73, 0.05);
      border: 1px solid rgba(248, 81, 73, 0.15);
      color: #f85149;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 8px;
      white-space: nowrap;
    }
    .avatar-remove-btn:hover {
      background: rgba(248, 81, 73, 0.12);
      border-color: #f85149;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(248, 81, 73, 0.15);
    }
    .avatar-remove-btn svg {
      opacity: 0.9;
    }
  `]
})
export class AvatarComponent implements OnInit, OnDestroy, OnChanges {
  /** Display name — used for initials and background color */
  @Input() name: string = '';

  /** External URL or Base64 data URI. If provided and valid, shown instead of initials. */
  @Input() imageUrl: string | null | undefined = null;

  /** Avatar diameter in pixels */
  @Input() size: number = 40;

  /** Whether to show upload UI on hover */
  @Input() editable: boolean = false;

  /** ID of the user or org this avatar belongs to (needed for cache & notifications) */
  @Input() entityId: string = '';

  /** 'user' or 'org' */
  @Input() entityType: 'user' | 'org' = 'user';

  /** Emits the new data URI when image is uploaded, or null when removed */
  @Output() avatarChanged = new EventEmitter<string | null>();

  resolvedUrl: string | null = null;
  initials: string = '?';
  bgColor: string = '#6366f1';
  isUploading: boolean = false;

  private sub?: Subscription;

  private static AVATAR_COLORS = [
    '#6366f1','#a855f7','#ec4899','#14b8a6','#0ea5e9','#f59e0b','#10b981','#3b82f6'
  ];

  constructor(private avatarService: AvatarService) {}

  ngOnInit() {
    this.refresh();
    // Subscribe to global avatar change events
    this.sub = this.avatarService.avatarChange$.subscribe(ev => {
      if (ev.id === this.entityId && ev.type === this.entityType) {
        this.resolvedUrl = ev.url || null;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['name'] || changes['imageUrl'] || changes['entityId']) {
      this.refresh();
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private refresh() {
    this.initials = this.getInitials(this.name);
    this.bgColor = this.colorFor(this.name);

    // Priority: prop > cache > null
    if (this.imageUrl) {
      this.resolvedUrl = this.imageUrl;
    } else if (this.entityId) {
      const cached = this.entityType === 'user'
        ? this.avatarService.getCachedUserAvatar(this.entityId)
        : this.avatarService.getCachedOrgLogo(this.entityId);
      this.resolvedUrl = cached || null;
    } else {
      this.resolvedUrl = null;
    }
  }

  onImgError() {
    this.resolvedUrl = null;
  }

  triggerUpload() {
    // Find the hidden file input in this component's host
    const input = document.querySelector(`app-avatar[data-id="${this.entityId}"] input[type="file"]`) as HTMLInputElement;
    if (input) {
      input.click();
    } else {
      // Fallback: create a temporary file input
      const tmp = document.createElement('input');
      tmp.type = 'file';
      tmp.accept = 'image/*';
      tmp.onchange = (e: any) => this.onFileSelected(e);
      tmp.click();
    }
  }

  async onFileSelected(event: any) {
    const file: File = event.target?.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    this.isUploading = true;
    try {
      const dataUrl = await this.avatarService.readFileAsDataUrl(file);
      this.upload(dataUrl);
    } catch {
      alert('Failed to read image file');
      this.isUploading = false;
    }
  }

  private upload(dataUrl: string) {
    const req = this.entityType === 'user'
      ? this.avatarService.uploadUserAvatar(dataUrl)
      : this.avatarService.uploadOrgLogo(this.entityId, dataUrl);

    req.subscribe({
      next: () => {
        this.resolvedUrl = dataUrl;
        if (this.entityType === 'user') {
          this.avatarService.notifyUserAvatarChange(this.entityId, dataUrl);
        } else {
          this.avatarService.notifyOrgLogoChange(this.entityId, dataUrl);
        }
        this.avatarChanged.emit(dataUrl);
        this.isUploading = false;
      },
      error: (err) => {
        alert(err?.error?.message || 'Failed to upload image');
        this.isUploading = false;
      }
    });
  }

  removeImage(event: MouseEvent) {
    event.stopPropagation();
    const req = this.entityType === 'user'
      ? this.avatarService.removeUserAvatar()
      : this.avatarService.removeOrgLogo(this.entityId);

    req.subscribe({
      next: () => {
        this.resolvedUrl = null;
        if (this.entityType === 'user') {
          this.avatarService.notifyUserAvatarChange(this.entityId, null);
        } else {
          this.avatarService.notifyOrgLogoChange(this.entityId, null);
        }
        this.avatarChanged.emit(null);
      },
      error: (err) => alert(err?.error?.message || 'Failed to remove image')
    });
  }

  private getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  private colorFor(name: string): string {
    if (!name) return AvatarComponent.AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AvatarComponent.AVATAR_COLORS[Math.abs(hash) % AvatarComponent.AVATAR_COLORS.length];
  }
}
