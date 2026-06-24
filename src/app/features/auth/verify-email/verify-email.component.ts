import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@core/services/api.service';
import { ThemeService } from '@core/services/theme.service';
import { LanguageService } from '@core/services/language.service';

type VerifyState = 'loading' | 'success' | 'error';

import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-verify-email',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './verify-email.component.html',
    styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
    state: VerifyState = 'loading';
    message = '';
    isExpired = false;
    email = '';

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
            this.message = 'No verification token found in the link.';
            return;
        }
        this.verify(token);
    }

    verify(token: string) {
        this.state = 'loading';
        this.apiService.verifyEmail(token).subscribe({
            next: (res) => {
                this.state = 'success';
                this.message = res.message;
            },
            error: (err) => {
                this.state = 'error';
                const code = err.error?.code;
                if (code === 'INVALID_TOKEN') {
                    this.message = 'VERIFY_EMAIL.INVALID_TOKEN';
                    this.isExpired = true;
                } else {
                    this.message = 'VERIFY_EMAIL.GENERIC_ERROR';
                    this.isExpired = false;
                }
            }
        });
    }

    goToLogin() {
        this.router.navigate(['/auth/login']);
    }

    resendVerification() {
        if (!this.email) return;
        this.apiService.resendVerificationEmail(this.email).subscribe({
            next: (res) => {
                this.message = res.message;
                this.isExpired = false;
            },
            error: () => {
                this.message = 'Failed to resend. Please try again from the login page.';
            }
        });
    }
}
