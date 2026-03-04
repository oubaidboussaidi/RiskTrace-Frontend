import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService, AuthResponse, UserResponse } from './api.service';

export interface StoredUser {
    id: string;
    email: string;
    fullName: string;
    role: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // ----------------------------------------------------------------
    // Access token lives in MEMORY only (never localStorage/sessionStorage)
    // This protects against XSS reading the token.
    // ----------------------------------------------------------------
    private accessToken: string | null = null;

    private currentUserSubject: BehaviorSubject<StoredUser | null>;
    public currentUser: Observable<StoredUser | null>;

    constructor(
        private router: Router,
        private apiService: ApiService
    ) {
        // Restore non-sensitive user info (no token) from localStorage
        const storedUser = localStorage.getItem('user');
        this.currentUserSubject = new BehaviorSubject<StoredUser | null>(
            storedUser ? JSON.parse(storedUser) : null
        );
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): StoredUser | null {
        return this.currentUserSubject.value;
    }

    /** Called by the interceptor after a successful auto-refresh */
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
                // Store access token in memory
                this.accessToken = response.token;
                // Store only non-sensitive user profile in localStorage
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
        // Fire-and-forget: backend deletes the refresh token cookie
        this.apiService.logout().subscribe({
            next: () => console.log('Server session terminated'),
            error: (err) => console.error('Server logout failed (non-critical):', err)
        });

        // Clear all local state
        this.accessToken = null;
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
    }

    isAuthenticated(): boolean {
        // Access token is in memory; also check localStorage for user info
        // to handle the case where the app just loaded after a page refresh.
        return !!(this.accessToken || localStorage.getItem('user'));
    }

    getUserRole(): string | null {
        const user = this.currentUserValue;
        return user?.role ? user.role.toUpperCase() : null;
    }

    isAdmin(): boolean {
        return this.getUserRole() === 'ADMIN';
    }
}
