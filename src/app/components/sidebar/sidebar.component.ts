import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { Subscription } from 'rxjs';
import { EventEmitter, Output } from '@angular/core';

declare var lucide: any;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: any = null;
  incidentCount: number = 0;
  isPlatformAdmin = false;
  adminExpanded = false;
  activeOrgName: string = 'Select Org...';
  private userSub?: Subscription;

  @Output() collapsedChange = new EventEmitter<boolean>();
  isCollapsed: boolean = false;

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

    this.apiService.getActiveAlerts().subscribe(alerts => {
      this.incidentCount = alerts.length;
    });

    this.orgService.currentOrg$.subscribe(org => {
      this.activeOrgName = org ? org.name : 'Select Org...';
    });

    // Auto-expand admin section if on an admin route
    this.adminExpanded = this.router.url.startsWith('/admin');

    // Keep it sync'd on navigation
    this.router.events.subscribe(() => {
      if (this.router.url.startsWith('/admin')) {
        this.adminExpanded = true;
      }
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  toggleAdmin(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.adminExpanded = !this.adminExpanded;
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout();
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
  }

  getOrgInitials(name: string): string {
    if (!name || name === 'Select Org...') return 'O';
    return name.charAt(0).toUpperCase();
  }
}
