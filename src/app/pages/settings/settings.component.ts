import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, StoredUser } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { AvatarService } from '../../services/avatar.service';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, AvatarComponent],
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
    private avatarService: AvatarService,
    private router: Router,
    private translate: TranslateService
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
    if (this.fullName.trim().length < 2) {
      alert(this.translate.instant('ERR_NAME_TOO_SHORT'));
      return;
    }

    this.apiService.updateFullName({
      fullName: this.fullName
    }).subscribe({
      next: (updatedUser) => {
        alert(this.translate.instant('SETTINGS.ALERTS.PROFILE_UPDATED'));
        this.authService.updateCurrentUser({ fullName: updatedUser.fullName });
        this.currentUser = this.authService.currentUserValue;
        this.fullName = updatedUser.fullName;
      },
      error: () => alert(this.translate.instant('SETTINGS.ALERTS.PROFILE_UPDATE_FAILED'))
    });
  }

  onAvatarChanged(dataUrl: string | null) {
    // Update the stored user so the sidebar and topbar reflect the new avatar
    this.authService.updateCurrentUser({ profileImageUrl: dataUrl });
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser?.id) {
      if (dataUrl) {
        this.avatarService.notifyUserAvatarChange(this.currentUser.id, dataUrl);
      } else {
        this.avatarService.notifyUserAvatarChange(this.currentUser.id, null);
      }
    }
    
    // Re-initialize icons after DOM update
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 100);
  }

  togglePasswordForm() {
    this.showPasswordForm = !this.showPasswordForm;
  }

  get pwHasLength(): boolean { return this.passwordData.newPassword.length >= 8; }
  get pwHasLetter(): boolean { return /[a-zA-Z]/.test(this.passwordData.newPassword); }
  get pwHasNumber(): boolean { return /\d/.test(this.passwordData.newPassword); }
  get isStrongPassword(): boolean { return this.pwHasLength && this.pwHasLetter && this.pwHasNumber; }

  changePassword() {
    if (!this.isStrongPassword) {
      alert(this.translate.instant('ERR_PASSWORD_WEAK'));
      return;
    }

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert(this.translate.instant('SETTINGS.ALERTS.PW_MISMATCH'));
      return;
    }

    this.apiService.changePassword({
      currentPassword: this.passwordData.oldPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        alert(this.translate.instant('SETTINGS.ALERTS.PW_CHANGED'));
        this.passwordData = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.showPasswordForm = false;
      },
      error: () => alert(this.translate.instant('SETTINGS.ALERTS.PW_CHANGE_FAILED'))
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
      error: () => alert(this.translate.instant('SETTINGS.ALERTS.TFA_INIT_FAILED'))
    });
  }

  enable2fa() {
    if (!this.mfaCode || this.mfaCode.length !== 6) {
      alert(this.translate.instant('SETTINGS.ALERTS.TFA_ENTER_CODE'));
      return;
    }

    this.apiService.enable2fa({
      secret: this.setupData.secret,
      code: this.mfaCode
    }).subscribe({
      next: () => {
        alert(this.translate.instant('SETTINGS.ALERTS.TFA_ENABLED'));
        this.isTwoFactorEnabled = true;
        this.show2faSetup = false;
        this.setupData = null;
        this.mfaCode = '';
      },
      error: (err) => alert(err.error?.error || this.translate.instant('SETTINGS.ALERTS.TFA_ENABLE_FAILED'))
    });
  }

  initiate2faDisable() {
    this.showDisable2fa = true;
  }

  disable2fa() {
    if (!this.disablePassword) {
      alert(this.translate.instant('SETTINGS.ALERTS.TFA_ENTER_PW'));
      return;
    }

    this.apiService.disable2fa(this.disablePassword).subscribe({
      next: () => {
        alert(this.translate.instant('SETTINGS.ALERTS.TFA_DISABLED'));
        this.isTwoFactorEnabled = false;
        this.showDisable2fa = false;
        this.disablePassword = '';
      },
      error: (err) => alert(err.error?.error || this.translate.instant('SETTINGS.ALERTS.TFA_DISABLE_FAILED'))
    });
  }

  deleteAccount() {
    const confirmed = confirm(this.translate.instant('SETTINGS.ALERTS.DEL_CONFIRM'));
    if (confirmed) {
      const doubleCheck = prompt(this.translate.instant('SETTINGS.ALERTS.DEL_PROMPT'));
      if (doubleCheck === 'DELETE' || doubleCheck === 'SUPPRIMER') {
        alert(this.translate.instant('SETTINGS.ALERTS.DEL_NOT_IMPL'));
        // Uncomment when backend endpoint is available:
        // this.apiService.deleteAccount(this.currentUser!.id).subscribe(() => {
        //   this.authService.logout();
        // });
      } else {
        alert(this.translate.instant('SETTINGS.ALERTS.DEL_CANCEL'));
      }
    }
  }
}
