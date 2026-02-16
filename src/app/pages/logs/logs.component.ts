import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute } from '@angular/router';


declare var lucide: any;

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.component.html',
  styleUrl: './logs.component.css'
})
export class LogsComponent implements OnInit, AfterViewInit {
  allLogs: any[] = [];
  logs: any[] = [];
  sites: string[] = [];

  // Filter models
  selectedSite: string = 'All Sites';
  selectedStatus: string = 'All Status';
  selectedMethod: string = 'All Methods';
  searchQuery: string = '';

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.apiService.getLogs().subscribe(data => {
      this.allLogs = (data || []).map(log => this.processLog(log));
      this.extractSites();

      // Check for query params
      this.route.queryParams.subscribe(params => {
        if (params['search']) {
          this.searchQuery = params['search'];
        }
        this.filterLogs();
      });

      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }


  processLog(log: any) {
    // Add UI helper properties
    return {
      ...log,
      site: log.siteId || 'N/A',
      ip: log.ipAddress || '0.0.0.0',
      status: (log.statusCode || 200).toString(),
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
      const matchSite = this.selectedSite === 'All Sites' || log.site === this.selectedSite;
      const matchStatus = this.selectedStatus === 'All Status' || this.checkStatus(log.status, this.selectedStatus);
      const matchMethod = this.selectedMethod === 'All Methods' || log.method === this.selectedMethod;
      const matchSearch = !this.searchQuery ||
        log.path.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        log.ip.includes(this.searchQuery);

      return matchSite && matchStatus && matchMethod && matchSearch;
    });

    // Re-render icons after filtering
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
  }

  checkStatus(logStatus: string, filterStatus: string): boolean {
    if (filterStatus === '4xx, 5xx') return logStatus.startsWith('4') || logStatus.startsWith('5');
    if (filterStatus === '2xx') return logStatus.startsWith('2');
    return true;
  }
}
