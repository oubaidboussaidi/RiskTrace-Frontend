import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;
  isRegisterMode = false;
  isForgotMode = false;
  successMessage = '';
  showResendButton = false;
  resendEmail = '';
  isMfaMode = false;
  mfaCode = '';
  mfaToken = '';
  isLockedMode = false;
  
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService,
    private translate: TranslateService,
    public themeService: ThemeService,
    public languageService: LanguageService
  ) { }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.isForgotMode = false;
    this.clearForm();
  }

  showForgotPassword() {
    this.isForgotMode = true;
    this.isRegisterMode = false;
    this.clearForm();
  }

  backToLogin() {
    this.isForgotMode = false;
    this.isRegisterMode = false;
    this.clearForm();
  }

  clearForm() {
    this.error = '';
    this.successMessage = '';
    this.showResendButton = false;
    this.isLockedMode = false;
    this.name = '';
    this.password = '';
    this.confirmPassword = '';
    this.showPassword = false;
    this.showConfirmPassword = false;
  }

  get pwHasLength(): boolean {
    return this.password.length >= 8;
  }

  get pwHasLetter(): boolean {
    return /[a-zA-Z]/.test(this.password);
  }

  get pwHasNumber(): boolean {
    return /\d/.test(this.password);
  }

  get isStrongPassword(): boolean {
    return this.pwHasLength && this.pwHasLetter && this.pwHasNumber;
  }

  isValidEmail(email: string): boolean {
    return /.+@.+\..+/.test(email);
  }

  login() {
    if (!this.email || !this.password) {
      this.error = 'ERR_FILL_ALL';
      return;
    }
    
    if (!this.isValidEmail(this.email)) {
      this.error = 'ERR_EMAIL_FORMAT';
      return;
    }

    this.error = '';
    this.loading = true;
    this.showResendButton = false;

    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.mfaRequired) {
          this.isMfaMode = true;
          this.mfaToken = res.mfaToken || '';
          this.loading = false;
          this.error = '';
          return;
        }
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (err) => {
        this.loading = false;
        const code = err.error?.code;
        if (code === 'ACCOUNT_NOT_VERIFIED') {
          this.error = 'ERR_NOT_VERIFIED';
          this.showResendButton = true;
          this.resendEmail = this.email;
        } else if (code === 'ACCOUNT_LOCKED') {
          this.isLockedMode = true;
          this.error = err.error?.error || 'ERR_LOCKED';
        } else if (code === 'ACCOUNT_BANNED') {
          this.error = 'ERR_ACCOUNT_BANNED';
        } else {
          this.error = err.error?.error || 'ERR_INVALID_CREDENTIALS';
        }
      }
    });
  }

  verifyMfa() {
    if (!this.mfaCode || this.mfaCode.length !== 6) {
      this.error = 'ERR_INVALID_MFA';
      return;
    }

    this.error = '';
    this.loading = true;

    this.authService.verify2fa(this.mfaToken, this.mfaCode).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'ERR_INVALID_MFA';
      }
    });
  }

  register() {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.error = 'ERR_FILL_ALL';
      return;
    }

    if (this.name.trim().length < 2) {
      this.error = 'ERR_NAME_TOO_SHORT';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.error = 'ERR_EMAIL_FORMAT';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'ERR_MISMATCH';
      return;
    }

    if (!this.isStrongPassword) {
      this.error = 'ERR_PASSWORD_WEAK';
      return;
    }

    this.error = '';
    this.loading = true;

    this.authService.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.isRegisterMode = false;
        this.successMessage = 'MSG_ACCOUNT_CREATED';
        this.password = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.loading = false;
        const code = err.error?.code;
        if (code === 'EMAIL_UNVERIFIED_PENDING') {
          this.isRegisterMode = false;
          this.successMessage = 'MSG_VERIFICATION_SENT_ALREADY';
          this.resendEmail = this.email;
          this.error = '';
        } else {
          this.error = err.error?.error || 'ERR_REGISTRATION_FAILED';
        }
      }
    });
  }

  forgotPassword() {
    if (!this.email) {
      this.error = 'ERR_EMAIL_REQUIRED';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.error = 'ERR_EMAIL_FORMAT';
      return;
    }

    this.error = '';
    this.loading = true;

    this.apiService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res.message;
      },
      error: () => {
        this.loading = false;
        this.successMessage = 'MSG_RESET_LINK_SENT';
      }
    });
  }

  resendVerification() {
    this.loading = true;
    this.apiService.resendVerificationEmail(this.resendEmail).subscribe({
      next: (res) => {
        this.loading = false;
        this.showResendButton = false;
        this.successMessage = res.message;
        this.error = '';
      },
      error: () => {
        this.loading = false;
        this.error = 'ERR_RESEND_FAILED';
      }
    });
  }

  submit() {
    if (this.loading) return;
    if (this.isMfaMode) {
      this.verifyMfa();
    } else if (this.isForgotMode) {
      this.forgotPassword();
    } else if (this.isRegisterMode) {
      this.register();
    } else {
      this.login();
    }
  }
}
