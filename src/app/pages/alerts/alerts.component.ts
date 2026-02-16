import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var lucide: any;

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent implements OnInit, AfterViewInit {
  // Mock rules for now as backend doesn't support dynamic rules yet
  alertRules: any[] = [
    { id: 1, name: 'High Anomaly Score', condition: 'Score > 0.8', action: 'Email Admin', enabled: true },
    { id: 2, name: 'Repeated Failed Login', condition: '> 5 attempts / min', action: 'Block IP', enabled: true },
    { id: 3, name: 'SQL Injection Pattern', condition: 'Regex Match', action: 'Log & Alert', enabled: false }
  ];

  constructor() { }

  ngOnInit() {
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
  }


  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  toggleRule(rule: any) {
    rule.enabled = !rule.enabled;
  }
}
