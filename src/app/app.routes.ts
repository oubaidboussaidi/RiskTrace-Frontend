import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@shared/layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from '@shared/layout/auth-layout/auth-layout.component';
import { DashboardComponent } from '@features/dashboard/dashboard/dashboard.component';
import { IncidentsComponent } from '@features/logs/incidents/incidents.component';
import { LogsComponent } from '@features/logs/logs/logs.component';
import { AnalyticsComponent } from '@features/dashboard/analytics/analytics.component';
import { SitesComponent } from '@features/sites/sites/sites.component';
import { LoginComponent } from '@features/auth/login/login.component';
import { SettingsComponent } from '@features/settings/settings/settings.component';
import { ApiKeysComponent } from '@features/sites/api-keys/api-keys.component';
import { TeamComponent } from '@features/organizations/team/team.component';
import { VerifyEmailComponent } from '@features/auth/verify-email/verify-email.component';
import { ResetPasswordComponent } from '@features/auth/reset-password/reset-password.component';
import { AuthGuard } from '@core/guards/auth.guard';
import { RoleGuard } from '@core/guards/role.guard';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'organizations', loadComponent: () => import('@features/organizations/organizations/organizations.component').then(m => m.OrganizationsComponent) },
            { path: 'admin/dashboard', loadComponent: () => import('@features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [AuthGuard, RoleGuard], data: { expectedRole: 'PLATFORM_ADMIN' } },
            { path: 'admin/organizations', loadComponent: () => import('@features/admin/admin-organizations/admin-organizations.component').then(m => m.AdminOrganizationsComponent), canActivate: [AuthGuard, RoleGuard], data: { expectedRole: 'PLATFORM_ADMIN' } },
            { path: 'admin/users', loadComponent: () => import('@features/admin/admin-users/admin-users.component').then(m => m.AdminUsersComponent), canActivate: [AuthGuard, RoleGuard], data: { expectedRole: 'PLATFORM_ADMIN' } },
            { path: 'admin/logs', loadComponent: () => import('@features/admin/admin-logs/admin-logs.component').then(m => m.AdminLogsComponent), canActivate: [AuthGuard, RoleGuard], data: { expectedRole: 'PLATFORM_ADMIN' } },

            { path: 'incidents', component: IncidentsComponent },

            { path: 'logs', component: LogsComponent },
            { path: 'analytics', component: AnalyticsComponent },
            { path: 'sites', component: SitesComponent },
            { path: 'settings', component: SettingsComponent },
            { path: 'admin/settings', component: SettingsComponent, canActivate: [AuthGuard, RoleGuard], data: { expectedRole: 'PLATFORM_ADMIN' } },
            { path: 'api-keys', component: ApiKeysComponent },
            { path: 'team', component: TeamComponent, canActivate: [AuthGuard] },

        ]
    },
    {
        path: 'auth',
        component: AuthLayoutComponent,
        children: [
            { path: 'login', component: LoginComponent }
        ]
    },

    { path: 'verify-email', component: VerifyEmailComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
];
