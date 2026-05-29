import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { environment } from '../../../environments/environment';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { INTEGRATION_TABS, getSnippet } from '../../data/integration-snippets';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.css'
})
export class SitesComponent implements OnInit, AfterViewInit {
  sites: any[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 6;
  Math = Math;

  showHelp: boolean = false;
  showCreateForm: boolean = false;
  selectedSite: any = null;
  copiedSiteId: string | null = null;
  currentOrgId: string | null = null;
  activeTab: string = 'frontend';

  newSite = {
    siteName: '',
    domain: ''
  };

  // The log collect endpoint — tracker.js sends logs here
  readonly logEndpoint = environment.apiUrl.replace('/api', '') + '/api/logs/collect';

  readonly tabs = INTEGRATION_TABS;

  constructor(
    private apiService: ApiService,
    private orgService: OrganizationService,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const orgIdFromQuery = params['orgId'];
      if (orgIdFromQuery) {
        this.currentOrgId = orgIdFromQuery;
        this.refreshSites();
      } else {
        this.orgService.currentOrg$.subscribe(org => {
          if (org) {
            this.currentOrgId = org.id;
            this.refreshSites();
          }
        });
      }
    });
  }

  refreshSites() {
    if (!this.currentOrgId) return;
    this.apiService.getSitesByOrganization(this.currentOrgId).subscribe(sites => {
      this.sites = sites || [];
      this.currentPage = 1;
      this.refreshIcons();
    });
  }

  get totalPages(): number {
    return Math.ceil(this.sites.length / this.pageSize);
  }

  get paginatedSites() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.sites.slice(start, start + this.pageSize);
  }

  getPages(): number[] {
    const pages = [];
    const total = this.totalPages;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  prevPage() {
    if (this.currentPage > 1) { this.currentPage--; this.refreshIcons(); }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) { this.currentPage++; this.refreshIcons(); }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.refreshIcons();
  }

  refreshIcons() {
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
  }

  createSite() {
    if (!this.currentOrgId) {
      alert(this.translate.instant('SITES.ALERTS.NO_ORG'));
      return;
    }

    if (!this.newSite.siteName || !this.newSite.siteName.trim()) {
      alert(this.translate.instant('ERR_SITE_NAME_EMPTY'));
      return;
    }

    if (!this.newSite.domain || !this.newSite.domain.trim()) {
      alert(this.translate.instant('ERR_SITE_DOMAIN_EMPTY'));
      return;
    }

    if (!this.newSite.domain.includes('.') || this.newSite.domain.includes(' ')) {
      alert(this.translate.instant('ERR_DOMAIN_FORMAT'));
      return;
    }

    const payload = { ...this.newSite, organizationId: this.currentOrgId };

    this.apiService.createSite(payload).subscribe({
      next: () => {
        this.refreshSites();
        this.showCreateForm = false;
        this.newSite = { siteName: '', domain: '' };
        alert(this.translate.instant('SITES.ALERTS.ADDED'));
      },
      error: () => alert(this.translate.instant('SITES.ALERTS.ADD_FAILED'))
    });
  }

  deleteSite(site: any) {
    if (confirm(this.translate.instant('SITES.ALERTS.DELETE_CONFIRM', { name: site.siteName }))) {
      this.apiService.deleteSite(site.id).subscribe({
        next: () => this.sites = this.sites.filter(s => s.id !== site.id),
        error: () => alert(this.translate.instant('SITES.ALERTS.DELETE_FAILED'))
      });
    }
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /** Opens the "How to Integrate" modal for a specific site (shows personalised script) */
  showIntegration(site: any) {
    this.selectedSite = site;
    this.activeTab = 'frontend';
    this.showHelp = true;
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
  }

  /** Opens the generic help modal (no specific site chosen) */
  openHelp() {
    this.selectedSite = null;
    this.activeTab = 'frontend';
    this.showHelp = true;
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
  }

  /** Returns the plain-text snippet for the currently active tab */
  getSnippet(apiKey: string): string {
    return getSnippet(this.activeTab, apiKey, this.logEndpoint);
  }

  get currentTabDesc(): string {
    return this.tabs.find(t => t.id === this.activeTab)?.descKey ?? '';
  }

  get currentSnippet(): string {
    const key = this.selectedSite?.apiKey || 'YOUR_API_KEY';
    return this.getSnippet(key);
  }

  copyScript(site?: any) {
    const snippet = this.getSnippet(site?.apiKey || this.selectedSite?.apiKey || 'YOUR_API_KEY');
    navigator.clipboard.writeText(snippet).then(() => {
      this.copiedSiteId = site?.id || '__copied__';
      setTimeout(() => this.copiedSiteId = null, 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = snippet;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.copiedSiteId = site?.id || '__copied__';
      setTimeout(() => this.copiedSiteId = null, 2000);
    });
  }

  /** Copies just the raw API key and shows a tick icon for 2 seconds */
  copyApiKey(site: any) {
    navigator.clipboard.writeText(site.apiKey).then(() => {
      this.copiedSiteId = site.id;
      setTimeout(() => {
        this.copiedSiteId = null;
      }, 2000);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = site.apiKey;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.copiedSiteId = site.id;
      setTimeout(() => { this.copiedSiteId = null; }, 2000);
    });
  }

  /** Copies the full <script> embed tag */
  copyEmbed(site: any) {
    const tag = `<script src="https://risktrace-gateway.onrender.com/tracker.js" data-api-key="${site.apiKey}"><\/script>`;
    navigator.clipboard.writeText(tag).then(() => {
      this.copiedSiteId = site.id;
      setTimeout(() => this.copiedSiteId = null, 2000);
    });
  }

  regenerateKey(siteId: string) {
    if (confirm(this.translate.instant('SITES.ALERTS.REGEN_CONFIRM'))) {
      this.apiService.regenerateApiKey(siteId).subscribe(updatedSite => {
        const index = this.sites.findIndex(s => s.id === updatedSite.id);
        if (index !== -1) {
          this.sites[index] = updatedSite;
          setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
        }
      });
    }
  }
}
