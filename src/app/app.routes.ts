import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { IncidentsComponent } from './pages/incidents/incidents.component';
import { LogsComponent } from './pages/logs/logs.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { SitesComponent } from './pages/sites/sites.component';
import { LoginComponent } from './pages/login/login.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { AlertsComponent } from './pages/alerts/alerts.component';
import { ApiKeysComponent } from './pages/api-keys/api-keys.component';
import { TeamComponent } from './pages/team/team.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'incidents', component: IncidentsComponent },
            { path: 'logs', component: LogsComponent },
            { path: 'analytics', component: AnalyticsComponent },
            { path: 'sites', component: SitesComponent },
            { path: 'settings', component: SettingsComponent },
            { path: 'alerts', component: AlertsComponent },
            { path: 'api-keys', component: ApiKeysComponent },
            { path: 'team', component: TeamComponent, canActivate: [AuthGuard, RoleGuard], data: { expectedRole: 'ADMIN' } },
        ]
    },
    {
        path: 'auth',
        component: AuthLayoutComponent,
        children: [
            { path: 'login', component: LoginComponent }
        ]
    },
    // Public auth utility pages (no layout wrapper needed)
    { path: 'verify-email', component: VerifyEmailComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
];
