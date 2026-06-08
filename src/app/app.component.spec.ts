import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';
import { AppComponent } from './app.component';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';

describe('AppComponent', () => {
  let mockLanguageService: any;
  let mockThemeService: any;

  beforeEach(async () => {
    mockLanguageService = {
      currentLang: 'en',
      setLanguage: jasmine.createSpy('setLanguage')
    };

    mockThemeService = {
      isDarkMode: false,
      toggleTheme: jasmine.createSpy('toggleTheme')
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ThemeService, useValue: mockThemeService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'angular-v18-app' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('angular-v18-app');
  });
});