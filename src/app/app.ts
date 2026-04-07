import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './presentation/components/header/header.component';
import { ConfirmDialogComponent } from './presentation/shared/confirm-dialog/confirm-dialog.component';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ListasService } from './domain/services/listas.service';
import { AuthService } from './domain/services/auth.service';

/**
 * Componente raíz de la aplicación Angular, que actúa como el contenedor principal para toda la aplicación.
 * 
 * Este componente se encarga de gestionar la navegación, mostrar u ocultar el encabezado y pie de página
 * según la ruta actual, y aplicar el tema oscuro si el usuario lo ha configurado. También se encarga de 
 * asignar listas sin propietario al usuario actual al iniciar la aplicación.
 */
@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, HeaderComponent, ConfirmDialogComponent],
  templateUrl: './app.html',
    styleUrls: ['./app.css']
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('lunaris_frontend');
  showHeader = false;
  showFooter = false;
  private subs: Subscription[] = [];
  private publicFirstSegments = new Set(['', 'login', 'register', 'recuperar-contrasena', 'reset-password']);

  constructor(private router: Router, private listasService: ListasService, public auth: AuthService) {}

  /**
   * Navega a la página de peticiones, que muestra las solicitudes de los usuarios para agregar 
   * nuevos libros a la plataforma.
   */
  navigateToPeticiones(): void {
    this.router.navigate(['/peticiones']);
  }

  /**
   * Inicializa el componente raíz, asignando listas sin propietario al usuario actual, y configurando la
   * visibilidad del encabezado y pie de página según la ruta actual. También se suscribe a los eventos de 
   * navegación para actualizar la visibilidad del encabezado y pie de página, y aplicar el tema oscuro 
   * según la configuración del usuario en cada ruta.
   */
  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUsername();
    if (currentUser) {
      const savedTheme = this.auth.getUserTheme(currentUser);
      if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.documentElement.classList.add('theme-dark');
      }
    }

    try {
      const current = this.listasService.getCurrentUser();
      if (current) this.listasService.assignUnownedListsToCurrentUser(current);
    } catch (e) {
      console.error('Error assigning ownership on app init', e);
    }
    this.showHeader = this.computeShowHeader(this.router.url);
    this.showFooter = this.showHeader;
    this.applyThemeForRoute(this.router.url);
    this.subs.push(this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        this.showHeader = this.computeShowHeader(e.urlAfterRedirects);
        this.showFooter = this.showHeader;
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
      const currentUser = this.auth.getCurrentUsername();
      const savedTheme = currentUser ? this.auth.getUserTheme(currentUser) : 'light';
      if (savedTheme === 'dark') {
        document.body.classList.add('theme-dark');
        document.documentElement.classList.add('theme-dark');
      }
    }
  }

  /**
   * Destruye el componente raíz, cancelando todas las suscripciones para evitar fugas de memoria. 
   */
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
