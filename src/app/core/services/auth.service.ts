import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService, AuthResponse, UserResponse } from './api.service';
import { OrganizationService } from './organization.service';

export interface StoredUser {
    id: string;
    email: string;
    fullName: string;
    role: string;
    profileImageUrl?: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private accessToken: string | null = null;

    private currentUserSubject: BehaviorSubject<StoredUser | null>;
    public currentUser: Observable<StoredUser | null>;

    constructor(
        private router: Router,
        private apiService: ApiService,
        private orgService: OrganizationService
    ) {

        const storedUser = localStorage.getItem('user');
        this.currentUserSubject = new BehaviorSubject<StoredUser | null>(
            storedUser ? JSON.parse(storedUser) : null
        );
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): StoredUser | null {
        return this.currentUserSubject.value;
    }

    setAccessToken(token: string): void {
        this.accessToken = token;
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    getToken(): string | null {
        return this.accessToken;
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.apiService.login({ email, password }).pipe(
            tap(response => {
                if (response.mfaRequired) return;

                this.accessToken = response.token;

                const user: StoredUser = {
                    id: response.id,
                    email: response.email,
                    fullName: response.fullName,
                    role: response.role
                };
                localStorage.setItem('user', JSON.stringify(user));
                this.currentUserSubject.next(user);
            })
        );
    }

    verify2fa(mfaToken: string, code: string): Observable<AuthResponse> {
        return this.apiService.verify2fa({ mfaToken, code }).pipe(
            tap(response => {
                this.accessToken = response.token;
                const user: StoredUser = {
                    id: response.id,
                    email: response.email,
                    fullName: response.fullName,
                    role: response.role
                };
                localStorage.setItem('user', JSON.stringify(user));
                this.currentUserSubject.next(user);
            })
        );
    }

    register(name: string, email: string, password: string): Observable<UserResponse> {
        return this.apiService.register({ fullName: name, email, password });
    }

    updateCurrentUser(updatedFields: Partial<StoredUser>): void {
        const current = this.currentUserSubject.value;
        if (current) {
            const merged = { ...current, ...updatedFields };
            localStorage.setItem('user', JSON.stringify(merged));
            this.currentUserSubject.next(merged);
        }
    }

    logout(): void {

        this.apiService.logout().subscribe({
            next: () => console.log('Server session terminated'),
            error: (err) => console.error('Server logout failed (non-critical):', err)
        });

        this.accessToken = null;
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);

        this.orgService.clearOrg();

        this.redirect('/auth/login');
    }

    protected redirect(url: string): void {
        window.location.href = url;
    }

    isAuthenticated(): boolean {

        return !!this.accessToken;
    }

    getUserRole(): string | null {
        const user = this.currentUserValue;
        return user?.role ? user.role.toUpperCase() : null;
    }

    isAdmin(): boolean {
        return this.getUserRole() === 'ADMIN';
    }

    isPlatformAdmin(): boolean {
        return this.getUserRole() === 'PLATFORM_ADMIN';
    }

    hasRole(role: string): boolean {
        return this.getUserRole() === role.toUpperCase();
    }
}
