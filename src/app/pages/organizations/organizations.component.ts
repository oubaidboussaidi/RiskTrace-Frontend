import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, OrganizationResponse } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { AvatarService } from '../../services/avatar.service';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-organizations',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TranslateModule, AvatarComponent],
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

    editingOrgId: string | null = null;

    constructor(
        private apiService: ApiService,
        private orgService: OrganizationService,
        public authService: AuthService,
        private avatarService: AvatarService,
        private translate: TranslateService
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

    canEditOrg(org: OrganizationResponse): boolean {
        return org?.currentUserRole?.trim().toUpperCase() === 'OWNER';
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
        this.editingOrgId = null;
    }

    editOrg(org: OrganizationResponse) {
        this.newOrg = { name: org.name };
        this.editingOrgId = org.id;
        this.showCreateForm = true;
    }

    saveOrganization() {
        const name = this.newOrg.name.trim();
        if (!name) {
            alert(this.translate.instant('ERR_ORG_NAME_EMPTY'));
            return;
        }

        const exists = this.organizations.some(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== this.editingOrgId);
        if (exists) {
            alert(this.translate.instant('ERR_ORG_NAME_EXISTS'));
            return;
        }

        if (this.editingOrgId) {
            if (!confirm(this.translate.instant('CONFIRM_ORG_UPDATE', { name }))) return;
            this.apiService.updateOrganization(this.editingOrgId, { name }).subscribe({
                next: (updatedOrg) => {
                    const idx = this.organizations.findIndex(o => o.id === this.editingOrgId);
                    if (idx > -1) this.organizations[idx] = updatedOrg;
                    if (this.activeOrgId === updatedOrg.id) this.orgService.setCurrentOrg(updatedOrg);
                    this.showCreateForm = false;
                    this.editingOrgId = null;
                    this.newOrg = { name: '' };
                    alert(this.translate.instant('ORGS.ALERTS.UPDATED'));
                    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
                },
                error: () => alert(this.translate.instant('ORGS.ALERTS.UPDATE_FAILED'))
            });
        } else {
            if (!confirm(this.translate.instant('CONFIRM_ORG_CREATE', { name }))) return;
            this.apiService.createOrganization({ name }).subscribe({
                next: (org) => {
                    this.organizations.unshift(org);
                    this.showCreateForm = false;
                    this.newOrg = { name: '' };
                    if (!this.activeOrgId) {
                        this.orgService.setCurrentOrg(org);
                    }
                    alert(this.translate.instant('ORGS.ALERTS.CREATED'));
                    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
                },
                error: () => alert(this.translate.instant('ORGS.ALERTS.CREATE_FAILED'))
            });
        }
    }

    switchOrg(org: OrganizationResponse) {
        this.orgService.setCurrentOrg(org);
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    }

    getInitials(name: string): string {
        return name
            ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2)
            : 'ORG';
    }

    onOrgLogoChanged(org: OrganizationResponse, dataUrl: string | null) {
        // Update org in local list so it persists in this session
        const idx = this.organizations.findIndex(o => o.id === org.id);
        if (idx > -1) {
            this.organizations[idx] = { ...this.organizations[idx], logoUrl: dataUrl };
        }
        // Also update org service if this is the active org
        if (this.activeOrgId === org.id) {
            const updatedOrg = { ...org, logoUrl: dataUrl };
            this.orgService.setCurrentOrg(updatedOrg);
        }
        this.avatarService.notifyOrgLogoChange(org.id, dataUrl);
        
        // Re-initialize icons after DOM update
        setTimeout(() => {
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 100);
    }
}
