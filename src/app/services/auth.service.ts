import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService, AuthResponse, UserResponse } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject: BehaviorSubject<AuthResponse | null>;
    public currentUser: Observable<AuthResponse | null>;

    constructor(
        private router: Router,
        private apiService: ApiService
    ) {
        const storedUser = localStorage.getItem('user');
        this.currentUserSubject = new BehaviorSubject<AuthResponse | null>(
            storedUser ? JSON.parse(storedUser) : null
        );
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): AuthResponse | null {
        return this.currentUserSubject.value;
    }

    login(email: string, password: string): Observable<AuthResponse> {
        return this.apiService.login({ email, password }).pipe(
            tap(response => {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response));
                this.currentUserSubject.next(response);
            })
        );
    }

    register(name: string, email: string, password: string): Observable<UserResponse> {
        // Register no longer auto-logins.
        return this.apiService.register({ fullName: name, email, password });
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
    }

    isAuthenticated(): boolean {
        // Simple check for token existence. 
        // Ideally should check expiration but this suffices for basic auth guard.
        return !!localStorage.getItem('token');
    }

    getToken(): string | null {
        return localStorage.getItem('token');
    }

    getUserRole(): string | null {
        const user = this.currentUserValue;
        return user && user.role ? user.role.toUpperCase() : null;
    }

    isAdmin(): boolean {
        const role = this.getUserRole();
        return role === 'ADMIN';
    }
}
