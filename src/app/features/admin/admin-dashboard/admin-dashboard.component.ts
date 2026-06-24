import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@core/services/api.service';
import { forkJoin } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

declare var lucide: any;
declare var ApexCharts: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  kpis: any[] = [
    { label: 'ADMIN_DASHBOARD.KPI.TOTAL_USERS', value: '0', icon: 'users', color: '#58a6ff' },
    { label: 'ADMIN_DASHBOARD.KPI.TOTAL_ORGS', value: '0', icon: 'building-2', color: '#a371f7' },
    { label: 'ADMIN_DASHBOARD.KPI.TOTAL_LOGS', value: '0', icon: 'activity', color: '#3fb950' },
    { label: 'ADMIN_DASHBOARD.KPI.CRITICAL_ALERTS', value: '0', icon: 'shield-alert', color: '#f85149' }
  ];

  orgHealthData: any[] = [];
  private charts: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadAdminData();
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
  }

  private loadAdminData() {
    forkJoin({
      users: this.apiService.getUsers(),
      organizations: this.apiService.getAllOrganizations(),
      logs: this.apiService.getLogs(),
      alerts: this.apiService.getAlerts()
    }).subscribe(({ users, organizations, logs, alerts }) => {
      const criticalAlerts = (alerts || []).filter((a: any) => a.severity === 'CRITICAL' || a.severity === 'HIGH');

      // KPIs
      this.kpis[0].value = (users || []).length.toString();
      this.kpis[1].value = (organizations || []).length.toString();
      const logCount = (logs || []).length;
      this.kpis[2].value = logCount >= 1000 ? (logCount / 1000).toFixed(1) + 'K' : logCount.toString();
      this.kpis[3].value = criticalAlerts.length.toString();

      // Org Health Table
      this.orgHealthData = (organizations || []).map((org: any) => {
        const orgLogs = (logs || []).filter((l: any) => l.organizationId === org.id);
        const orgAnomalies = orgLogs.filter((l: any) => l.isAnomaly).length;
        const orgAlerts = (alerts || []).filter((a: any) => a.organizationId === org.id).length;
        return {
          name: org.name,
          enabled: org.enabled,
          membersCount: org.membersCount || 0,
          logCount: orgLogs.length,
          anomalyCount: orgAnomalies,
          alertCount: orgAlerts,
          healthClass: orgAnomalies > 20 ? 'status-alert' : (orgAnomalies > 5 ? 'status-warning' : 'status-success'),
          healthLabel: orgAnomalies > 20 ? 'HIGH_RISK' : (orgAnomalies > 5 ? 'MODERATE' : 'HEALTHY')
        };
      }).sort((a: any, b: any) => b.anomalyCount - a.anomalyCount);

      setTimeout(() => {
        this.buildCharts(users, organizations, logs, alerts);
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }, 100);
    });
  }

  private buildCharts(users: any[], organizations: any[], logs: any[], alerts: any[]) {
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    this.buildLogsPerOrgChart(logs, organizations);
    this.buildAlertSeverityChart(alerts);
    this.buildUserRolesChart(users);
    this.buildPlatformActivityChart(logs);
  }

  // ── Chart 1: Logs Per Organization (Bar) ───────────────────
  private buildLogsPerOrgChart(logs: any[], organizations: any[]) {
    const el = document.querySelector('#admin-chart-logs-org');
    if (!el) return;

    const orgMap = new Map<string, string>();
    (organizations || []).forEach((o: any) => orgMap.set(o.id, o.name || o.id));

    const orgCounts: { [key: string]: number } = {};
    (logs || []).forEach((l: any) => {
      const orgName = orgMap.get(l.organizationId) || 'Unknown';
      orgCounts[orgName] = (orgCounts[orgName] || 0) + 1;
    });

    const sorted = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const orgNames = sorted.map(e => e[0]);
    const counts = sorted.map(e => e[1]);

    const chart = new ApexCharts(el, {
      chart: {
        type: 'bar',
        height: 300,
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [{ name: 'Logs', data: counts }],
      xaxis: {
        categories: orgNames,
        labels: {
          style: { colors: '#8b949e', fontSize: '11px' },
          rotate: -45,
          trim: true,
          maxHeight: 80
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#8b949e', fontSize: '11px' } }
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '55%'
        }
      },
      colors: ['#58a6ff'],
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          gradientToColors: ['#a371f7'],
          stops: [0, 100]
        }
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#30363d',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } }
      },
      tooltip: { theme: 'dark' }
    });
    chart.render();
    this.charts.push(chart);
  }

  // ── Chart 2: Alert Severity Distribution (Donut) ───────────
  private buildAlertSeverityChart(alerts: any[]) {
    const el = document.querySelector('#admin-chart-severity');
    if (!el) return;

    let critical = 0, high = 0, medium = 0, low = 0;
    (alerts || []).forEach((a: any) => {
      switch (a.severity) {
        case 'CRITICAL': critical++; break;
        case 'HIGH': high++; break;
        case 'MEDIUM': medium++; break;
        default: low++;
      }
    });

    const activeSeries = [];
    const activeLabels = [];
    const activeColors = [];

    if (critical > 0) { activeSeries.push(critical); activeLabels.push('Critical'); activeColors.push('#f85149'); }
    if (high > 0) { activeSeries.push(high); activeLabels.push('High'); activeColors.push('#fb8f24'); }
    if (medium > 0) { activeSeries.push(medium); activeLabels.push('Medium'); activeColors.push('#d29922'); }
    if (low > 0) { activeSeries.push(low); activeLabels.push('Low'); activeColors.push('#3fb950'); }

    // Fallback if there are no alerts at all
    if (activeSeries.length === 0) {
      activeSeries.push(1);
      activeLabels.push('No Alerts');
      activeColors.push('#30363d');
    }

    const chart = new ApexCharts(el, {
      chart: {
        type: 'donut',
        height: 300,
        background: 'transparent',
        fontFamily: 'Inter, sans-serif'
      },
      series: activeSeries,
      labels: activeLabels,
      colors: activeColors,
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Alerts',
                color: '#8b949e',
                formatter: () => (alerts || []).length.toString()
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

  // ── Chart 3: User Roles Distribution (Pie) ─────────────────
  private buildUserRolesChart(users: any[]) {
    const el = document.querySelector('#admin-chart-roles');
    if (!el) return;

    let admins = 0, regularUsers = 0;
    (users || []).forEach((u: any) => {
      if (u.role === 'ADMIN') admins++;
      else regularUsers++;
    });

    const chart = new ApexCharts(el, {
      chart: {
        type: 'pie',
        height: 300,
        background: 'transparent',
        fontFamily: 'Inter, sans-serif'
      },
      series: [admins, regularUsers],
      labels: ['Admin', 'Analyst'],
      colors: ['#f85149', '#58a6ff'],
      dataLabels: {
        enabled: true,
        style: { fontSize: '13px', fontWeight: 600, colors: ['#fff'] },
        dropShadow: { enabled: false }
      },
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

  // ── Chart 4: Platform Activity Over Time (Area) ────────────
  private buildPlatformActivityChart(logs: any[]) {
    const el = document.querySelector('#admin-chart-activity');
    if (!el) return;

    const now = new Date();
    const days: string[] = [];
    const counts: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));

      const dayLogs = (logs || []).filter((l: any) => {
        if (!l.createdAt) return false;
        return l.createdAt.startsWith(key);
      });
      counts.push(dayLogs.length);
    }

    const chart = new ApexCharts(el, {
      chart: {
        type: 'area',
        height: 300,
        background: 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif',
        zoom: { enabled: false }
      },
      series: [{ name: 'Events', data: counts }],
      xaxis: {
        categories: days,
        labels: {
          style: { colors: '#8b949e', fontSize: '10px' },
          rotate: -45,
          rotateAlways: true,
          hideOverlappingLabels: true
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 10
      },
      yaxis: {
        labels: { style: { colors: '#8b949e', fontSize: '11px' } }
      },
      colors: ['#a371f7'],
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 95, 100]
        }
      },
      stroke: { curve: 'smooth', width: 2.5 },
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#30363d',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } }
      },
      tooltip: {
        theme: 'dark',
        x: { show: true }
      }
    });
    chart.render();
    this.charts.push(chart);
  }

  getInitials(name: string): string {
    return name ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2) : 'OR';
  }
}
