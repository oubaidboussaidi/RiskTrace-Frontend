import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly LANG_KEY = 'risktrace_lang';

  constructor(private translate: TranslateService) {
    this.initLanguage();
  }

  private initLanguage() {
    this.translate.addLangs(['en', 'fr']);

    let lang = localStorage.getItem(this.LANG_KEY);

    if (!lang) {
      const browserLang = navigator.language.split('-')[0]; 
      if (['en', 'fr'].includes(browserLang)) {
        lang = browserLang;
      } else {
        lang = 'en'; 
      }
    }

    this.setLanguage(lang);
  }

  public setLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  public get currentLang(): string {
    return this.translate.currentLang || 'en';
  }
}
