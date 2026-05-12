import { Component, AfterViewInit, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

declare var lucide: any;

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: any = null;
  notifications: any[] = [];
  showNotifications = false;
  showSettings = false;
  private orgSub?: Subscription;

  get currentLang() { return this.languageService.currentLang; }

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput.nativeElement.focus();
    }
    if (event.key === 'Escape') {
      this.showSettings = false;
      this.showNotifications = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.settings-btn-wrap')) {
      this.showSettings = false;
    }
    if (!target.closest('[data-lucide="bell"]') && !target.closest('.dropdown-menu')) {
      this.showNotifications = false;
    }
  }

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private orgService: OrganizationService,
    private router: Router,
    public languageService: LanguageService,
    public themeService: ThemeService
  ) { }


  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.orgSub = this.orgService.currentOrg$.subscribe(org => {
      if (org) {
        this.loadNotifications(org.id);
      } else {
        this.notifications = [];
      }
    });
  }

  ngOnDestroy() {
    this.orgSub?.unsubscribe();
  }

  loadNotifications(orgId: string) {
    this.apiService.getActiveAlertsByOrganization(orgId).subscribe(alerts => {
      this.notifications = (alerts || []).slice(0, 5); // Show top 5
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.showSettings = false;
    if (this.showNotifications) {
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
    }
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
    this.showNotifications = false;
    if (this.showSettings) {
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 0);
    }
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

  toggleTheme() {
    this.themeService.toggleTheme();
    setTimeout(() => {
      // Clean up any existing theme icons to prevent duplication
      const container = document.querySelector('.settings-row-left');
      if (container) {
        const existingSvgs = container.querySelectorAll('svg');
        existingSvgs.forEach(svg => svg.remove());
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }, 50);
  }

  logout() {
    this.authService.logout();
  }
}
