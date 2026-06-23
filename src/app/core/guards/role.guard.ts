import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

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

        if (expectedRole === 'PLATFORM_ADMIN') {
            if (userRole === 'PLATFORM_ADMIN' || userRole === 'ADMIN') {
                return true;
            }
        } else if (userRole === expectedRole) {
            return true;
        }

        this.router.navigate(['/dashboard']);
        return false;
    }
}
