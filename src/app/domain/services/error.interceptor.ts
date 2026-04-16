import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';


/**
 * Interceptor de errores HTTP. Intercepta las respuestas HTTP y maneja los errores de manera centralizada. 
 * 
 * Si se recibe un error 401 (no autorizado), se cierra la sesión del usuario y se redirige a la página de inicio de sesión.
 * Para otros errores, simplemente se propaga el error para que pueda ser manejado por los componentes que lo requieran.
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isRedirecting = false;

  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isRedirecting) {
      return EMPTY;
    }

    return next.handle(req).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          if (this.isRedirecting) return EMPTY;
          this.isRedirecting = true;

          try { 
            this.auth.logout(); 
          } catch (e) { 
            /* ignore */ 
          }
          this.router.navigateByUrl('/login').finally(() => {
            this.isRedirecting = false;
          });

          return EMPTY;
        }
        return throwError(() => err);
      })
    );
  }
}