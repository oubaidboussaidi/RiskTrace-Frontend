import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    // This service provides mock data for dashboard statistics
    // In a real application, this would fetch from your backend APIs
    
    constructor(private http: HttpClient) { }

    getData(key: string): Observable<any> {
        const mockData: { [key: string]: any } = {
            dashboard_kpis: [
                { label: 'Total Logs', value: '124.5K', change: '+12%', icon: 'activity', trend: 'up' },
                { label: 'Active Sites', value: '12', change: '+2', icon: 'globe', trend: 'up' },
                { label: 'Anomalies', value: '23', change: '-8%', icon: 'alert-triangle', trend: 'down' },
                { label: 'Critical Alerts', value: '3', change: '+1', icon: 'shield-alert', trend: 'up' }
            ],
            risky_entities: [
                { name: 'Site: example.com', risk: 'HIGH', count: 12, icon: 'globe' },
                { name: 'IP: 192.168.1.45', risk: 'MEDIUM', count: 8, icon: 'wifi' },
                { name: 'Path: /api/admin', risk: 'HIGH', count: 15, icon: 'file-code' }
            ]
        };

        return of(mockData[key] || []);
    }
}
