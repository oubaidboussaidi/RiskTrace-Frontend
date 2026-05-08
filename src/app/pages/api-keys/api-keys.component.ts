import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './api-keys.component.html',
  styleUrl: './api-keys.component.css'
})
export class ApiKeysComponent implements OnInit, AfterViewInit {
  apiKeys: any[] = [];

  constructor(private dataService: DataService, private translate: TranslateService) { }

  ngOnInit() {
    this.dataService.getData('api_keys').subscribe(data => {
      this.apiKeys = data || [];
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  copyKey(key: string) {
    // Future: Implement clipboard copy
    console.log('Copying key:', key);
  }

  revokeKey(keyId: string) {
    const key = this.apiKeys.find(k => k.id === keyId);
    if (key) key.status = 'Revoked';
  }

  generateKey() {
    alert(this.translate.instant('API_KEYS.ALERTS.GENERATE_NOT_IMPL'));

  }
}
