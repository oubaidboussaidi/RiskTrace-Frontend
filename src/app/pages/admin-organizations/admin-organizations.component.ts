import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, OrganizationResponse, OrganizationMemberResponse, UserResponse } from '../../services/api.service';
import { AvatarComponent } from '../../components/avatar/avatar.component';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-admin-organizations',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AvatarComponent],
    templateUrl: './admin-organizations.component.html',
    styleUrl: './admin-organizations.component.css'
})
export class AdminOrganizationsComponent implements OnInit, AfterViewInit {
    organizations: OrganizationResponse[] = [];
    filteredOrganizations: OrganizationResponse[] = [];
    allPlatformUsers: UserResponse[] = [];

    isLoading = true;
    searchTerm = '';

    // Detail view state
    selectedOrg: OrganizationResponse | null = null;
    orgMembers: OrganizationMemberResponse[] = [];;
    orgSites: any[] = [];
    isLoadingDetails = false;

    // Assign owner from platform search
    ownerSearchTerm = '';
    ownerSearchResults: UserResponse[] = [];

    constructor(private apiService: ApiService, private translate: TranslateService) { }

    ngOnInit() {
        this.loadOrganizations();
        // Pre-load all platform users for the owner search
        this.apiService.getUsers().subscribe({
            next: (users) => { this.allPlatformUsers = users || []; }
        });
    }

    ngAfterViewInit() {
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    }

    loadOrganizations() {
        this.isLoading = true;
        this.apiService.getAllOrganizations().subscribe({
            next: (orgs) => {
                this.organizations = orgs || [];
                this.filteredOrganizations = [...this.organizations];
                this.isLoading = false;
                setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
            },
            error: (err) => {
                console.error('Failed to load organizations:', err);
                this.isLoading = false;
            }
        });
    }

    filterOrganizations() {
        const term = this.searchTerm.toLowerCase();
        this.filteredOrganizations = this.organizations.filter(
            org => org.name.toLowerCase().includes(term) || org.id.toLowerCase().includes(term)
        );
    }

    toggleStatus(org: OrganizationResponse) {
        const action = org.enabled ? 'suspend' : 'activate';
        if (confirm(this.translate.instant('ADMIN_ORGS.ALERTS.ACTION_CONFIRM', { action, name: org.name }))) {
            this.apiService.updateOrganizationStatus(org.id, !org.enabled).subscribe({
                next: (updated) => {
                    const idx = this.organizations.findIndex(o => o.id === updated.id);
                    if (idx !== -1) {
                        this.organizations[idx] = updated;
                        this.filterOrganizations();
                        if (this.selectedOrg?.id === updated.id) {
                            this.selectedOrg = updated;
                        }
                        // Re-render the lucide icons for the updated lock/lock-open state
                        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
                    }
                },
                error: (err) => alert(this.translate.instant('ADMIN_ORGS.ALERTS.ACTION_FAILED', { action }) + (err.error?.error || err.error?.message || 'Error'))
            });
        }
    }

    viewDetails(org: OrganizationResponse) {
        this.selectedOrg = org;
        this.isLoadingDetails = true;
        this.orgMembers = [];
        this.orgSites = [];
        this.ownerSearchTerm = '';
        this.ownerSearchResults = [];

        this.apiService.getOrganizationMembers(org.id).subscribe({
            next: (members) => {
                this.orgMembers = members || [];
                this.checkDetailsLoaded();
            },
            error: () => this.checkDetailsLoaded()
        });

        this.apiService.getSitesByOrganization(org.id).subscribe({
            next: (sites) => {
                this.orgSites = sites || [];
                this.checkDetailsLoaded();
            },
            error: () => this.checkDetailsLoaded()
        });
    }

    private checkDetailsLoaded() {
        setTimeout(() => {
            this.isLoadingDetails = false;
            setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
        }, 500);
    }

    closeDetails() {
        this.selectedOrg = null;
        this.ownerSearchTerm = '';
        this.ownerSearchResults = [];
    }

    // ── Owner search ──────────────────────────────────────────
    searchOwnerCandidates() {
        const term = this.ownerSearchTerm.trim().toLowerCase();
        if (!term || term.length < 2) { this.ownerSearchResults = []; return; }
        this.ownerSearchResults = this.allPlatformUsers.filter(u =>
            (u.fullName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term)
        );
    }

    assignOwner(user: UserResponse) {
        if (!this.selectedOrg) return;
        const orgName = this.selectedOrg.name;
        if (!confirm(this.translate.instant('ADMIN_ORGS.ALERTS.ASSIGN_CONFIRM_NON', { name: user.fullName, org: orgName }))) return;

        this.apiService.adminAssignOwner(this.selectedOrg.id, user.id).subscribe({
            next: () => {
                // Clear search
                this.ownerSearchTerm = '';
                this.ownerSearchResults = [];
                // Reload members to reflect new ownership
                if (this.selectedOrg) this.viewDetails(this.selectedOrg);
            },
            error: (err) => alert(this.translate.instant('ADMIN_ORGS.ALERTS.ASSIGN_FAILED') + (err.error?.error || err.error?.message || 'Error'))
        });
    }

    // ── Existing member Make-Owner (from table) ───────────────
    forceTransferOwnership(org: OrganizationResponse | null, newOwnerId: string, memberName: string) {
        if (!org) return;
        if (!confirm(this.translate.instant('ADMIN_ORGS.ALERTS.ASSIGN_CONFIRM_MEM', { name: memberName, org: org.name }))) return;
        this.apiService.adminAssignOwner(org.id, newOwnerId).subscribe({
            next: () => { if (this.selectedOrg) this.viewDetails(this.selectedOrg); },
            error: (err) => alert(this.translate.instant('ADMIN_ORGS.ALERTS.ASSIGN_FAILED') + (err.error?.error || err.error?.message || 'Error'))
        });
    }

    getInitials(name: string): string {
        return name ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2) : 'OR';
    }
}
