import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AvatarCache {
  [key: string]: string | null; // key: userId or orgId, value: dataUrl or null
}

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private apiUrl = environment.apiUrl;

  /** Reactive stream so all components re-render when an avatar changes */
  private avatarUpdated$ = new BehaviorSubject<{ type: 'user' | 'org'; id: string; url: string | null }>({
    type: 'user', id: '', url: null
  });

  public avatarChange$ = this.avatarUpdated$.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  // ────────────────────────────────────────────────────
  // User Avatar
  // ────────────────────────────────────────────────────

  /** Upload a new user avatar. Returns the updated UserResponse. */
  uploadUserAvatar(imageDataUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/avatar`, { imageDataUrl }, { headers: this.getHeaders() });
  }

  /** Remove the user's avatar. Returns the updated UserResponse. */
  removeUserAvatar(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profile/avatar`, { headers: this.getHeaders() });
  }

  /** Notify all components that the current user's avatar changed */
  notifyUserAvatarChange(userId: string, url: string | null): void {
    this.avatarUpdated$.next({ type: 'user', id: userId, url });
    // Also update localStorage cache so avatars persist across page refreshes
    if (url) {
      localStorage.setItem(`avatar_user_${userId}`, url);
    } else {
      localStorage.removeItem(`avatar_user_${userId}`);
    }
  }

  /** Get a cached user avatar from localStorage */
  getCachedUserAvatar(userId: string): string | null {
    return localStorage.getItem(`avatar_user_${userId}`);
  }

  // ────────────────────────────────────────────────────
  // Org Logo
  // ────────────────────────────────────────────────────

  /** Upload an organization logo */
  uploadOrgLogo(orgId: string, imageDataUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/organizations/${orgId}/logo`, { imageDataUrl }, { headers: this.getHeaders() });
  }

  /** Remove an org's logo */
  removeOrgLogo(orgId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizations/${orgId}/logo`, { headers: this.getHeaders() });
  }

  /** Notify all components that an org's logo changed */
  notifyOrgLogoChange(orgId: string, url: string | null): void {
    this.avatarUpdated$.next({ type: 'org', id: orgId, url });
    if (url) {
      localStorage.setItem(`logo_org_${orgId}`, url);
    } else {
      localStorage.removeItem(`logo_org_${orgId}`);
    }
  }

  /** Get a cached org logo from localStorage */
  getCachedOrgLogo(orgId: string): string | null {
    return localStorage.getItem(`logo_org_${orgId}`);
  }

  // ────────────────────────────────────────────────────
  // Utility: Read a File as Base64 data URI
  // ────────────────────────────────────────────────────
  readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
