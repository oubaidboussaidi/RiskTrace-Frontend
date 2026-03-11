import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/**
 * DataService – placeholder service.
 * All mock data has been removed. Components that need real data
 * should use ApiService and call the actual backend endpoints.
 */
@Injectable({
    providedIn: 'root'
})
export class DataService {
    constructor() { }

    getData(_key: string): Observable<any[]> {
        return of([]);
    }
}
