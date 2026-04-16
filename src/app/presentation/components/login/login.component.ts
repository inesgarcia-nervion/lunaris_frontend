import { Component, ChangeDetectorRef, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../domain/services/auth.service';
import { ListasService } from '../../../domain/services/listas.service';

/**
 * Componente de inicio de sesión. Permite a los usuarios ingresar sus 
 * credenciales para acceder a la aplicación.
 * 
 * Incluye campos para el nombre de usuario, contraseña y una opción de 
 * "Recordarme". 
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  rememberMe = false;
  error: string | null = null;
  loading = false;
  showPassword: boolean = false;


  constructor(private auth: AuthService, public router: Router, private cdr: ChangeDetectorRef, private listasService: ListasService, private renderer: Renderer2) {}

  /**
   * Al inicializar el componente, se oculta el scroll de la página para 
   * evitar distracciones. 
   */
  ngOnInit(): void {
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    try {
      const remembered = localStorage.getItem('lunaris_remember');
      if (remembered === 'true') {
        this.rememberMe = true;
        this.username = (localStorage.getItem('lunaris_current_user') || '') as string;
        const encodedPass = localStorage.getItem('lunaris_remember_pass');
        if (encodedPass) {
          try { this.password = atob(encodedPass); } catch { /* ignore */ }
        }
      } else {
        this.username = (sessionStorage.getItem('lunaris_current_user') || '');
      }
    } catch (e) {
      // ignore
    }
  }

  /**
   * Al destruir el componente, se restaura el scroll de la página para 
   * permitir la navegación normal.
   */
  ngOnDestroy(): void {
    this.renderer.removeStyle(document.body, 'overflow');
  }

  /**
   * Maneja el evento de envío del formulario de inicio de sesión. Valida 
   * los campos, muestra mensajes de error y realiza la autenticación a 
   * través del servicio AuthService. 
   * @returns 
   */
  submit() {
    this.error = null;
   
    if (!this.username || !this.password) {
      this.error = 'Por favor, introduce usuario y contraseña';
      return;
    }
   
    this.loading = true;

    this.auth.login(this.username, this.password, this.rememberMe).subscribe({
      next: () => {
        try {
          this.listasService.assignUnownedListsToCurrentUser(this.username);
        } catch (e) {
          console.error('Error assigning list ownership', e);
        }
        try {
          if (this.rememberMe) {
            try { 
              localStorage.setItem('lunaris_remember', 'true'); 
            } catch {
              //
            }
            try { 
              localStorage.setItem('lunaris_current_user', this.username); 
            } catch {
              //
            }
          } else {
            try { 
              sessionStorage.setItem('lunaris_current_user', this.username); 
            } catch {
              //
            }
            try { 
              localStorage.removeItem('lunaris_current_user'); 
            } catch {
              //
            }
            try { 
              localStorage.removeItem('lunaris_remember'); 
            } catch {
              //
            }
            try { 
              localStorage.removeItem('lunaris_remember_pass'); 
            } catch {
              //
            }
          }
        } catch (e) {
          console.warn('Unable to persist/clear remember-me settings', e);
        }
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/menu']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.error = 'Usuario o contraseña incorrectos';
        } else if (err.status === 0) {
          this.error = 'No se puede conectar con el servidor';
        } else {
          this.error = 'Error al iniciar sesión. Inténtalo de nuevo.';
        }
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }

  /**
   * Alterna la visibilidad de la contraseña en el campo de entrada. Permite a 
   * los usuarios ver u ocultar su contraseña mientras la ingresan para mejorar 
   * la usabilidad.
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
