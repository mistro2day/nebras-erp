import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(false);

  toggleTheme() {
    this.isDarkMode.update(value => !value);
    const themeValue = this.isDarkMode() ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeValue);
  }

  setTheme(theme: 'light' | 'dark') {
    this.isDarkMode.set(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  }
}