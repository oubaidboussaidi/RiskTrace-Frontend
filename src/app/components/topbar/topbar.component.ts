import { Component, AfterViewInit, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { RouterModule, Router } from '@angular/router';

declare var lucide: any;

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit, AfterViewInit {
  currentUser: any = null;
  notifications: any[] = [];
  showNotifications = false;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput.nativeElement.focus();
    }
  }

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private router: Router
  ) { }


  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.loadNotifications();
  }

  loadNotifications() {
    this.apiService.getActiveAlerts().subscribe(alerts => {
      this.notifications = alerts.slice(0, 5); // Show top 5
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  onSearch(event: any) {
    if (event.key === 'Enter') {
      const query = event.target.value;
      this.router.navigate(['/logs'], { queryParams: { search: query } });
    }
  }


  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  logout() {
    this.authService.logout();
  }
}
