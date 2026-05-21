import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService, OrganizationResponse } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class OrganizationService {
    private currentOrgSubject = new BehaviorSubject<OrganizationResponse | null>(null);
    public currentOrg$: Observable<OrganizationResponse | null> = this.currentOrgSubject.asObservable();

    private myOrgsSubject = new BehaviorSubject<OrganizationResponse[]>([]);
    public myOrgs$: Observable<OrganizationResponse[]> = this.myOrgsSubject.asObservable();

    constructor(private apiService: ApiService) { }

    get currentOrg(): OrganizationResponse | null {
        return this.currentOrgSubject.value;
    }

    /** Load all orgs the current user belongs to and pick the first as active */
    loadMyOrganizations(): Observable<OrganizationResponse[]> {
        return this.apiService.getMyOrganizations().pipe(
            tap(orgs => {
                this.myOrgsSubject.next(orgs || []);
                // Restore from localStorage if available, else pick first
                const storedOrgId = localStorage.getItem('activeOrgId');
                const target = storedOrgId
                    ? (orgs.find(o => o.id === storedOrgId) ?? orgs[0])
                    : orgs[0];
                if (target) {
                    this.setCurrentOrg(target);
                }
            })
        );
    }

    setCurrentOrg(org: OrganizationResponse): void {
        this.currentOrgSubject.next(org);
        localStorage.setItem('activeOrgId', org.id);
    }

    clearOrg(): void {
        this.currentOrgSubject.next(null);
        this.myOrgsSubject.next([]);
        localStorage.removeItem('activeOrgId');
    }
}
