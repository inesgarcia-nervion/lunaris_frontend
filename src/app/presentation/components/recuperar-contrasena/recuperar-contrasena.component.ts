import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

/**
 * Componente para recuperar la contraseña. 
 * 
 * Permite al usuario ingresar su correo electrónico para 
 * recibir instrucciones de recuperación.
 * Valida que el campo de correo electrónico no esté vacío 
 * antes de enviar la solicitud.
 * Muestra mensajes de éxito o error según corresponda.
 */
@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recuperar-contrasena.component.html',
  styleUrls: ['./recuperar-contrasena.component.css']
})
export class RecuperarContrasenaComponent {
  email = '';
  message: string | null = null;
  error: string | null = null;
  loading = false;

  private readonly backendBase = 'http://localhost:8080';

  constructor(public router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  /**
   * Envía la solicitud de recuperación de contraseña al backend.
   * Valida que el campo de correo electrónico no esté vacío.
   * Muestra un mensaje de éxito si la solicitud se envía correctamente o un mensaje de error si falla.
   * @returns void
   */
  submit() {
    this.error = null;
    this.message = null;
    
    if (!this.email) {
      this.error = 'Por favor, introduce tu email';
      return;
    }

    this.loading = true;
    this.http.post<any>(`${this.backendBase}/auth/forgot-password`, { email: this.email }).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res.message || 'Si el email existe, recibirás un correo con instrucciones.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 0) {
          this.error = 'No se puede conectar con el servidor';
        } else if (err.status === 404) {
          this.error = err.error?.error || 'No existe ninguna cuenta con ese correo electrónico.';
        } else {
          this.error = err.error?.error || 'Error al enviar el correo. Inténtalo de nuevo.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
