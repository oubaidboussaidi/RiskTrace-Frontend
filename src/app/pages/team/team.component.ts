import { Component, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, UserResponse } from '../../services/api.service';

declare var lucide: any;

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent implements OnInit, AfterViewInit {
  teamMembers: UserResponse[] = [];
  showCreateForm: boolean = false;

  newUser = {
    name: '',
    email: '',
    password: 'password123'
  };

  constructor(private apiService: ApiService) { }

  ngOnInit() {
    this.refreshTeam();
  }

  refreshTeam() {
    this.apiService.getUsers().subscribe(users => {
      const currentUserId = this.apiService.getCurrentUserId();
      this.teamMembers = (users || [])
        .filter(u => u.id !== currentUserId)
        .map(u => {
          let role = u.role ? u.role.toUpperCase() : 'ANALYST';
          if (role === 'USER') role = 'ANALYST'; // Map legacy USER to ANALYST for UI
          return { ...u, role };
        });
      setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
    });
  }

  toggleCreateForm() {
    this.showCreateForm = !this.showCreateForm;
  }

  createUser() {
    if (!this.newUser.name || !this.newUser.email) {
      alert('Please fill in name and email.');
      return;
    }

    this.apiService.register({
      fullName: this.newUser.name,
      email: this.newUser.email,
      password: this.newUser.password
    }).subscribe({
      next: () => {
        this.refreshTeam();
        this.showCreateForm = false;
        this.newUser = { name: '', email: '', password: 'password123' };
        alert('User added successfully! Default role: ANALYST');
      },
      error: (err) => alert('Failed to add user: ' + (err.error?.error || 'Unknown error'))
    });
  }

  ngAfterViewInit() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  changeRole(userId: string, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const role = selectElement.value;
    this.apiService.updateUser(userId, { role }).subscribe({
      next: (updatedUser) => {
        // Update local cache
        const index = this.teamMembers.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.teamMembers[index] = updatedUser;
          setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
        }
      },
      error: () => alert('Failed to update role')
    });
  }


  toggleStatus(user: UserResponse) {
    const newStatus = !user.enabled;
    this.apiService.updateUser(user.id, { enabled: newStatus }).subscribe({
      next: (updatedUser) => {
        const index = this.teamMembers.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.teamMembers[index] = updatedUser;
          setTimeout(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); }, 100);
        }
      },
      error: () => alert('Failed to update status')
    });
  }

  deleteUser(user: UserResponse) {
    const currentUserId = this.apiService.getCurrentUserId();
    if (user.id === currentUserId) {
      alert('You cannot delete yourself.');
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.fullName}?`)) {
      this.apiService.deleteUser(user.id).subscribe({
        next: () => {
          this.teamMembers = this.teamMembers.filter(u => u.id !== user.id);
          alert('User deleted successfully');
        },
        error: () => alert('Failed to delete user')
      });
    }
  }

  getInitials(name: string): string {
    return name ? name.toUpperCase().split(' ').map(n => n[0]).join('').substring(0, 2) : 'U';
  }
}
