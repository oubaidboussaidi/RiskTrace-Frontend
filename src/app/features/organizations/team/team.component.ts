import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, OrganizationMemberResponse } from '@core/services/api.service';
import { OrganizationService } from '@core/services/organization.service';
import { AuthService } from '@core/services/auth.service';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';

declare var lucide: any;

import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, AvatarComponent],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent implements OnInit, AfterViewInit {
  teamMembers: OrganizationMemberResponse[] = [];
  currentOrgId: string | null = null;
  showInviteForm = false;
  showTransferForm = false;
  currentUserId: string | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  Math = Math;

  inviteForm = { email: '', role: 'ANALYST' };
  transferForm = { newOwnerUserId: '' };

  readonly orgRoles = ['OWNER', 'ANALYST'];

  constructor(
    private apiService: ApiService,
    private orgService: OrganizationService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) { }

  ngOnInit() {
    this.currentUserId = this.authService.currentUserValue?.id || null;

    // Support ?orgId= query param OR fall back to active org
    this.route.queryParams.subscribe(params => {
      const orgIdFromQuery = params['orgId'];
      console.log('[Team] Init - userId:', this.currentUserId, 'orgIdFromQuery:', orgIdFromQuery);
      if (orgIdFromQuery) {
        this.currentOrgId = orgIdFromQuery;
        this.loadMembers();
      } else {
        this.orgService.currentOrg$.subscribe(org => {
          if (org) {
            this.currentOrgId = org.id;
            console.log('[Team] Active org changed:', org.id);
            this.loadMembers();
          }
        });
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
  }

  loadMembers() {
    if (!this.currentOrgId) return;

    this.apiService.getOrganizationMembers(this.currentOrgId).subscribe({
      next: (members) => {
        this.teamMembers = members || [];
        console.log('[Team] Loaded members:', this.teamMembers);
        console.log('[Team] My Role in Org:', this.currentUserOrgRole);
        this.currentPage = 1;
        this.refreshIcons();
      },
      error: () => alert(this.translate.instant('TEAM.ALERTS.LOAD_FAILED'))
    });
  }

  get totalPages(): number {
    return Math.ceil(this.teamMembers.length / this.pageSize);
  }

  get paginatedMembers() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.teamMembers.slice(start, start + this.pageSize);
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

  refreshIcons() {
    setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
  }

  inviteMember() {
    if (!this.currentOrgId) { alert(this.translate.instant('TEAM.ALERTS.NO_ORG')); return; }
    if (!this.inviteForm.email) { alert(this.translate.instant('TEAM.ALERTS.EMAIL_REQ')); return; }

    this.apiService.inviteMember(this.currentOrgId, {
      email: this.inviteForm.email,
      role: this.inviteForm.role
    }).subscribe({
      next: (member) => {
        this.teamMembers.push(member);
        this.showInviteForm = false;
        this.inviteForm = { email: '', role: 'ANALYST' };
        setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
      },
      error: (err) => alert(this.translate.instant('TEAM.ALERTS.INVITE_FAILED') + (err.error?.error || err.error?.message || 'User not found or already a member.'))
    });
  }

  removeMember(member: OrganizationMemberResponse) {
    if (!this.currentOrgId) return;
    if (!confirm(this.translate.instant('TEAM.ALERTS.REMOVE_CONFIRM', { name: member.fullName || member.email }))) return;

    this.apiService.removeMember(this.currentOrgId, member.userId).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter(m => m.userId !== member.userId);
      },
      error: (err) => alert(this.translate.instant('TEAM.ALERTS.REMOVE_FAILED') + (err.error?.error || err.error?.message || 'Error removing member.'))
    });
  }

  transferOwnership() {
    if (!this.currentOrgId) return;
    if (!this.transferForm.newOwnerUserId) { alert(this.translate.instant('TEAM.ALERTS.TRANSFER_REQ')); return; }

    this.apiService.transferOwnership(this.currentOrgId, { newOwnerUserId: this.transferForm.newOwnerUserId }).subscribe({
      next: () => {
        alert(this.translate.instant('TEAM.ALERTS.TRANSFER_SUCCESS'));
        this.showTransferForm = false;
        this.loadMembers(); // Refresh to show updated roles
      },
      error: (err) => alert(this.translate.instant('TEAM.ALERTS.TRANSFER_FAILED') + (err.error?.error || err.error?.message || 'Error.'))
    });
  }

  getInitials(name: string): string {
    return name ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2) : '?';
  }

  getRoleBadgeClass(role: string): string {
    switch (role?.toUpperCase()) {
      case 'OWNER': return 'badge-owner';
      case 'ANALYST': return 'badge-analyst';
      default: return 'badge-default';
    }
  }

  get candidatesForOwnerTransfer(): OrganizationMemberResponse[] {
    // Current user shouldn't be in the list, and we can transfer to anyone (even other owners if allowed, but usually analysts)
    return this.teamMembers.filter(m => m.userId !== this.currentUserId);
  }

  get currentUserOrgRole(): string | null {
    const me = this.teamMembers.find(m => m.userId === this.currentUserId);
    console.log('[Team] Finding role for:', this.currentUserId, 'Found:', me);
    return me ? me.role.toUpperCase() : null;
  }

  get isCurrentUserOwner(): boolean {
    return this.currentUserOrgRole === 'OWNER';
  }
}
