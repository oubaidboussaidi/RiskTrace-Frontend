import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataService {
    constructor() { }

    getData(_key: string): Observable<any[]> {
        return of([]);
    }
}
