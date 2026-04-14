import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

/**
 * Interceptor de errores HTTP que captura respuestas con código de estado 401 (No autorizado).
 * 
 * Si se detecta un error 401, el interceptor llama al servicio de autenticación para cerrar
 *  la sesión del usuario y redirige a la página de inicio de sesión.
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          try { this.auth.logout(); } catch (e) { /* ignore */ }
          try { window.location.replace('/login'); } catch (e) { /* ignore */ }
          return EMPTY;
        }
        return throwError(() => err);
      })
    );
  }
}
