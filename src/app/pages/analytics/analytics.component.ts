import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

declare var lucide: any;

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit, AfterViewInit {
  featureImportance: any[] = [
    { feature: 'Session Duration', importance: 0.85 },
    { feature: 'Number of Requests', importance: 0.72 },
    { feature: 'HTTP Method Ratio', importance: 0.65 },
    { feature: 'User Agent Variance', importance: 0.45 }
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
}
