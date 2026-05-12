import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import { forkJoin, Subscription } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

declare var lucide: any;
declare var ApexCharts: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  kpis: any[] = [
    { label: 'DASHBOARD.KPI.TOTAL_LOGS', value: '0', icon: 'activity', trend: 'up', change: '+0%' },
    { label: 'DASHBOARD.KPI.ACTIVE_SITES', value: '0', icon: 'globe', trend: 'up', change: '+0%' },
    { label: 'DASHBOARD.KPI.ANOMALIES', value: '0', icon: 'alert-triangle', trend: 'down', change: '0%' },
    { label: 'DASHBOARD.KPI.CRITICAL_ALERTS', value: '0', icon: 'shield-alert', trend: 'up', change: '0%' }
  ];

  riskyEntities: any[] = [];
  recentAlerts: any[] = [];

  private charts: any[] = [];
  private orgSub?: Subscription;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private orgService: OrganizationService,
    private router: Router
  ) {}

  ngOnInit() {
    // Redirect admin users to their own dashboard
    if (this.authService.isAdmin() || this.authService.isPlatformAdmin()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }

    this.orgSub = this.orgService.currentOrg$.subscribe(org => {
      if (org) {
        this.loadDashboardData(org.id);
      } else {
        // If the user has no active organization, redirect to the organizations page
        this.router.navigate(['/organizations']);
      }
    });
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  ngOnDestroy() {
    this.orgSub?.unsubscribe();
    this.charts.forEach(c => c.destroy());
  }

  private loadDashboardData(orgId: string) {
    forkJoin({
      logs: this.apiService.getLogsByOrganization(orgId),
      sites: this.apiService.getSitesByOrganization(orgId),
      alerts: this.apiService.getAlertsByOrganization(orgId)
    }).subscribe(({ logs, sites, alerts }) => {
      const anomalies = (logs || []).filter((l: any) => l.isAnomaly);
      const criticalAlerts = (alerts || []).filter((a: any) => a.severity === 'CRITICAL' || a.severity === 'HIGH');
      const activeSites = (sites || []).filter((s: any) => s.status === 'ACTIVE').length;

      // KPIs
      this.kpis[0].value = logs.length >= 1000 ? (logs.length / 1000).toFixed(1) + 'K' : logs.length.toString();
      this.kpis[1].value = activeSites.toString();
      this.kpis[2].value = anomalies.length.toString();
      this.kpis[3].value = criticalAlerts.length.toString();

      // Risky Sites
      const siteRisks = (sites || []).map((site: any) => {
        const siteLogs = logs.filter((l: any) => l.siteId === site.id);
        const siteAnomalies = siteLogs.filter((l: any) => l.isAnomaly).length;
        return {
          ...site,
          riskCount: siteAnomalies,
          riskLevel: siteAnomalies > 50 ? 'HIGH' : (siteAnomalies > 10 ? 'MEDIUM' : 'LOW')
        };
      });
      this.riskyEntities = siteRisks
        .sort((a: any, b: any) => b.riskCount - a.riskCount)
        .slice(0, 5)
        .map((site: any) => ({
          name: site.domain || site.siteName || site.name,
          risk: site.riskLevel,
          count: site.riskCount,
          icon: 'globe'
        }));

      // Recent Alerts
      this.recentAlerts = (alerts || [])
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .map((a: any) => ({
          type: a.type || 'SUSPICIOUS_ACTIVITY',
          severity: a.severity,
          description: a.description || a.type,
          time: this.timeAgo(a.timestamp),
          severityClass: this.getSeverityClass(a.severity)
        }));

      // Build Charts
      setTimeout(() => {
        this.buildCharts(logs, alerts);
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }, 100);
    });
  }

  private buildCharts(logs: any[], alerts: any[]) {
    // Destroy previous charts
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    this.buildLogVolumeChart(logs);
    this.buildAnomalyDistributionChart(logs);
    this.buildHttpMethodsChart(logs);
  }

  // ── Chart 1: Log Volume Over Time (Area/Line) ──────────────
  private buildLogVolumeChart(logs: any[]) {
    const el = document.querySelector('#chart-log-volume');
    if (!el) return;

    // Group logs by day (last 7 days)
    const now = new Date();
    const days: string[] = [];
    const normalCounts: number[] = [];
    const anomalyCounts: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));

      const dayLogs = logs.filter(l => {
        if (!l.createdAt) return false;
        return l.createdAt.startsWith(key);
      });
      const anomalyCount = dayLogs.filter(l => l.isAnomaly).length;
      normalCounts.push(dayLogs.length - anomalyCount);
      anomalyCounts.push(anomalyCount);
    }

    const chart = new ApexCharts(el, {
      chart: {
        type: 'area',
        height: 280,
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [
        { name: 'Normal', data: normalCounts },
        { name: 'Anomalies', data: anomalyCounts }
      ],
      xaxis: {
        categories: days,
        labels: { style: { colors: '#8b949e', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#8b949e', fontSize: '11px' } }
      },
      colors: ['#58a6ff', '#f85149'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 95, 100]
        }
      },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#30363d',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } }
      },
      legend: {
        labels: { colors: '#8b949e' },
        position: 'top',
        horizontalAlign: 'right'
      },
      tooltip: {
        theme: 'dark',
        x: { show: true }
      }
    });
    chart.render();
    this.charts.push(chart);
  }

  // ── Chart 2: Anomaly Score Distribution (Donut) ────────────
  private buildAnomalyDistributionChart(logs: any[]) {
    const el = document.querySelector('#chart-anomaly-dist');
    if (!el) return;

    let safe = 0, suspicious = 0, critical = 0;
    logs.forEach(l => {
      const score = l.anomalyScore || 0;
      if (score > 0.7) critical++;
      else if (score > 0.4) suspicious++;
      else safe++;
    });

    const chart = new ApexCharts(el, {
      chart: {
        type: 'donut',
        height: 280,
        background: 'transparent',
        fontFamily: 'Inter, sans-serif'
      },
      series: [safe, suspicious, critical],
      labels: ['Safe', 'Suspicious', 'Critical'],
      colors: ['#3fb950', '#d29922', '#f85149'],
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Logs',
                color: '#8b949e',
                formatter: () => logs.length.toString()
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        labels: { colors: '#8b949e' }
      },
      stroke: { show: false },
      tooltip: { theme: 'dark' }
    });
    chart.render();
    this.charts.push(chart);
  }

  // ── Chart 3: HTTP Methods Breakdown (Horizontal Bar) ───────
  private buildHttpMethodsChart(logs: any[]) {
    const el = document.querySelector('#chart-http-methods');
    if (!el) return;

    const methodCounts: { [key: string]: number } = {};
    logs.forEach(l => {
      const method = (l.method || 'UNKNOWN').toUpperCase();
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    const methods = Object.keys(methodCounts).sort((a, b) => methodCounts[b] - methodCounts[a]);
    const counts = methods.map(m => methodCounts[m]);
    const methodColors: { [key: string]: string } = {
      'GET': '#3fb950', 'POST': '#58a6ff', 'PUT': '#d29922',
      'DELETE': '#f85149', 'PATCH': '#a371f7', 'OPTIONS': '#8b949e'
    };
    const colors = methods.map(m => methodColors[m] || '#6e7681');

    const chart = new ApexCharts(el, {
      chart: {
        type: 'bar',
        height: 280,
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [{ name: 'Requests', data: counts }],
      xaxis: {
        categories: methods,
        labels: { style: { colors: '#8b949e', fontSize: '12px', fontWeight: 600 } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#8b949e', fontSize: '11px' } }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 6,
          columnWidth: '50%',
          distributed: true
        }
      },
      colors: colors,
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#30363d',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } }
      },
      legend: { show: false },
      tooltip: { theme: 'dark' }
    });
    chart.render();
    this.charts.push(chart);
  }

  // ── Helpers ──────────────────────────────────────────────────
  private getSeverityClass(severity: string): string {
    if (severity === 'CRITICAL' || severity === 'HIGH') return 'status-alert';
    if (severity === 'MEDIUM') return 'status-warning';
    return 'status-success';
  }

  private timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
