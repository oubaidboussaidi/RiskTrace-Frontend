import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserResponse {
    id: string;
    fullName: string;
    email: string;
    role: string;
    enabled: boolean;
    isTwoFactorEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    profileImageUrl?: string | null;
}

export interface Setup2FaResponse {
    secret: string;
    qrCodeImage: string;
}

export interface Enable2FaRequest {
    secret: string;
    code: string;
}

export interface Verify2FARequest {
    mfaToken: string;
    code: string;
}

export interface AuthResponse {
    token: string;
    role: string;
    email: string;
    fullName: string;
    id: string;
    mfaRequired?: boolean;
    mfaToken?: string;
}

export interface UpdateProfileRequest {
    fullName?: string;
    password?: string;
}

export interface UpdateFullNameRequest {
    fullName: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface UpdateUserRequest {
    role?: string;
    enabled?: boolean;
}

export interface OrganizationRequest {
    name: string;
}

export interface OrganizationResponse {
    id: string;
    name: string;
    createdAt: string;
    createdBy: string;
    enabled: boolean;
    membersCount: number;
    logoUrl?: string | null;
    currentUserRole?: string | null;
}

export interface OrganizationMemberResponse {
    id: string;
    userId: string;
    email: string;
    fullName: string;
    organizationId: string;
    role: string; // OWNER | ANALYST | VIEWER
    createdAt: string;
}

export interface InviteMemberRequest {
    email: string;
    role: string; // OWNER | ANALYST | VIEWER
}

export interface TransferOwnershipRequest {
    newOwnerUserId: string;
}

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        // Authorization header is automatically added by jwt.interceptor.ts
        return new HttpHeaders({ 'Content-Type': 'application/json' });
    }

    getCurrentUserId(): string | null {
        try {
            const userJson = localStorage.getItem('user');
            if (!userJson) return null;
            const user = JSON.parse(userJson);
            return user.id;
        } catch (e) {
            return null;
        }
    }

    // --- Auth ---
    login(credentials: { email: string, password: string }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true });
    }

    logout(): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/auth/logout`, {}, {
            headers: this.getHeaders(),
            withCredentials: true
        });
    }

    refreshAccessToken(): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true });
    }

    register(user: { fullName: string, email: string, password: string }): Observable<UserResponse> {
        return this.http.post<UserResponse>(`${this.apiUrl}/auth/register`, user);
    }

    verifyEmail(token: string): Observable<{ message: string }> {
        return this.http.get<{ message: string }>(`${this.apiUrl}/auth/verify-email`, { params: { token } });
    }

    resendVerificationEmail(email: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/auth/resend-verification`, { email });
    }

    forgotPassword(email: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
    }

    resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, { token, newPassword });
    }

    verify2fa(request: Verify2FARequest): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/auth/verify-2fa`, request, { withCredentials: true });
    }

    // --- Users (ADMIN) ---
    getUsers(): Observable<UserResponse[]> {
        return this.http.get<UserResponse[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
    }

    getUser(id: string): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
    }

    updateUser(id: string, data: UpdateUserRequest): Observable<UserResponse> {
        return this.http.put<UserResponse>(`${this.apiUrl}/users/${id}`, data, { headers: this.getHeaders() });
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() });
    }

    updateUserRole(userId: string, role: string): Observable<UserResponse> {
        return this.updateUser(userId, { role });
    }

    // --- Profile (AUTHENTICATED) ---
    getProfile(): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${this.apiUrl}/profile`, { headers: this.getHeaders() });
    }

    updateFullName(data: UpdateFullNameRequest): Observable<UserResponse> {
        return this.http.put<UserResponse>(`${this.apiUrl}/profile/fullname`, data, { headers: this.getHeaders() });
    }

    changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/profile/change-password`, data, { headers: this.getHeaders() });
    }

    setup2fa(): Observable<Setup2FaResponse> {
        return this.http.get<Setup2FaResponse>(`${this.apiUrl}/profile/2fa/setup`, { headers: this.getHeaders() });
    }

    enable2fa(data: Enable2FaRequest): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/profile/2fa/enable`, data, { headers: this.getHeaders() });
    }

    disable2fa(currentPassword: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/profile/2fa/disable`, { currentPassword }, { headers: this.getHeaders() });
    }

    // --- Organizations ---
    createOrganization(data: OrganizationRequest): Observable<OrganizationResponse> {
        return this.http.post<OrganizationResponse>(`${this.apiUrl}/organizations`, data, { headers: this.getHeaders() });
    }

    updateOrganization(organizationId: string, data: OrganizationRequest): Observable<OrganizationResponse> {
        return this.http.put<OrganizationResponse>(`${this.apiUrl}/organizations/${organizationId}`, data, { headers: this.getHeaders() });
    }

    getMyOrganizations(): Observable<OrganizationResponse[]> {
        return this.http.get<OrganizationResponse[]>(`${this.apiUrl}/organizations/my`, { headers: this.getHeaders() });
    }

    getAllOrganizations(): Observable<OrganizationResponse[]> {
        return this.http.get<OrganizationResponse[]>(`${this.apiUrl}/organizations/all`, { headers: this.getHeaders() });
    }

    updateOrganizationStatus(organizationId: string, enabled: boolean): Observable<OrganizationResponse> {
        return this.http.put<OrganizationResponse>(`${this.apiUrl}/organizations/${organizationId}/status`, null, {
            headers: this.getHeaders(),
            params: { enabled: String(enabled) }
        });
    }

    getOrganizationMembers(orgId: string): Observable<OrganizationMemberResponse[]> {
        return this.http.get<OrganizationMemberResponse[]>(`${this.apiUrl}/organizations/${orgId}/members`, { headers: this.getHeaders() });
    }

    inviteMember(orgId: string, data: InviteMemberRequest): Observable<OrganizationMemberResponse> {
        return this.http.post<OrganizationMemberResponse>(`${this.apiUrl}/organizations/${orgId}/members/invite`, data, { headers: this.getHeaders() });
    }

    removeMember(orgId: string, userId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/organizations/${orgId}/members/${userId}`, { headers: this.getHeaders() });
    }

    transferOwnership(orgId: string, data: TransferOwnershipRequest): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/organizations/${orgId}/transfer-ownership`, data, { headers: this.getHeaders() });
    }

    adminTransferOwnership(orgId: string, newOwnerId: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/organizations/${orgId}/admin/transfer-ownership?newOwnerId=${newOwnerId}`, {}, { headers: this.getHeaders() });
    }

    adminAssignOwner(orgId: string, newOwnerId: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/organizations/${orgId}/admin/assign-owner?newOwnerId=${newOwnerId}`, {}, { headers: this.getHeaders() });
    }

    // --- Admin: Sites ---
    getSites(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/sites`, { headers: this.getHeaders() });
    }

    getSitesByOrganization(orgId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/sites/org/${orgId}`, { headers: this.getHeaders() });
    }

    createSite(site: { siteName: string, domain: string, organizationId: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/sites`, site, { headers: this.getHeaders() });
    }

    deleteSite(siteId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/admin/sites/${siteId}`, { headers: this.getHeaders() });
    }

    regenerateApiKey(siteId: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/admin/sites/${siteId}/regenerate-key`, {}, { headers: this.getHeaders() });
    }

    // --- Logs ---
    getLogs(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/logs`, { headers: this.getHeaders() });
    }

    getLogsByOrganization(orgId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/logs/org/${orgId}`, { headers: this.getHeaders() });
    }

    markLogAsAnomaly(logId: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/logs/${logId}/mark-suspicious`, {}, { headers: this.getHeaders() });
    }

    getLiveTailUrl(): string {
        return `${this.apiUrl}/logs/stream`;
    }

    getMlStatus(): Observable<{online: boolean}> {
        return this.http.get<{online: boolean}>(`${this.apiUrl}/logs/ml-status`, { headers: this.getHeaders() });
    }

    // --- Alerts ---
    createAlert(alert: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/alerts`, alert, { headers: this.getHeaders() });
    }

    getAlerts(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/alerts`, { headers: this.getHeaders() });
    }

    getAlertsByOrganization(orgId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/alerts/organization/${orgId}`, { headers: this.getHeaders() });
    }

    getActiveAlerts(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/alerts/active`, { headers: this.getHeaders() });
    }

    getActiveAlertsByOrganization(orgId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/alerts/active/${orgId}`, { headers: this.getHeaders() });
    }

    updateAlertStatus(alertId: string, status: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/alerts/${alertId}/status`, { status }, { headers: this.getHeaders() });
    }

    escalateAlert(alertId: string, request: { message: string, analystName: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/alerts/${alertId}/escalate`, request, { headers: this.getHeaders() });
    }
}
