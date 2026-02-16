import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apiService: ApiService
  ) { }

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
    this.name = '';
    this.password = '';
    this.confirmPassword = '';
  }

  login() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.error = '';
    this.loading = true;
    this.showResendButton = false;

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (err) => {
        this.loading = false;
        const code = err.error?.code;
        if (code === 'ACCOUNT_NOT_VERIFIED') {
          this.error = 'Your account is not verified. Please check your email inbox.';
          this.showResendButton = true;
          this.resendEmail = this.email;
        } else {
          this.error = err.error?.error || 'Invalid credentials';
        }
      }
    });
  }

  register() {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all fields';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.password.length < 8) {
      this.error = 'Password must be at least 8 characters';
      return;
    }

    this.error = '';
    this.loading = true;

    this.authService.register(this.name, this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.isRegisterMode = false;
        this.successMessage = '✅ Account created! Please check your email to verify your account before logging in.';
        this.password = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.loading = false;
        const code = err.error?.code;
        if (code === 'EMAIL_UNVERIFIED_PENDING') {
          this.isRegisterMode = false;
          this.successMessage = '📧 A verification email has already been sent to this address. Please check your inbox or spam folder.';
          this.showResendButton = true;
          this.resendEmail = this.email;
          this.error = '';
        } else {
          this.error = err.error?.error || 'Registration failed. Email may already exist.';
        }
      }
    });
  }

  forgotPassword() {
    if (!this.email) {
      this.error = 'Please enter your email address';
      return;
    }

    this.error = '';
    this.loading = true;

    this.apiService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = '📧 ' + res.message;
      },
      error: () => {
        this.loading = false;
        this.successMessage = '📧 If that email exists, a password reset link has been sent.';
      }
    });
  }

  resendVerification() {
    this.loading = true;
    this.apiService.resendVerificationEmail(this.resendEmail).subscribe({
      next: (res) => {
        this.loading = false;
        this.showResendButton = false;
        this.successMessage = '📧 ' + res.message;
        this.error = '';
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to resend verification email. Please try again.';
      }
    });
  }

  submit() {
    if (this.loading) return;
    if (this.isForgotMode) {
      this.forgotPassword();
    } else if (this.isRegisterMode) {
      this.register();
    } else {
      this.login();
    }
  }
}
