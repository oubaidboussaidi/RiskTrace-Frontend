import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { Subscription, forkJoin } from 'rxjs';
import { RouterModule } from '@angular/router';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterModule],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent implements OnInit, AfterViewInit, OnDestroy {
  incidents: any[] = [];
  activeOrgId: string | null = null;
  sites: any[] = [];
  filterSeverity: string = 'ALL';
  filterSite: string = 'ALL';
  filterStatus: string = 'OPEN';
  searchQuery: string = '';
  private orgSub?: Subscription;

  // ── Bulk Selection ──────────────────────────────────────────────
  selectedIds: Set<string> = new Set();
  isSelectAllAcrossPages: boolean = false;
  isExecutingBulk: boolean = false;

  // ── Pagination ──────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 15;
  Math = Math;

  // ── Escalate Modal ──────────────────────────────────────────────
  showEscalateModal: boolean = false;
  escalateSubmitting: boolean = false;
  escalateSuccess: boolean = false;
  escalateError: string | null = null;
  escalateMessage: string = '';

  constructor(
    private apiService: ApiService,
    private translate: TranslateService,
    private orgService: OrganizationService
  ) { }

  ngOnInit() {
    this.orgSub = this.orgService.currentOrg$.subscribe(org => {
      if (org) {
        this.activeOrgId = org.id;
        this.refreshIncidents();
      } else {
        this.activeOrgId = null;
        this.incidents = [];
      }
    });
  }

  ngOnDestroy() {
    this.orgSub?.unsubscribe();
  }

  // ── Data Loading ────────────────────────────────────────────────

  refreshIncidents() {
    if (!this.activeOrgId) return;

    this.apiService.getSitesByOrganization(this.activeOrgId).subscribe(data => {
      this.sites = data || [];
    });

    this.apiService.getAlertsByOrganization(this.activeOrgId).subscribe(data => {
      this.incidents = (data || []).map(alert => this.processAlert(alert));
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }

  // ── Computed: Filtering & Pagination ────────────────────────────

  get filteredIncidents() {
    return this.incidents.filter(inc => {
      if (this.filterSeverity !== 'ALL' && inc.severity !== this.filterSeverity) return false;
      if (this.filterSite !== 'ALL' && inc.siteId !== this.filterSite) return false;
      if (this.filterStatus !== 'ALL' && inc.status !== this.filterStatus) return false;
      if (this.searchQuery && this.searchQuery.trim() !== '') {
        const tokens = this.searchQuery.toLowerCase().trim().split(/\s+/);
        for (const token of tokens) {
          const match = (inc.sourceIp && inc.sourceIp.toLowerCase().includes(token)) ||
                        (inc.targetPath && inc.targetPath.toLowerCase().includes(token)) ||
                        (inc.description && inc.description.toLowerCase().includes(token));
          if (!match) return false;
        }
      }
      return true;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredIncidents.length / this.pageSize);
  }

  get paginatedIncidents() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredIncidents.slice(start, start + this.pageSize);
  }

  // ── Pagination Controls ─────────────────────────────────────────

  changePage(delta: number) {
    this.goToPage(this.currentPage + delta);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      if (!this.isSelectAllAcrossPages) this.clearSelection();
      this.reRenderIcons();
    }
  }

  getPageRange(): (number | string)[] {
    const current = this.currentPage;
    const last = this.totalPages;
    const delta = 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined = undefined;

    for (let i = 1; i <= last; i++) {
      if (i === 1 || i === last || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) rangeWithDots.push(l + 1);
        else if (i - l !== 1) rangeWithDots.push('...');
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  }

  onFilterChange() {
    this.currentPage = 1;
    this.clearSelection();
    this.reRenderIcons();
  }

  // ── Bulk Selection ──────────────────────────────────────────────

  toggleSelection(incidentId: string) {
    if (this.selectedIds.has(incidentId)) {
      this.selectedIds.delete(incidentId);
      this.isSelectAllAcrossPages = false;
    } else {
      this.selectedIds.add(incidentId);
    }
  }

  toggleSelectAllOnPage() {
    if (this.isAllOnPageSelected()) {
      this.clearSelection();
    } else {
      this.paginatedIncidents.forEach(inc => this.selectedIds.add(inc.id));
    }
  }

  isAllOnPageSelected(): boolean {
    if (this.paginatedIncidents.length === 0) return false;
    return this.paginatedIncidents.every(inc => this.selectedIds.has(inc.id));
  }

  selectAllMatching() {
    this.filteredIncidents.forEach(inc => this.selectedIds.add(inc.id));
    this.isSelectAllAcrossPages = true;
  }

  clearSelection() {
    this.selectedIds.clear();
    this.isSelectAllAcrossPages = false;
  }

  bulkUpdateStatus(newStatus: string) {
    if (this.selectedIds.size === 0) return;
    if (confirm(this.translate.instant('INCIDENTS.ALERTS.BULK_CONFIRM', { count: this.selectedIds.size, status: newStatus.toLowerCase() }))) {
      this.isExecutingBulk = true;
      const idsToUpdate = Array.from(this.selectedIds);
      const requests = idsToUpdate.map(id => this.apiService.updateAlertStatus(id, newStatus));

      forkJoin(requests).subscribe({
        next: () => {
          this.incidents.forEach(inc => {
            if (this.selectedIds.has(inc.id)) inc.status = newStatus;
          });
          this.clearSelection();
          this.isExecutingBulk = false;
        },
        error: (err) => {
          console.error('Bulk update failed', err);
          alert(this.translate.instant('INCIDENTS.ALERTS.UPDATE_FAILED'));
          this.isExecutingBulk = false;
        }
      });
    }
  }

  // ── Single-card Status Update ───────────────────────────────────

  updateStatus(incident: any, newStatus: string) {
    if (confirm(this.translate.instant('INCIDENTS.ALERTS.SINGLE_CONFIRM', { status: newStatus.toLowerCase() }))) {
      this.apiService.updateAlertStatus(incident.id, newStatus).subscribe(() => {
        incident.status = newStatus;
      });
    }
  }

  // ── Escalate Modal ──────────────────────────────────────────────

  openEscalateModal() {
    if (this.selectedIds.size === 0) return;
    this.escalateMessage = '';
    this.escalateError = null;
    this.escalateSuccess = false;
    this.showEscalateModal = true;
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
  }

  closeEscalateModal() {
    if (this.escalateSubmitting) return;
    this.showEscalateModal = false;
  }

  submitEscalation() {
    this.escalateSubmitting = true;
    this.escalateError = null;

    const analystName = this.getCurrentUserIdentity();
    const requests = Array.from(this.selectedIds).map(id =>
      this.apiService.escalateAlert(id, { message: this.escalateMessage, analystName })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.escalateSuccess = true;
        this.escalateSubmitting = false;
        setTimeout(() => {
          this.showEscalateModal = false;
          this.clearSelection();
          this.reRenderIcons();
        }, 1800);
      },
      error: () => {
        this.escalateError = 'Failed to escalate incidents. Please try again.';
        this.escalateSubmitting = false;
      }
    });
  }

  /**
   * Returns the logged-in user's full name and email in the format
   * "Full Name <email@domain.com>" for the SOC email "Reported By" field.
   */
  private getCurrentUserIdentity(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name  = user.fullName || '';
      const email = user.email    || '';
      if (name && email) return `${name} <${email}>`;
      return name || email || 'Unknown Analyst';
    } catch {
      return 'Unknown Analyst';
    }
  }

  // ── Utilities ───────────────────────────────────────────────────

  reRenderIcons() {
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 50);
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  processAlert(alert: any) {
    return {
      ...alert,
      typeKey: 'INCIDENTS.TYPES.' + (alert.type || 'SUSPICIOUS_ACTIVITY'),
      mlDescParams: alert.type === 'ANOMALY_DETECTED' && alert.anomalyScore != null ? {
        score: (alert.anomalyScore as number).toFixed(2),
        confidence: alert.severity || 'N/A',
        ip: alert.sourceIp || 'N/A',
        path: alert.targetPath || 'N/A'
      } : null,
      sessionId: alert.sessionId,
      assignee: 'Unassigned',
      severityClass: this.getSeverityClass(alert.severity),
      borderClass: this.getBorderClass(alert.severity)
    };
  }

  getSeverityClass(severity: string): string {
    if (severity === 'CRITICAL' || severity === 'HIGH') return 'status-alert';
    if (severity === 'MEDIUM') return 'status-warning';
    return 'status-success';
  }

  getBorderClass(severity: string): string {
    if (severity === 'CRITICAL' || severity === 'HIGH') return 'border-danger';
    if (severity === 'MEDIUM') return 'border-warning';
    return 'border-success';
  }
}
