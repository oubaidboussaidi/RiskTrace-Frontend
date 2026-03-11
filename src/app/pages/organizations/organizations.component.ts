import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, OrganizationResponse } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

declare var lucide: any;

@Component({
    selector: 'app-organizations',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './organizations.component.html',
    styleUrl: './organizations.component.css'
})
export class OrganizationsComponent implements OnInit, AfterViewInit {
    organizations: OrganizationResponse[] = [];
    activeOrgId: string | null = null;
    showCreateForm = false;
    isLoading = false;
    errorMessage = '';

    newOrg = { name: '' };

    constructor(
        private apiService: ApiService,
        private orgService: OrganizationService,
        public authService: AuthService
    ) { }

    ngOnInit() {
        this.loadOrganizations();
        this.orgService.currentOrg$.subscribe(org => {
            this.activeOrgId = org?.id ?? null;
        });
    }

    ngAfterViewInit() {
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    }

    loadOrganizations() {
        this.isLoading = true;
        this.apiService.getMyOrganizations().subscribe({
            next: (orgs) => {
                this.organizations = orgs || [];
                this.isLoading = false;
                setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
            },
            error: () => {
                this.isLoading = false;
                this.errorMessage = 'Failed to load organizations.';
            }
        });
    }

    toggleCreateForm() {
        this.showCreateForm = !this.showCreateForm;
        this.newOrg = { name: '' };
    }

    createOrganization() {
        if (!this.newOrg.name.trim()) {
            alert('Organization name is required.');
            return;
        }

        this.apiService.createOrganization({ name: this.newOrg.name.trim() }).subscribe({
            next: (org) => {
                this.organizations.unshift(org);
                this.showCreateForm = false;
                this.newOrg = { name: '' };
                // Set as active org if none exists
                if (!this.activeOrgId) {
                    this.orgService.setCurrentOrg(org);
                }
                setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
            },
            error: () => alert('Failed to create organization.')
        });
    }

    switchOrg(org: OrganizationResponse) {
        this.orgService.setCurrentOrg(org);
    }

    getInitials(name: string): string {
        return name
            ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2)
            : 'ORG';
    }
}
