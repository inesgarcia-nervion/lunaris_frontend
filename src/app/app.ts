import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './presentation/components/header/header.component';
import { ConfirmDialogComponent } from './presentation/shared/confirm-dialog/confirm-dialog.component';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ListasService } from './domain/services/listas.service';
import { AuthService } from './domain/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('lunaris_frontend');
  showHeader = false;
  private subs: Subscription[] = [];
  private publicFirstSegments = new Set(['', 'login', 'register', 'recuperar-contrasena', 'reset-password']);

  constructor(private router: Router, private listasService: ListasService, public auth: AuthService) {}

  navigateToPeticiones(): void {
    this.router.navigate(['/peticiones']);
  }

  ngOnInit(): void {
    // Apply saved theme immediately so dark mode persists across all routes
    const savedTheme = localStorage.getItem('lunaris_theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('theme-dark');
      document.documentElement.classList.add('theme-dark');
    } else if (!savedTheme) {
      // If no preference saved, respect the OS preference (article step 4)
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      if (prefersDark.matches) {
        document.body.classList.add('theme-dark');
        document.documentElement.classList.add('theme-dark');
        localStorage.setItem('lunaris_theme', 'dark');
      }
    }

    // If user already logged in, assign ownership to any lists created before owner support
    try {
      const current = this.listasService.getCurrentUser();
      if (current) this.listasService.assignUnownedListsToCurrentUser(current);
    } catch (e) {
      console.error('Error assigning ownership on app init', e);
    }
    this.showHeader = this.computeShowHeader(this.router.url);
    this.applyThemeForRoute(this.router.url);
    this.subs.push(this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        this.showHeader = this.computeShowHeader(e.urlAfterRedirects);
        this.applyThemeForRoute(e.urlAfterRedirects);
      }
    }));
  }

  private computeShowHeader(url: string): boolean {
    const clean = (url || '').split('?')[0].split('#')[0];
    const first = clean.replace(/^\/+/, '').split('/')[0] || '';
    return !this.publicFirstSegments.has(first);
  }

  private applyThemeForRoute(url: string): void {
    const clean = (url || '').split('?')[0].split('#')[0];
    const first = clean.replace(/^\/+/, '').split('/')[0] || '';
    const isPublic = this.publicFirstSegments.has(first);
    if (isPublic) {
      document.body.classList.remove('theme-dark');
      document.documentElement.classList.remove('theme-dark');
    } else {
      const savedTheme = localStorage.getItem('lunaris_theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.documentElement.classList.add('theme-dark');
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
