import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

// Prevents multiple simultaneous refresh calls
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const jwtInterceptorFn: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const apiService = inject(ApiService);

    // Skip the refresh endpoint itself to avoid infinite loops
    if (req.url.includes('/auth/refresh') || req.url.includes('/auth/login')) {
        return next(req);
    }

    // Attach access token in memory
    const token = authService.getAccessToken();
    const authReq = token ? addToken(req, token) : req;

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                return handle401(req, next, authService, apiService);
            }
            return throwError(() => error);
        })
    );
};

function addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
    req: HttpRequest<any>,
    next: HttpHandlerFn,
    authService: AuthService,
    apiService: ApiService
) {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshSubject.next(null);

        return apiService.refreshAccessToken().pipe(
            switchMap(response => {
                isRefreshing = false;
                // Store new access token in memory
                authService.setAccessToken(response.token);
                refreshSubject.next(response.token);

                // Retry the original request with new token
                return next(addToken(req, response.token));
            }),
            catchError(err => {
                isRefreshing = false;
                refreshSubject.next(null);
                // Refresh failed — session truly expired, force logout
                authService.logout();
                return throwError(() => err);
            })
        );
    }

    // Another request got a 401 while refresh is in progress — queue it
    return refreshSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next(addToken(req, token!)))
    );
}
