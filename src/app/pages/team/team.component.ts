import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService, OrganizationMemberResponse } from '../../services/api.service';
import { OrganizationService } from '../../services/organization.service';
import { AuthService } from '../../services/auth.service';

declare var lucide: any;

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.currentUserId = this.authService.currentUserValue?.id || null;

    // Support ?orgId= query param OR fall back to active org
    this.route.queryParams.subscribe(params => {
      const orgIdFromQuery = params['orgId'];
      if (orgIdFromQuery) {
        this.currentOrgId = orgIdFromQuery;
        this.loadMembers();
      } else {
        this.orgService.currentOrg$.subscribe(org => {
          if (org) {
            this.currentOrgId = org.id;
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
        this.currentPage = 1;
        this.refreshIcons();
      },
      error: () => alert('Failed to load team members.')
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
    if (!this.currentOrgId) { alert('No organization selected.'); return; }
    if (!this.inviteForm.email) { alert('Email is required.'); return; }

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
      error: (err) => alert('Failed to invite member: ' + (err.error?.error || err.error?.message || 'User not found or already a member.'))
    });
  }

  removeMember(member: OrganizationMemberResponse) {
    if (!this.currentOrgId) return;
    if (!confirm(`Remove ${member.fullName || member.email} from this organization?`)) return;

    this.apiService.removeMember(this.currentOrgId, member.userId).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter(m => m.userId !== member.userId);
      },
      error: (err) => alert('Failed to remove member: ' + (err.error?.error || err.error?.message || 'Error removing member.'))
    });
  }

  transferOwnership() {
    if (!this.currentOrgId) return;
    if (!this.transferForm.newOwnerUserId) { alert('Select a member to transfer ownership to.'); return; }

    this.apiService.transferOwnership(this.currentOrgId, { newOwnerUserId: this.transferForm.newOwnerUserId }).subscribe({
      next: () => {
        alert('Ownership transferred successfully.');
        this.showTransferForm = false;
        this.loadMembers(); // Refresh to show updated roles
      },
      error: (err) => alert('Failed to transfer ownership: ' + (err.error?.error || err.error?.message || 'Error.'))
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
    return this.teamMembers.filter(m => m.userId !== this.currentUserId && m.role !== 'OWNER');
  }

  get currentUserOrgRole(): string | null {
    const me = this.teamMembers.find(m => m.userId === this.currentUserId);
    return me ? me.role.toUpperCase() : null;
  }

  get isCurrentUserOwner(): boolean {
    return this.currentUserOrgRole === 'OWNER';
  }
}
