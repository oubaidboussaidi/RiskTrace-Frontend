import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

declare var lucide: any;

import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './incidents.component.html',
  styleUrl: './incidents.component.css'
})
export class IncidentsComponent implements OnInit, AfterViewInit {
  incidents: any[] = [];
  showCreateForm: boolean = false;

  newIncident = {
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'MEDIUM',
    description: '',
    targetPath: '/',
    sourceIp: '0.0.0.0',
    status: 'OPEN'
  };

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.refreshIncidents();
  }

  refreshIncidents() {
    this.apiService.getAlerts().subscribe(data => {
      this.incidents = (data || []).map(alert => this.processAlert(alert));
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
  }

  createIncident() {
    if (!this.newIncident.description) {
      alert('Description is required');
      return;
    }

    this.apiService.createAlert(this.newIncident).subscribe({
      next: () => {
        this.refreshIncidents();
        this.showCreateForm = false;
        this.newIncident = {
          type: 'SUSPICIOUS_ACTIVITY',
          severity: 'MEDIUM',
          description: '',
          targetPath: '/',
          sourceIp: '0.0.0.0',
          status: 'OPEN'
        };
        alert('Incident reported successfully.');
      },
      error: () => alert('Failed to create incident.')
    });
  }



  processAlert(alert: any) {
    return {
      ...alert,
      title: alert.type || 'Unknown Threat',
      details: alert.description || `${alert.type} detected on ${alert.targetPath} from ${alert.sourceIp}`,
      assignee: 'Unassigned', // Default for now
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

  updateStatus(incident: any) {
    if (incident.assignee === 'Unassigned') {
      // Assign to current user
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      // In a real app, we'd assign to userId. For now, mark as "IN_PROGRESS"
      this.apiService.updateAlertStatus(incident.id, 'IN_PROGRESS').subscribe(() => {
        incident.assignee = currentUser.name || 'Me';
        alert('Incident assigned to you.');
      });
    } else {
      // Mark as Resolved
      if (confirm('Mark this incident as resolved?')) {
        this.apiService.updateAlertStatus(incident.id, 'RESOLVED').subscribe(() => {
          // Remove from list or update UI
          this.incidents = this.incidents.filter(i => i.id !== incident.id);
        });
      }
    }
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }
}


