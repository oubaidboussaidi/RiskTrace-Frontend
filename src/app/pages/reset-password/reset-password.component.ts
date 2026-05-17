import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';

type ResetState = 'form' | 'loading' | 'success' | 'error';

import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
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

    get pwHasLength(): boolean {
        return this.newPassword.length >= 8;
    }

    get pwHasLetter(): boolean {
        return /[a-zA-Z]/.test(this.newPassword);
    }

    get pwHasNumber(): boolean {
        return /\d/.test(this.newPassword);
    }

    get isStrongPassword(): boolean {
        return this.pwHasLength && this.pwHasLetter && this.pwHasNumber;
    }

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private apiService: ApiService,
        public themeService: ThemeService,
        public languageService: LanguageService
    ) { }

    toggleTheme() {
        this.themeService.toggleTheme();
    }

    ngOnInit() {
        const token = this.route.snapshot.queryParamMap.get('token');
        if (!token) {
            this.state = 'error';
            this.isTokenError = true;
            this.error = 'RESET_PW.EXPIRED';
        } else {
            this.token = token;
        }
    }

    resetPassword() {
        this.error = '';

        if (!this.newPassword || !this.confirmPassword) {
            this.error = 'ERR_FILL_ALL';
            return;
        }

        if (this.newPassword !== this.confirmPassword) {
            this.error = 'ERR_MISMATCH';
            return;
        }

        if (!this.isStrongPassword) {
            this.error = 'ERR_PASSWORD_WEAK';
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
                if (this.isTokenError) {
                    this.error = 'RESET_PW.EXPIRED';
                } else {
                    this.error = 'COMMON.ERRORS.GENERIC';
                }
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
