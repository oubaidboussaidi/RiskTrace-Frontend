import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AvatarCache {
  [key: string]: string | null; 
}

@Injectable({
  providedIn: 'root'
})
export class AvatarService {
  private apiUrl = environment.apiUrl;

  private avatarUpdated$ = new BehaviorSubject<{ type: 'user' | 'org'; id: string; url: string | null }>({
    type: 'user', id: '', url: null
  });

  public avatarChange$ = this.avatarUpdated$.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  uploadUserAvatar(imageDataUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/avatar`, { imageDataUrl }, { headers: this.getHeaders() });
  }

  removeUserAvatar(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profile/avatar`, { headers: this.getHeaders() });
  }

  notifyUserAvatarChange(userId: string, url: string | null): void {
    this.avatarUpdated$.next({ type: 'user', id: userId, url });

    if (url) {
      localStorage.setItem(`avatar_user_${userId}`, url);
    } else {
      localStorage.removeItem(`avatar_user_${userId}`);
    }
  }

  getCachedUserAvatar(userId: string): string | null {
    return localStorage.getItem(`avatar_user_${userId}`);
  }

  uploadOrgLogo(orgId: string, imageDataUrl: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/organizations/${orgId}/logo`, { imageDataUrl }, { headers: this.getHeaders() });
  }

  removeOrgLogo(orgId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizations/${orgId}/logo`, { headers: this.getHeaders() });
  }

  notifyOrgLogoChange(orgId: string, url: string | null): void {
    this.avatarUpdated$.next({ type: 'org', id: orgId, url });
    if (url) {
      localStorage.setItem(`logo_org_${orgId}`, url);
    } else {
      localStorage.removeItem(`logo_org_${orgId}`);
    }
  }

  getCachedOrgLogo(orgId: string): string | null {
    return localStorage.getItem(`logo_org_${orgId}`);
  }

  readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
