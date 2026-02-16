import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { forkJoin } from 'rxjs';


declare var lucide: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit {
  kpis: any[] = [
    { label: 'Total Logs', value: '0', change: '0', icon: 'activity', trend: 'up' },
    { label: 'Active Sites', value: '0', change: '0', icon: 'globe', trend: 'up' },
    { label: 'Anomalies', value: '0', change: '0', icon: 'alert-triangle', trend: 'down' },
    { label: 'Critical Alerts', value: '0', change: '0', icon: 'shield-alert', trend: 'up' }
  ];
  riskyEntities: any[] = [];

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    forkJoin({
      logs: this.apiService.getLogs(),
      sites: this.apiService.getSites(),
      alerts: this.apiService.getAlerts()
    }).subscribe(({ logs, sites, alerts }) => {
      const anomalies = logs.filter(l => l.isAnomaly);
      const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
      const activeSites = sites.filter(s => s.status === 'ACTIVE').length;

      this.kpis[0].value = logs.length >= 1000 ? (logs.length / 1000).toFixed(1) + 'K' : logs.length.toString();
      this.kpis[1].value = activeSites.toString();
      this.kpis[2].value = anomalies.length.toString();
      this.kpis[3].value = criticalAlerts.length.toString();


      // Top Risky Sites based on Anomaly Count
      const siteRisks = sites.map(site => {
        const siteLogs = logs.filter(l => l.siteId === site.id);
        const siteAnomalies = siteLogs.filter(l => l.isAnomaly).length;
        return {
          ...site,
          riskCount: siteAnomalies,
          riskLevel: siteAnomalies > 50 ? 'HIGH' : (siteAnomalies > 10 ? 'MEDIUM' : 'LOW')
        };
      });

      this.riskyEntities = siteRisks
        .sort((a, b) => b.riskCount - a.riskCount)
        .slice(0, 5)
        .map(site => ({
          name: site.domain || site.name,
          risk: site.riskLevel,
          count: site.riskCount,
          icon: 'globe'
        }));

      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }



  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}
