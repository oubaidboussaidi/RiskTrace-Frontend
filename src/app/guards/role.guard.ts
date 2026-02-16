import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class RoleGuard implements CanActivate {
    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    canActivate(route: ActivatedRouteSnapshot): boolean {
        const expectedRole = route.data['expectedRole'];
        const userRole = this.authService.getUserRole();

        if (this.authService.isAuthenticated() && userRole === expectedRole) {
            return true;
        }

        // Not authorized, redirect to dashboard or login
        this.router.navigate(['/dashboard']);
        return false;
    }
}
