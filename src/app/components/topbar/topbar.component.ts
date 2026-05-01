import { Component, AfterViewInit, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
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
  private pollInterval?: any;
  private mlPollInterval?: any;
  isMlOnline = false;

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
    if (!target.closest('.action-btn-container') && !target.closest('.dropdown-menu')) {
      this.showNotifications = false;
    }
  }

  constructor(
    public authService: AuthService,
    private apiService: ApiService,
    private orgService: OrganizationService,
    private router: Router,
    public languageService: LanguageService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) { }



  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.orgSub = this.orgService.currentOrg$.subscribe(org => {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
      if (org) {
        this.loadNotifications(org.id);
        this.pollInterval = setInterval(() => this.loadNotifications(org.id), 5000);
      } else {
        this.notifications = [];
      }
    });

    this.checkMlStatus();
    // Use 5s interval for better "live" feel
    this.mlPollInterval = setInterval(() => this.checkMlStatus(), 5000);
  }


  checkMlStatus() {
    this.apiService.getMlStatus().subscribe({
      next: (res) => {
        const changed = this.isMlOnline !== res.online;
        this.isMlOnline = res.online;
        if (changed) {
          this.cdr.detectChanges();
        }
      },
      error: () => {
        const changed = this.isMlOnline !== false;
        this.isMlOnline = false;
        if (changed) {
          this.cdr.detectChanges();
        }
      }
    });
  }


  ngOnDestroy() {
    this.orgSub?.unsubscribe();
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    if (this.mlPollInterval) {
      clearInterval(this.mlPollInterval);
    }
  }

  loadNotifications(orgId: string) {
    this.apiService.getActiveAlertsByOrganization(orgId).subscribe(alerts => {
      this.notifications = (alerts || []).slice(0, 5).map(a => {
        let isMlDesc = false;
        let mlParams = null;
        if (a.type === 'ANOMALY_DETECTED' && a.anomalyScore != null) {
            isMlDesc = true;
            mlParams = {
                score: (a.anomalyScore).toFixed(2),
                confidence: a.severity || 'N/A',
                ip: a.sourceIp || 'N/A',
                path: a.targetPath || 'N/A'
            };
        }
        return {
          ...a,
          typeKey: 'INCIDENTS.TYPES.' + (a.type || 'SUSPICIOUS_ACTIVITY'),
          isMlDesc: isMlDesc,
          mlParams: mlParams
        };
      });
      if (this.showNotifications) {
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 10);
      }
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
