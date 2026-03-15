import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, StoredUser } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

declare var lucide: any;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit, AfterViewInit {
  currentUser: StoredUser | null = null;

  // Editable profile fields (using fullName as per backend DTO)
  fullName = '';

  // Password change model
  passwordData = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showPasswordForm = false;
  
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  showDisablePassword = false;

  // 2FA Fields
  isTwoFactorEnabled = false;
  show2faSetup = false;
  setupData: any = null;
  mfaCode = '';
  showDisable2fa = false;
  disablePassword = '';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.fullName = this.currentUser?.fullName ?? '';
    this.fetchProfile();
  }

  fetchProfile() {
    this.apiService.getProfile().subscribe(user => {
      this.isTwoFactorEnabled = user.isTwoFactorEnabled;
    });
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  saveProfile() {
    this.apiService.updateFullName({
      fullName: this.fullName
    }).subscribe({
      next: (updatedUser) => {
        alert('Profile updated successfully!');
        this.authService.updateCurrentUser({ fullName: updatedUser.fullName });
        this.currentUser = this.authService.currentUserValue;
        this.fullName = updatedUser.fullName;
      },
      error: () => alert('Failed to update profile.')
    });
  }

  togglePasswordForm() {
    this.showPasswordForm = !this.showPasswordForm;
  }

  changePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    this.apiService.changePassword({
      currentPassword: this.passwordData.oldPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        alert('Password changed successfully');
        this.passwordData = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.showPasswordForm = false;
      },
      error: () => alert('Failed to change password. Please check your current password.')
    });
  }

  logout() {
    // authService.logout() already navigates to /auth/login
    this.authService.logout();
  }

  initiate2faSetup() {
    this.apiService.setup2fa().subscribe({
      next: (data) => {
        this.setupData = data;
        this.show2faSetup = true;
      },
      error: () => alert('Failed to initiate 2FA setup.')
    });
  }

  enable2fa() {
    if (!this.mfaCode || this.mfaCode.length !== 6) {
      alert('Please enter a 6-digit code.');
      return;
    }

    this.apiService.enable2fa({
      secret: this.setupData.secret,
      code: this.mfaCode
    }).subscribe({
      next: () => {
        alert('2FA enabled successfully!');
        this.isTwoFactorEnabled = true;
        this.show2faSetup = false;
        this.setupData = null;
        this.mfaCode = '';
      },
      error: (err) => alert(err.error?.error || 'Failed to enable 2FA. Verify your code.')
    });
  }

  initiate2faDisable() {
    this.showDisable2fa = true;
  }

  disable2fa() {
    if (!this.disablePassword) {
      alert('Please enter your password to confirm.');
      return;
    }

    this.apiService.disable2fa(this.disablePassword).subscribe({
      next: () => {
        alert('2FA disabled successfully.');
        this.isTwoFactorEnabled = false;
        this.showDisable2fa = false;
        this.disablePassword = '';
      },
      error: (err) => alert(err.error?.error || 'Failed to disable 2FA. Check your password.')
    });
  }

  deleteAccount() {
    const confirmed = confirm('Are you absolutely sure? This action cannot be undone.');
    if (confirmed) {
      const doubleCheck = prompt('Type DELETE to confirm account deletion:');
      if (doubleCheck === 'DELETE') {
        alert('Account deletion is not implemented in this demo. In production, this would permanently delete your account.');
        // Uncomment when backend endpoint is available:
        // this.apiService.deleteAccount(this.currentUser!.id).subscribe(() => {
        //   this.authService.logout();
        // });
      } else {
        alert('Account deletion cancelled.');
      }
    }
  }
}
