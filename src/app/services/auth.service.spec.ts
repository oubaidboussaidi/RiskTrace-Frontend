import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, StoredUser } from './auth.service';
import { ApiService, AuthResponse } from './api.service';
import { OrganizationService } from './organization.service';

describe('AuthService', () => {
    let service: AuthService;
    let apiServiceSpy: jasmine.SpyObj<ApiService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let orgServiceSpy: jasmine.SpyObj<OrganizationService>;

    beforeEach(() => {
        const apiSpy = jasmine.createSpyObj('ApiService', ['login', 'verify2fa', 'register', 'logout']);
        const rSpy = jasmine.createSpyObj('Router', ['navigate']);
        const orgSpy = jasmine.createSpyObj('OrganizationService', ['clearOrg']);

        localStorage.clear();

        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: ApiService, useValue: apiSpy },
                { provide: Router, useValue: rSpy },
                { provide: OrganizationService, useValue: orgSpy }
            ]
        });

        service = TestBed.inject(AuthService);
        apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
        routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        orgServiceSpy = TestBed.inject(OrganizationService) as jasmine.SpyObj<OrganizationService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should login successfully without MFA', (done) => {
        const mockResponse: AuthResponse = {
            token: 'mock-token',
            id: '123',
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'ADMIN',
            mfaRequired: false
        };

        apiServiceSpy.login.and.returnValue(of(mockResponse));

        service.login('test@example.com', 'password').subscribe(response => {
            expect(response).toEqual(mockResponse);
            expect(service.getAccessToken()).toBe('mock-token');
            expect(service.currentUserValue).toEqual({
                id: '123',
                email: 'test@example.com',
                fullName: 'Test User',
                role: 'ADMIN'
            });
            expect(localStorage.getItem('user')).toBeTruthy();
            done();
        });
    });

    it('should return mfaRequired true when MFA is enabled', (done) => {
        const mockResponse: AuthResponse = {
            token: '',
            id: '',
            email: '',
            fullName: '',
            role: '',
            mfaRequired: true,
            mfaToken: 'temp-token'
        };

        apiServiceSpy.login.and.returnValue(of(mockResponse));

        service.login('test@example.com', 'password').subscribe(response => {
            expect(response.mfaRequired).toBeTrue();
            expect(service.getAccessToken()).toBeNull();
            expect(service.currentUserValue).toBeNull();
            done();
        });
    });

    it('should verify 2fa successfully', (done) => {
        const mockResponse: AuthResponse = {
            token: 'mock-token-2fa',
            id: '123',
            email: 'test@example.com',
            fullName: 'Test User',
            role: 'ADMIN'
        };

        apiServiceSpy.verify2fa.and.returnValue(of(mockResponse));

        service.verify2fa('temp-token', '123456').subscribe(response => {
            expect(response).toEqual(mockResponse);
            expect(service.getAccessToken()).toBe('mock-token-2fa');
            expect(service.currentUserValue?.id).toBe('123');
            done();
        });
    });

    it('should clear token and user details on logout', () => {
        service.setAccessToken('some-token');
        localStorage.setItem('user', JSON.stringify({ id: '123', email: 'test', fullName: 'test', role: 'admin' }));

        apiServiceSpy.logout.and.returnValue(of({ message: 'Logged out' }));

        // Spy on protected redirect method to prevent actual navigation
        const redirectSpy = spyOn(service as any, 'redirect');

        service.logout();

        expect(service.getAccessToken()).toBeNull();
        expect(service.currentUserValue).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(redirectSpy).toHaveBeenCalledWith('/auth/login');
    });
});
