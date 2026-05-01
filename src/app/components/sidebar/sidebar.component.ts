import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { Subscription } from 'rxjs';
import { EventEmitter, Output } from '@angular/core';

declare var lucide: any;

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, TranslateModule, AvatarComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: any = null;
  incidentCount: number = 0;
  isPlatformAdmin = false;
  hasActiveOrg = false;
  isAdminView = false;
  activeOrgName: string = 'Select Org...';
  private userSub?: Subscription;
  private pollInterval?: any;

  @Output() collapsedChange = new EventEmitter<boolean>();
  isCollapsed: boolean = true;

  onMouseEnter() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      this.collapsedChange.emit(this.isCollapsed);
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
    }
  }

  onMouseLeave() {
    if (!this.isCollapsed) {
      this.isCollapsed = true;
      this.collapsedChange.emit(this.isCollapsed);
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
    }
  }

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private orgService: OrganizationService,
    private router: Router
  ) { }

  ngOnInit() {
    this.userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.isPlatformAdmin = this.authService.isPlatformAdmin() || this.authService.isAdmin();
    });

    this.orgService.currentOrg$.subscribe(org => {
      this.hasActiveOrg = !!org;
      this.activeOrgName = org ? org.name : 'Select Org...';
      
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }

      if (org) {
        const fetchAlerts = () => {
          this.apiService.getActiveAlertsByOrganization(org.id).subscribe(alerts => {
            this.incidentCount = (alerts || []).length;
          });
        };
        fetchAlerts();
        this.pollInterval = setInterval(fetchAlerts, 5000);
      } else {
        this.incidentCount = 0;
      }
    });

    // Auto-expand admin section if on an admin route
    this.isAdminView = this.router.url.startsWith('/admin');

    // Keep it sync'd on navigation
    this.router.events.subscribe(() => {
      this.isAdminView = this.router.url.startsWith('/admin');
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }


  navigateToSettings() {
    if (this.isAdminView) {
      this.router.navigate(['/admin/settings']);
    } else {
      this.router.navigate(['/settings']);
    }
  }

  logout() {
    this.authService.logout();
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }


  getOrgInitials(name: string): string {
    if (!name || name === 'Select Org...') return 'O';
    return name.charAt(0).toUpperCase();
  }
}
