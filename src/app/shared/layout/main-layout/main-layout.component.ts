import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component';
import { TopbarComponent } from '@shared/components/topbar/topbar.component';
import { OrganizationService } from '@core/services/organization.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent, TopbarComponent, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent implements OnInit {
  isSidebarCollapsed: boolean = true;

  constructor(private orgService: OrganizationService) { }

  ngOnInit() {
    // Load organizations when layout wrapper mounts (which happens after login)
    this.orgService.loadMyOrganizations().subscribe();
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }
}
