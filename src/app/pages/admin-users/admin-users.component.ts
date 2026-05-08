import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, UserResponse, OrganizationResponse, OrganizationMemberResponse } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { forkJoin, firstValueFrom } from 'rxjs';

declare var lucide: any;

interface OrgOwnershipConflict {
    org: OrganizationResponse;
    members: OrganizationMemberResponse[];
}

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-admin-users',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AvatarComponent],
    templateUrl: './admin-users.component.html',
    styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit, AfterViewInit {
    users: UserResponse[] = [];
    filteredUsers: UserResponse[] = [];
    isLoading = true;

    // Pagination
    currentPage: number = 1;
    pageSize: number = 10;
    Math = Math;

    searchTerm = '';
    roleFilter = '';
    ownerFilter = ''; // '' = all | 'owner' = org owners only | 'non-owner' = non-owners only

    // Platform roles
    readonly roles = ['USER', 'ADMIN'];

    // ── Transfer Ownership Modal ──────────────────────────────
    showOwnershipModal = false;
    ownershipTargetUser: UserResponse | null = null;
    ownershipConflicts: OrgOwnershipConflict[] = [];
    isLoadingConflicts = false;

    // Per-conflict: search platform users
    platformUserSearch: { [orgId: string]: string } = {};
    platformUserResults: { [orgId: string]: UserResponse[] } = {};
    isSearchingUsers: { [orgId: string]: boolean } = {};

    // ── Org ownership tracking ────────────────────────────────
    userOwnedOrgs: { [userId: string]: string[] } = {};

    constructor(
        private apiService: ApiService,
        public authService: AuthService,
        private translate: TranslateService
    ) { }

    ngOnInit() { this.loadUsers(); }

    ngAfterViewInit() {
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    }

    loadUsers() {
        this.isLoading = true;
        this.apiService.getUsers().subscribe({
            next: (users) => {
                this.users = users || [];
                this.applyFilter();
                this.isLoading = false;
                this.loadOrgOwnerships();
                setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
            },
            error: (err) => {
                console.error('Failed to load users:', err);
                this.isLoading = false;
            }
        });
    }

    /** Fetch all orgs + members to build a userId → orgName[] map */
    private async loadOrgOwnerships() {
        try {
            const orgs = await firstValueFrom(this.apiService.getAllOrganizations());
            const map: { [userId: string]: string[] } = {};
            for (const org of orgs || []) {
                const members = await firstValueFrom(this.apiService.getOrganizationMembers(org.id));
                for (const m of members || []) {
                    if (m.role === 'OWNER') {
                        if (!map[m.userId]) map[m.userId] = [];
                        map[m.userId].push(org.name);
                    }
                }
            }
            this.userOwnedOrgs = map;
            this.applyFilter(); // re-apply now that ownership data is loaded
        } catch (e) {
            console.error('Failed to load org ownerships:', e);
        }
    }

    getOwnedOrgNames(userId: string): string[] {
        return this.userOwnedOrgs[userId] || [];
    }

    isSelf(user: UserResponse): boolean {
        return user.id === this.authService.currentUserValue?.id;
    }

    filterUsers() { this.applyFilter(); }

    private applyFilter() {
        const term = this.searchTerm.toLowerCase();
        this.filteredUsers = this.users.filter(u => {
            const matchesTerm = u.fullName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
            const matchesRole = this.roleFilter ? u.role === this.roleFilter : true;
            const isOwner = this.getOwnedOrgNames(u.id).length > 0;
            const matchesOwner = this.ownerFilter === 'owner' ? isOwner
                               : this.ownerFilter === 'non-owner' ? !isOwner
                               : true;
            return matchesTerm && matchesRole && matchesOwner;
        });

        this.currentPage = 1; // Reset to page 1 on filter
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
    }

    get totalPages(): number {
        return Math.ceil(this.filteredUsers.length / this.pageSize);
    }

    get paginatedUsers() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredUsers.slice(start, start + this.pageSize);
    }

    getPages(): number[] {
        const pages = [];
        const total = this.totalPages;
        let start = Math.max(1, this.currentPage - 2);
        let end = Math.min(total, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    }

    prevPage() {
        if (this.currentPage > 1) { this.currentPage--; this.refreshIcons(); }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) { this.currentPage++; this.refreshIcons(); }
    }

    goToPage(page: number) {
        this.currentPage = page;
        this.refreshIcons();
    }

    private refreshIcons() {
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 50);
    }

    private syncUser(updated: UserResponse) {
        const masterIdx = this.users.findIndex(u => u.id === updated.id);
        if (masterIdx !== -1) this.users[masterIdx] = updated;
        const filteredIdx = this.filteredUsers.findIndex(u => u.id === updated.id);
        if (filteredIdx !== -1) this.filteredUsers[filteredIdx] = updated;
        this.refreshIcons();
    }

    changeRole(user: UserResponse, newRole: string) {
        if (user.role === newRole) return;
        const oldRole = user.role;
        if (confirm(this.translate.instant('ADMIN_USERS.ALERTS.ROLE_CONFIRM', { name: user.fullName, role: newRole }))) {
            this.apiService.updateUserRole(user.id, newRole).subscribe({
                next: (updated) => this.syncUser(updated),
                error: (err) => {
                    alert(this.translate.instant('ADMIN_USERS.ALERTS.ROLE_FAILED') + (err.error?.error || err.error?.message || 'Error'));
                    // Revert on failure
                    user.role = oldRole;
                }
            });
        } else {
            // User cancelled — revert select
            user.role = oldRole;
        }
    }

    toggleStatus(user: UserResponse) {
        const action = user.enabled ? 'disable' : 'enable';
        // Optimistic update IMMEDIATELY so UI reflects change without page reload
        user.enabled = !user.enabled;
        this.refreshIcons();
        this.apiService.updateUser(user.id, { enabled: user.enabled }).subscribe({
            next: (updated) => this.syncUser(updated),
            error: (err) => {
                // Revert on failure
                user.enabled = !user.enabled;
                this.refreshIcons();
                alert(this.translate.instant('ADMIN_USERS.ALERTS.ACTION_FAILED', { action: action }) + (err.error?.error || err.error?.message || 'Error'));
            }
        });
    }

    deleteUser(user: UserResponse) {
        if (!confirm(this.translate.instant('ADMIN_USERS.ALERTS.DEL_CONFIRM', { name: user.fullName }))) return;

        this.apiService.deleteUser(user.id).subscribe({
            next: () => {
                this.users = this.users.filter(u => u.id !== user.id);
                this.applyFilter();
            },
            error: (err) => {
                // Backend GlobalExceptionHandler uses "error" field for the message
                const msg: string = err.error?.error || err.error?.message || err.message || '';
                if (msg.toLowerCase().includes('sole owner')) {
                    // Block → show ownership assignment modal
                    this.openOwnershipModal(user);
                } else {
                    alert(this.translate.instant('ADMIN_USERS.ALERTS.DEL_FAILED') + (msg || 'Error'));
                }
            }
        });
    }

    // ── Ownership Modal ───────────────────────────────────────

    openOwnershipModal(user: UserResponse) {
        this.ownershipTargetUser = user;
        this.ownershipConflicts = [];
        this.platformUserSearch = {};
        this.platformUserResults = {};
        this.isSearchingUsers = {};
        this.isLoadingConflicts = true;
        this.showOwnershipModal = true;

        // Get all orgs where this user is sole owner
        this.apiService.getAllOrganizations().subscribe({
            next: async (orgs) => {
                const soleOwnerOrgs: OrgOwnershipConflict[] = [];
                const memberCalls = orgs.map(org =>
                    this.apiService.getOrganizationMembers(org.id).toPromise()
                        .then(members => ({ org, members: members || [] }))
                );
                const results = await Promise.all(memberCalls);
                for (const { org, members } of results) {
                    const owners = members.filter(m => m.role === 'OWNER');
                    const isThisUser = owners.some(m => m.userId === user.id);
                    if (isThisUser && owners.length === 1) {
                        soleOwnerOrgs.push({ org, members });
                    }
                }
                this.ownershipConflicts = soleOwnerOrgs;
                this.isLoadingConflicts = false;
                setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
            },
            error: () => { this.isLoadingConflicts = false; }
        });
    }

    closeOwnershipModal() {
        this.showOwnershipModal = false;
        this.ownershipTargetUser = null;
        this.ownershipConflicts = [];
    }

    searchPlatformUsers(orgId: string) {
        const term = this.platformUserSearch[orgId]?.trim();
        if (!term || term.length < 2) { this.platformUserResults[orgId] = []; return; }
        this.isSearchingUsers[orgId] = true;
        // Filter from already-loaded users list; skip the user being deleted
        this.platformUserResults[orgId] = this.users.filter(u =>
            u.id !== this.ownershipTargetUser?.id &&
            (u.fullName.toLowerCase().includes(term.toLowerCase()) || u.email.toLowerCase().includes(term.toLowerCase()))
        );
        this.isSearchingUsers[orgId] = false;
    }

    assignOwnerFromMember(conflict: OrgOwnershipConflict, memberId: string, memberName: string) {
        if (!confirm(this.translate.instant('ADMIN_USERS.ALERTS.OWNER_CONFIRM_MEM', { name: memberName, org: conflict.org.name }))) return;
        this.apiService.adminAssignOwner(conflict.org.id, memberId).subscribe({
            next: () => {
                this.ownershipConflicts = this.ownershipConflicts.filter(c => c.org.id !== conflict.org.id);
                if (this.ownershipConflicts.length === 0) {
                    this.finishDelete();
                }
            },
            error: (err) => alert(this.translate.instant('ADMIN_USERS.ALERTS.OWNER_FAILED') + (err.error?.message || 'Error'))
        });
    }

    assignOwnerFromPlatform(conflict: OrgOwnershipConflict, user: UserResponse) {
        if (!confirm(this.translate.instant('ADMIN_USERS.ALERTS.OWNER_CONFIRM_NON', { name: user.fullName, org: conflict.org.name }))) return;
        this.apiService.adminAssignOwner(conflict.org.id, user.id).subscribe({
            next: () => {
                this.ownershipConflicts = this.ownershipConflicts.filter(c => c.org.id !== conflict.org.id);
                if (this.ownershipConflicts.length === 0) {
                    this.finishDelete();
                }
            },
            error: (err) => alert(this.translate.instant('ADMIN_USERS.ALERTS.OWNER_FAILED') + (err.error?.message || 'Error'))
        });
    }

    private finishDelete() {
        if (!this.ownershipTargetUser) return;
        const userToDelete = this.ownershipTargetUser;
        this.closeOwnershipModal();
        this.apiService.deleteUser(userToDelete.id).subscribe({
            next: () => {
                this.users = this.users.filter(u => u.id !== userToDelete.id);
                this.applyFilter();
            },
            error: (err) => alert(this.translate.instant('ADMIN_USERS.ALERTS.DEL_FAILED') + (err.error?.message || 'Error'))
        });
    }

    getOtherMembers(conflict: OrgOwnershipConflict): OrganizationMemberResponse[] {
        return conflict.members.filter(m => m.userId !== this.ownershipTargetUser?.id);
    }

    getInitials(name: string): string {
        return name ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2) : '?';
    }

    getRoleBadgeClass(role: string): string {
        return role?.toUpperCase() === 'ADMIN' ? 'badge-admin' : 'badge-user';
    }
}
