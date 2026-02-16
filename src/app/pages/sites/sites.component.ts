import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

declare var lucide: any;

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sites.component.html',
  styleUrl: './sites.component.css'
})
export class SitesComponent implements OnInit, AfterViewInit {
  sites: any[] = [];
  showHelp: boolean = false;
  showCreateForm: boolean = false;
  selectedSite: any = null;   // site selected when clicking "How to Integrate" for a specific site
  copiedSiteId: string | null = null; // for copy feedback

  newSite = {
    siteName: '',
    domain: ''
  };

  // The log collect endpoint — tracker.js sends logs here
  readonly logEndpoint = environment.apiUrl.replace('/api', '') + '/api/logs/collect';

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.refreshSites();
  }

  refreshSites() {
    this.apiService.getSites().subscribe(sites => {
      this.sites = sites || [];
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
  }

  createSite() {
    if (!this.newSite.siteName || !this.newSite.domain) {
      alert('Please fill in all fields');
      return;
    }

    this.apiService.createSite(this.newSite).subscribe({
      next: () => {
        this.refreshSites();
        this.showCreateForm = false;
        this.newSite = { siteName: '', domain: '' };
      },
      error: () => alert('Failed to create site.')
    });
  }

  deleteSite(site: any) {
    if (confirm(`Delete "${site.siteName}"? This will invalidate its API key immediately.`)) {
      this.apiService.deleteSite(site.id).subscribe({
        next: () => this.sites = this.sites.filter(s => s.id !== site.id),
        error: () => alert('Failed to delete site.')
      });
    }
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /** Opens the "How to Integrate" modal for a specific site (shows personalised script) */
  showIntegration(site: any) {
    this.selectedSite = site;
    this.showHelp = true;
  }

  /** Opens the generic help modal (no specific site chosen) */
  openHelp() {
    this.selectedSite = null;
    this.showHelp = true;
  }

  /**
   * Copies the full tracker script with the real API key embedded.
   * If called from a site card, uses that site's apiKey.
   * If called from the generic help modal, copies a template with YOUR_KEY.
   */
  copyScript(site?: any) {
    const apiKey = site?.apiKey || this.selectedSite?.apiKey || 'YOUR_API_KEY';
    const script = this.buildTrackerScript(apiKey);
    navigator.clipboard.writeText(script).then(() => {
      this.copiedSiteId = site?.id || null;
      setTimeout(() => this.copiedSiteId = null, 2000);
      if (!site) this.showHelp = false;
    });
  }

  /** Copies just the <script> tag (embed snippet) */
  copyEmbed(site: any) {
    const tag = `<script src="http://localhost:8080/tracker.js" data-api-key="${site.apiKey}"></script>`;
    navigator.clipboard.writeText(tag).then(() => {
      this.copiedSiteId = site.id;
      setTimeout(() => this.copiedSiteId = null, 2000);
    });
  }

  regenerateKey(siteId: string) {
    if (confirm('Are you sure? This will invalidate the old key immediately.')) {
      this.apiService.regenerateApiKey(siteId).subscribe(updatedSite => {
        const index = this.sites.findIndex(s => s.id === updatedSite.id);
        if (index !== -1) {
          this.sites[index] = updatedSite;
        }
      });
    }
  }

  /** Builds the full tracker script with the given API key and log endpoint */
  buildTrackerScript(apiKey: string): string {
    return `(function () {
  "use strict";

  const SCRIPT = document.currentScript || (function () {
    const scripts = document.getElementsByTagName("script");
    for (let s of scripts) { if (s.getAttribute("data-api-key")) return s; }
    return null;
  })();

  const API_KEY = "${apiKey}";
  const DEBUG   = SCRIPT?.getAttribute("data-debug") === "true";
  const API_URL = SCRIPT?.getAttribute("data-endpoint") || "${this.logEndpoint}";

  if (!API_KEY) { console.error("[Tracker] Missing API key."); return; }

  let SESSION_ID = sessionStorage.getItem("tracker_session_id");
  if (!SESSION_ID) {
    SESSION_ID = "s_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
    sessionStorage.setItem("tracker_session_id", SESSION_ID);
  }

  const logQueue = [];
  let batchTimer = null;

  function enqueueLog(logData) {
    logQueue.push({
      apiKey: API_KEY, sessionId: SESSION_ID,
      ipAddress: null, country: null, city: null,
      url: logData.url || window.location.pathname,
      method: logData.method || "GET",
      statusCode: logData.statusCode || null,
      userAgent: navigator.userAgent,
      device: getDeviceType(),
      responseTime: logData.responseTime || null,
      type: logData.type,
      createdAt: new Date().toISOString()
    });
    if (DEBUG) console.log("[Tracker] Log queued", logData);
    if (logQueue.length >= 10) flushLogs();
    else if (!batchTimer) batchTimer = setTimeout(flushLogs, 5000);
  }

  function flushLogs() {
    if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
    if (logQueue.length === 0) return;
    const payload = logQueue.slice(); logQueue.length = 0;
    fetch(API_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), keepalive: true
    }).catch(() => logQueue.unshift(...payload));
  }

  function getDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/.test(ua)) return "mobile";
    if (/tablet|ipad/.test(ua)) return "tablet";
    return "desktop";
  }

  let requestCount = 0, alertSentThisMinute = false;
  function incrementRequestCount() {
    requestCount++;
    if (requestCount > 20 && !alertSentThisMinute) {
      enqueueLog({ type: "suspicious_activity", method: "GET", statusCode: 429 });
      alertSentThisMinute = true;
    }
  }
  setInterval(() => { requestCount = 0; alertSentThisMinute = false; }, 60000);

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const start = performance.now();
    const [url, options = {}] = args;
    const method = options.method || "GET";
    const own = typeof url === "string" && url.includes(API_URL);
    if (!own) { incrementRequestCount(); enqueueLog({ type: "fetch_request", url: typeof url === "string" ? url : url.url, method }); }
    return originalFetch.apply(this, args).then(res => {
      if (!own) enqueueLog({ type: "fetch_response", url: typeof url === "string" ? url : url.url, method, statusCode: res.status, responseTime: Math.round(performance.now() - start) });
      return res;
    });
  };

  const origOpen = XMLHttpRequest.prototype.open, origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) { this._t = { method, url }; return origOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    if (this._t) {
      this._t.startTime = performance.now();
      const own = this._t.url.includes(API_URL);
      if (!own) incrementRequestCount();
      this.addEventListener("loadend", () => {
        if (!own && this._t) enqueueLog({ type: "xhr_response", url: this._t.url, method: this._t.method, statusCode: this.status, responseTime: Math.round(performance.now() - this._t.startTime) });
      });
    }
    return origSend.apply(this, arguments);
  };

  window.addEventListener("load", () => {
    const perf = performance.getEntriesByType("navigation")[0];
    enqueueLog({ type: "page_load", method: "GET", statusCode: 200, responseTime: perf ? Math.round(perf.duration) : null });
  });

  document.addEventListener("submit", e => {
    const form = e.target;
    enqueueLog({ type: "form_submit", method: (form.method || "POST").toUpperCase(), url: form.action || window.location.pathname });
  });

  window.addEventListener("error", e => enqueueLog({ type: "js_error", method: "GET", statusCode: 500, url: e.filename || window.location.pathname }));
  window.addEventListener("unhandledrejection", () => enqueueLog({ type: "unhandled_promise_rejection", method: "GET", statusCode: 500 }));
  window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushLogs(); });
  setTimeout(flushLogs, 2000);
})();`;
  }
}
