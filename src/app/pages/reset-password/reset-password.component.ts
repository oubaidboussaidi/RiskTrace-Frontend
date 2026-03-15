import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

type ResetState = 'form' | 'loading' | 'success' | 'error';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './reset-password.component.html',
    styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
    token = '';
    newPassword = '';
    confirmPassword = '';
    state: ResetState = 'form';
    error = '';
    message = '';
    isTokenError = false;
    
    showPassword = false;
    showConfirmPassword = false;

    // Password strength
    get passwordStrength(): number {
        if (!this.newPassword) return 0;
        let score = 0;
        if (this.newPassword.length >= 8) score++;
        if (/[A-Z]/.test(this.newPassword)) score++;
        if (/[0-9]/.test(this.newPassword)) score++;
        if (/[^A-Za-z0-9]/.test(this.newPassword)) score++;
        return score;
    }

    get strengthLabel(): string {
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        return labels[this.passwordStrength];
    }

    get strengthColor(): string {
        const colors = ['', '#ef4444', '#f59e0b', '#22c55e', '#10b981'];
        return colors[this.passwordStrength];
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService
    ) { }

    ngOnInit() {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.state = 'error';
            this.isTokenError = true;
            this.error = 'No reset token found. Please request a new password reset link.';
        } else {
            this.token = token;
        }
    }

    resetPassword() {
        this.error = '';

        if (!this.newPassword || !this.confirmPassword) {
            this.error = 'Please fill in all fields';
            return;
        }

        if (this.newPassword !== this.confirmPassword) {
            this.error = 'Passwords do not match';
            return;
        }

        if (this.newPassword.length < 8) {
            this.error = 'Password must be at least 8 characters';
            return;
        }

        this.state = 'loading';

        this.apiService.resetPassword(this.token, this.newPassword).subscribe({
            next: (res) => {
                this.state = 'success';
                this.message = res.message;
            },
            error: (err) => {
                this.state = 'error';
                this.isTokenError = err.error?.code === 'INVALID_TOKEN';
                this.error = err.error?.error || 'Failed to reset password. The link may be invalid or expired.';
            }
        });
    }

    goToLogin() {
        this.router.navigate(['/auth/login']);
    }

    goToForgotPassword() {
        this.router.navigate(['/auth/login']);
    }
}
