import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '@core/services/language.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'angular-v18-app';
  
  constructor(private languageService: LanguageService, private themeService: ThemeService) {}
}
