import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { environment } from '../../../environments/environment';

declare var lucide: any;

import { TranslateModule } from '@ngx-translate/core';

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

  newSite = {
    siteName: '',
    domain: ''
  };

  // The log collect endpoint — tracker.js sends logs here
  readonly logEndpoint = environment.apiUrl.replace('/api', '') + '/api/logs/collect';

  constructor(
    private apiService: ApiService,
    private orgService: OrganizationService,
    private route: ActivatedRoute
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
      alert('No organization selected.');
      return;
    }
    if (!this.newSite.siteName || !this.newSite.domain) {
      alert('Please fill in all fields');
      return;
    }

    if (!confirm(`Are you sure you want to add "${this.newSite.siteName}" (${this.newSite.domain})?`)) {
      return;
    }

    const payload = { ...this.newSite, organizationId: this.currentOrgId };

    this.apiService.createSite(payload).subscribe({
      next: () => {
        this.refreshSites();
        this.showCreateForm = false;
        this.newSite = { siteName: '', domain: '' };
        alert('Application added successfully! You can now copy the tracking code.');
      },
      error: () => alert('Failed to create site.')
    });
  }

  deleteSite(site: any) {
    if (confirm(`Delete "${site.siteName}"? This will invalidate its API key immediately.`)) {
      this.apiService.deleteSite(site.id).subscribe({
        next: () => this.sites = this.sites.filter(s => s.id !== site.id),
        error: () => alert('Failed to delete site.')
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
    this.showHelp = true;
  }

  /** Opens the generic help modal (no specific site chosen) */
  openHelp() {
    this.selectedSite = null;
    this.showHelp = true;
  }

  copyScript(site?: any) {
    const apiKey = site?.apiKey || this.selectedSite?.apiKey || 'YOUR_API_KEY';
    const tag = `<script src="http://localhost:8080/tracker.js" data-api-key="${apiKey}"></script>`;
    navigator.clipboard.writeText(tag).then(() => {
      this.copiedSiteId = site?.id || null;
      setTimeout(() => this.copiedSiteId = null, 2000);
      if (!site) this.showHelp = false;
    });
  }

  /** Copies just the <script> tag (embed snippet) */
  copyEmbed(site: any) {
    const tag = `<script src="http://localhost:8080/tracker.js" data-api-key="${site.apiKey}"></script>`;
    navigator.clipboard.writeText(tag).then(() => {
      this.copiedSiteId = site.id;
      setTimeout(() => this.copiedSiteId = null, 2000);
    });
  }

  regenerateKey(siteId: string) {
    if (confirm('Are you sure? This will invalidate the old key immediately.')) {
      this.apiService.regenerateApiKey(siteId).subscribe(updatedSite => {
        const index = this.sites.findIndex(s => s.id === updatedSite.id);
        if (index !== -1) {
          this.sites[index] = updatedSite;
          setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
        }
      });
    }
  }

  // Removed buildTrackerScript since script is hosted remotely on the backend.
}
