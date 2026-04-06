import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guardián de autenticación.
 * 
 * Este guardián se utiliza para proteger rutas que requieren que el usuario esté autenticado.
 * Si el usuario no está autenticado, se redirige a la página de inicio de sesión.
 */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.auth.isLoggedIn()) return true;
    this.router.navigate(['/login']);
    return false;
  }
}
