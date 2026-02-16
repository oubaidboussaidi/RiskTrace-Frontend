import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subscription } from 'rxjs';

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
  private userSub?: Subscription;

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) { }


  ngOnInit() {
    // Subscribe reactively so the sidebar updates immediately after login
    this.userSub = this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });

    this.apiService.getActiveAlerts().subscribe(alerts => {
      this.incidentCount = alerts.length;
    });
  }

  ngOnDestroy() {
    this.userSub?.unsubscribe();
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.authService.logout(); // Already navigates to /auth/login internally
  }

  ngAfterViewInit() {

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}

