import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { jwtInterceptorFn } from './interceptors/jwt.interceptor';
import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';

import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

/** Custom loader that always fetches fresh JSON (no-cache headers) */
class NoCacheTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}
  getTranslation(lang: string): Observable<any> {
    return this.http.get(`/assets/i18n/${lang}.json?t=${new Date().getTime()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

/**
 * On every page load/refresh, silently attempt to get a fresh access token
 * from the server using the httpOnly refresh cookie.
 * If it fails (user is not logged in), we just proceed — the auth guard will redirect to login.
 */
function initializeAuth(authService: AuthService, apiService: ApiService) {
  return (): Promise<void> => {
    // Only try refresh if there's a stored user (i.e. we were logged in before)
    const hasStoredUser = !!localStorage.getItem('user');
    if (!hasStoredUser) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      apiService.refreshAccessToken().subscribe({
        next: (response) => {
          authService.setAccessToken(response.token);
          resolve();
        },
        error: () => {
          // Refresh failed (cookie expired or not present) — clear stale user info
          localStorage.removeItem('user');
          resolve(); // still resolve so the app boots; auth guard will redirect to login
        }
      });
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptorFn])),
    provideTranslateService({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new NoCacheTranslateLoader(http),
        deps: [HttpClient]
      }
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthService, apiService: ApiService) =>
        initializeAuth(authService, apiService),
      deps: [AuthService, ApiService],
      multi: true
    }
  ]
};
