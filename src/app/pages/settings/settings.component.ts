import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService, AuthResponse } from '../../services/api.service';

declare var lucide: any;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit, AfterViewInit {
  currentUser: AuthResponse | null = null;

  // Editable profile fields (using fullName as per backend DTO)
  fullName = '';

  // Password change model
  passwordData = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showPasswordForm = false;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.fullName = this.currentUser?.fullName ?? '';
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  saveProfile() {
    this.apiService.updateProfile({
      fullName: this.fullName
    }).subscribe({
      next: (updatedUser) => {
        alert('Profile updated successfully!');
        // Sync updated fullName back into local storage / BehaviorSubject
        const current = this.authService.currentUserValue;
        if (current) {
          const merged = { ...current, fullName: updatedUser.fullName };
          localStorage.setItem('user', JSON.stringify(merged));
          // Keep local reference in sync
          this.currentUser = merged;
          this.fullName = updatedUser.fullName;
        }
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

    // The backend UpdateProfileRequest accepts a `password` field for changing it
    this.apiService.updateProfile({
      password: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        alert('Password changed successfully');
        this.passwordData = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.showPasswordForm = false;
      },
      error: () => alert('Failed to change password. Please check your old password.')
    });
  }

  logout() {
    // authService.logout() already navigates to /auth/login
    this.authService.logout();
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
