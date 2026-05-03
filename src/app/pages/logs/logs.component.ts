import { Component, AfterViewInit, OnInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';


declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit, AfterViewInit, OnDestroy {
  allLogs: any[] = [];
  logs: any[] = [];

  // Pagination
  currentPage: number = 1;
  pageSize: number = 15;
  Math = Math;

  sites: string[] = [];
  private siteMap = new Map<string, string>();

  // Filter models
  selectedSite: string = 'All Sites';
  selectedStatus: string = 'All Status';
  selectedMethod: string = 'All Methods';
  selectedSession: string = 'All Sessions';
  searchQuery: string = '';
  minRiskScore: number = 0;

  selectedLog: any = null;
  showLogModal: boolean = false;
  liveTailActive: boolean = false;
  private sse: EventSource | null = null;

  activeLogMenu: any = null;
  isExportMenuOpen: boolean = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private orgService: OrganizationService,
    private route: ActivatedRoute,
    private zone: NgZone,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.orgService.currentOrg$.subscribe(org => {
      if (org) {
        forkJoin({
          sites: this.apiService.getSitesByOrganization(org.id),
          logs: this.apiService.getLogsByOrganization(org.id)
        }).subscribe({
          next: ({ sites, logs }) => {
            const siteMap = new Map<string, string>();
            (sites || []).forEach((s: any) => {
              siteMap.set(s.id, s.siteName || s.domain || s.id);
            });
            this.siteMap = siteMap;

            this.allLogs = (logs || []).map(log => this.processLog(log, this.siteMap));
            this.extractSites();

            // Check for query params
            this.route.queryParams.subscribe(params => {
              if (params['search']) {
                this.searchQuery = params['search'];
              }
              this.filterLogs();
            });

            setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
          },
          error: (err) => {
            console.error('Failed to load data', err);
          }
        });
      }
    });
  }


  processLog(log: any, siteMapMap: Map<string, string>) {
    // Add UI helper properties - field names match the Log model (url, createdAt, siteId, ipAddress)
    const rawSiteId = log.siteId;
    const siteDisplay = rawSiteId ? (siteMapMap.get(rawSiteId) || rawSiteId) : 'N/A';

    return {
      ...log,
      site: siteDisplay,
      ip: log.ipAddress || '0.0.0.0',
      path: log.url || '-',              // backend stores URL in 'url' field
      timestamp: log.createdAt || '-',   // backend stores timestamp in 'createdAt'
      status: (log.statusCode || '-').toString(),
      method: (log.method || '').toUpperCase(),
      score: ((log.anomalyScore || 0) * 100).toFixed(0),
      scoreClass: this.getScoreClass(log.anomalyScore),
      methodColor: this.getMethodColor(log.method)
    };
  }

  getScoreClass(score: number): string {
    if (score > 0.7) return 'status-alert';
    if (score > 0.4) return 'status-warning';
    return 'status-success';
  }

  getMethodColor(method: string): string {
    const colors: { [key: string]: string } = {
      'GET': '#4ade80',
      'POST': '#60a5fa',
      'PUT': '#fbbf24',
      'DELETE': '#f87171'
    };
    return colors[method] || '#94a3b8';
  }


  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  extractSites() {
    const uniqueSites = new Set(this.allLogs.map(log => log.site));
    this.sites = ['All Sites', ...Array.from(uniqueSites)];
  }

  filterLogs() {
    this.logs = this.allLogs.filter(log => {
      const matchSite    = this.selectedSite    === 'All Sites'    || log.site      === this.selectedSite;
      const matchStatus  = this.selectedStatus  === 'All Status'  || this.checkStatus(log.status, this.selectedStatus);
      const matchMethod  = this.selectedMethod  === 'All Methods'  || log.method    === this.selectedMethod;
      const matchSession = this.selectedSession === 'All Sessions' || log.sessionId === this.selectedSession;

      const searchStr = this.searchQuery ? this.searchQuery.toLowerCase() : '';
      const matchSearch = !searchStr ||
        (log.path      && log.path.toLowerCase().includes(searchStr)) ||
        (log.ip        && log.ip.toLowerCase().includes(searchStr)) ||
        (log.site      && log.site.toLowerCase().includes(searchStr)) ||
        (log.status    && log.status.toLowerCase().includes(searchStr)) ||
        (log.method    && log.method.toLowerCase().includes(searchStr)) ||
        (log.sessionId && log.sessionId.toLowerCase().includes(searchStr));

      const matchScore = parseInt(log.score) >= this.minRiskScore;

      return matchSite && matchStatus && matchMethod && matchSession && matchSearch && matchScore;
    });

    this.currentPage = 1;
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
  }

  get totalPages(): number {
    return Math.ceil(this.logs.length / this.pageSize);
  }

  get paginatedLogs() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.logs.slice(start, start + this.pageSize);
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
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
  }

  checkStatus(logStatus: string, filterStatus: string): boolean {
    if (filterStatus === '4xx, 5xx') return logStatus.startsWith('4') || logStatus.startsWith('5');
    if (filterStatus === '2xx') return logStatus.startsWith('2');
    return true;
  }

  getStatusLabel(status: string): string {
    if (status === '4xx, 5xx') return 'LOGS.ERRORS';
    if (status === '2xx') return 'LOGS.SUCCESS';
    return 'LOGS.ALL_STATUS';
  }

  // Row Actions
  viewLogDetails(log: any) {
    this.selectedLog = log;
    this.showLogModal = true;
  }

  closeLogModal() {
    this.selectedLog = null;
    this.showLogModal = false;
  }

  toggleActionMenu(log: any, event: Event) {
    event.stopPropagation();
    this.activeLogMenu = this.activeLogMenu === log ? null : log;
    this.isExportMenuOpen = false;
  }

  toggleExportMenu(event: Event) {
    event.stopPropagation();
    this.isExportMenuOpen = !this.isExportMenuOpen;
    this.activeLogMenu = null;
  }

  @HostListener('document:click')
  closeMenus() {
    this.activeLogMenu = null;
    this.isExportMenuOpen = false;
  }

  copyIp(log: any) {
    navigator.clipboard.writeText(log.ip).then(() => {
      alert(this.translate.instant('LOGS.ALERTS.IP_COPIED'));
    });
  }

  filterByIp(log: any) {
    this.searchQuery = log.ip;
    this.filterLogs();
  }

  filterByPath(log: any) {
    this.searchQuery = log.path;
    this.filterLogs();
  }

  filterBySession(log: any) {
    this.selectedSession = log.sessionId;
    this.filterLogs();
  }

  markAsAnomaly(log: any) {
    this.apiService.markLogAsAnomaly(log.id).subscribe({
      next: () => {
        log.scoreClass = 'status-alert'; // Optimistic indicator
        alert(this.translate.instant('LOGS.ALERTS.MARKED_SUSPICIOUS', { ip: log.ip }));
      },
      error: (err) => console.error('Error marking log', err)
    });
  }

  exportLogs(format: 'csv' | 'json') {
    if (this.logs.length === 0) return;

    if (format === 'csv') {
      const csvRows = [];
      const headers = ['Timestamp', 'Site', 'Method', 'Path', 'IP Address', 'Score', 'Status', 'Suspicious'];
      csvRows.push(headers.join(','));

      this.logs.forEach(log => {
        const row = [
          `"${log.timestamp}"`,
          `"${log.site}"`,
          `"${log.method}"`,
          `"${log.path}"`,
          `"${log.ip}"`,
          `${log.score}`,
          `"${log.status}"`,
          `${!!log.isSuspicious}`
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'RiskTrace_Logs_Export.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const jsonStr = JSON.stringify(this.logs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'RiskTrace_Logs_Export.json');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  toggleLiveTail() {
    if (this.liveTailActive) {
      if (this.sse) {
        this.sse.close();
        this.sse = null;
      }
      this.liveTailActive = false;
    } else {
      this.liveTailActive = true;
      // EventSource bypasses Angular's HTTP interceptor, so we must manually
      // attach the JWT token (stored in-memory via AuthService) as a query param.
      const token = this.authService.getToken();
      const baseUrl = this.apiService.getLiveTailUrl();
      const streamUrl = token ? `${baseUrl}?token=${token}` : baseUrl;
      this.sse = new EventSource(streamUrl);
      this.sse.addEventListener('newLog', (event: any) => {
        try {
          const newLog = JSON.parse(event.data);
          const processedLog = this.processLog(newLog, this.siteMap);
          // Run inside Angular zone so change detection fires
          this.zone.run(() => {
            this.allLogs.unshift(processedLog);
            this.extractSites();
            this.filterLogs();
          });
        } catch (e) {
          console.error('SSE Error parsing log', e);
        }
      });
      this.sse.onerror = (error) => {
        console.error('SSE Error', error);
      };
    }
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
  }

  ngOnDestroy() {
    if (this.sse) {
      this.sse.close();
    }
  }
}
