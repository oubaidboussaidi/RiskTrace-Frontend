import { Component, AfterViewInit, OnInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-admin-logs',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule],
    templateUrl: './admin-logs.component.html',
    styleUrl: './admin-logs.component.css'
})
export class AdminLogsComponent implements OnInit, AfterViewInit, OnDestroy {
    allLogs: any[] = [];
    logs: any[] = [];

    // Pagination
    currentPage: number = 1;
    pageSize: number = 15;
    Math = Math;

    sites: string[] = [];
    organizations: string[] = [];

    private siteMap = new Map<string, string>();
    private orgMap = new Map<string, string>();

    // Filter models
    selectedOrganization: string = 'All Organizations';
    selectedSite: string = 'All Sites';
    selectedStatus: string = 'All Status';
    selectedMethod: string = 'All Methods';
    searchQuery: string = '';

    // New Advanced Filters
    minRiskScore: number = 0;
    startDate: string = '';
    endDate: string = '';

    selectedLog: any = null;
    showLogModal: boolean = false;
    liveTailActive: boolean = false;
    private sse: EventSource | null = null;

    activeLogMenu: any = null;
    isExportMenuOpen: boolean = false;

    constructor(
        private apiService: ApiService,
        private authService: AuthService,
        private route: ActivatedRoute,
        private zone: NgZone,
        private translate: TranslateService
    ) { }

    ngOnInit() {
        this.apiService.getAllOrganizations().subscribe({
            next: (organizations) => {
                const orgMap = new Map<string, string>();
                (organizations || []).forEach((o: any) => {
                    orgMap.set(o.id, o.name || o.id);
                });
                this.orgMap = orgMap;

                // For each organization, fetch its sites to build a complete global site map
                const siteRequests = (organizations || []).map(org => 
                    this.apiService.getSitesByOrganization(org.id)
                );

                forkJoin({
                    allSitesArrays: forkJoin(siteRequests.length > 0 ? siteRequests : [Promise.resolve([])]),
                    logs: this.apiService.getLogs()
                }).subscribe({
                    next: ({ allSitesArrays, logs }) => {
                        const siteMap = new Map<string, string>();
                        const allSites = (allSitesArrays as any[]).flat();
                        
                        allSites.forEach((s: any) => {
                            // Map site names, checking both siteName and name fields
                            siteMap.set(s.id, s.siteName || s.name || s.domain || s.id);
                        });
                        this.siteMap = siteMap;

                        this.allLogs = (logs || []).map(log => this.processLog(log, this.orgMap, this.siteMap));
                        this.extractFilters();

                        this.route.queryParams.subscribe(params => {
                            if (params['search']) {
                                this.searchQuery = params['search'];
                            }
                            this.filterLogs();
                        });

                        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
                    },
                    error: (err) => console.error('Failed to load logs/sites', err)
                });
            },
            error: (err) => console.error('Failed to load organizations', err)
        });
    }

    processLog(log: any, orgMapMap: Map<string, string>, siteMapMap: Map<string, string>) {
        const rawOrgId = log.organizationId;
        const orgDisplay = rawOrgId ? (orgMapMap.get(rawOrgId) || rawOrgId) : 'N/A';

        const rawSiteId = log.siteId;
        const siteDisplay = rawSiteId ? (siteMapMap.get(rawSiteId) || rawSiteId) : 'N/A';

        return {
            ...log,
            organization: orgDisplay,
            site: siteDisplay,
            ip: log.ipAddress || '0.0.0.0',
            path: log.url || '-',
            timestamp: log.createdAt || '-',
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

    extractFilters() {
        const uniqueOrgs = new Set(this.allLogs.map(log => log.organization));
        this.organizations = ['All Organizations', ...Array.from(uniqueOrgs)];

        const uniqueSites = new Set(this.allLogs.map(log => log.site));
        this.sites = ['All Sites', ...Array.from(uniqueSites)];
    }

    filterLogs() {
        this.logs = this.allLogs.filter(log => {
            const matchOrg = this.selectedOrganization === 'All Organizations' || log.organization === this.selectedOrganization;
            const matchSite = this.selectedSite === 'All Sites' || log.site === this.selectedSite;
            const matchStatus = this.selectedStatus === 'All Status' || this.checkStatus(log.status, this.selectedStatus);
            const matchMethod = this.selectedMethod === 'All Methods' || log.method === this.selectedMethod;

            // Date Range
            let matchDate = true;
            if (this.startDate || this.endDate) {
                const logTime = new Date(log.timestamp).getTime();
                let start = this.startDate ? new Date(this.startDate).getTime() : 0;
                let end = this.endDate ? new Date(this.endDate).getTime() : Number.MAX_SAFE_INTEGER;
                // if end date is provided, make sure we include the whole day
                if (this.endDate) end += 86400000;
                matchDate = logTime >= start && logTime <= end;
            }

            // Risk Score (e.g. log.score is 0 to 100 string "85", minRiskScore is 0 to 100 number)
            const logScore = parseInt(log.score || '0', 10);
            const matchScore = logScore >= this.minRiskScore;

            const searchStr = this.searchQuery ? this.searchQuery.toLowerCase() : '';
            const matchSearch = !searchStr ||
                ((log.path || '').toLowerCase().includes(searchStr)) ||
                ((log.ip || '').toLowerCase().includes(searchStr)) ||
                ((log.site || '').toLowerCase().includes(searchStr)) ||
                ((log.organization || '').toLowerCase().includes(searchStr)) ||
                ((log.status || '').toLowerCase().includes(searchStr)) ||
                ((log.method || '').toLowerCase().includes(searchStr));

            return matchOrg && matchSite && matchStatus && matchMethod && matchDate && matchScore && matchSearch;
        });

        this.currentPage = 1; // Reset to page 1 on filter
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
            alert(this.translate.instant('ADMIN_LOGS.ALERTS.IP_COPIED'));
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

    filterByOrganization(log: any) {
        this.selectedOrganization = log.organization;
        this.filterLogs();
    }

    markAsAnomaly(log: any) {
        this.apiService.markLogAsAnomaly(log.id).subscribe({
            next: () => {
                log.scoreClass = 'status-alert';
                alert(this.translate.instant('ADMIN_LOGS.ALERTS.MARKED_SUSPICIOUS', { ip: log.ip }));
            },
            error: (err) => console.error('Error marking log', err)
        });
    }

    exportLogs(format: 'csv' | 'json') {
        if (this.logs.length === 0) return;

        if (format === 'csv') {
            const csvRows = [];
            const headers = ['Timestamp', 'Organization', 'Site', 'Method', 'Path', 'IP Address', 'Score', 'Status', 'Suspicious'];
            csvRows.push(headers.join(','));

            this.logs.forEach(log => {
                const row = [
                    `"${log.timestamp}"`,
                    `"${log.organization}"`,
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

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', 'RiskTrace_Global_Logs_Export.csv');
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
            a.setAttribute('download', 'RiskTrace_Global_Logs_Export.json');
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
            const token = this.authService.getToken();
            const baseUrl = this.apiService.getLiveTailUrl();
            const streamUrl = token ? `${baseUrl}?token=${token}` : baseUrl;
            this.sse = new EventSource(streamUrl);
            this.sse.addEventListener('newLog', (event: any) => {
                try {
                    const newLog = JSON.parse(event.data);
                    const processedLog = this.processLog(newLog, this.orgMap, this.siteMap);
                    this.zone.run(() => {
                        this.allLogs.unshift(processedLog);
                        this.extractFilters();
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
