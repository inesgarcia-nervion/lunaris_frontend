import { Component, ChangeDetectorRef, OnInit, OnDestroy, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../domain/services/auth.service';

/**
 * Componente para el registro de nuevos usuarios.
 * 
 * Permite a los usuarios crear una cuenta ingresando un nombre de usuario, 
 * correo electrónico y contraseña.
 * Valida que todos los campos estén completos y que la contraseña tenga al
 * menos 6 caracteres antes de enviar la solicitud.
 * Muestra mensajes de éxito o error según corresponda.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  username = '';
  email = '';
  password = '';
  error: string | null = null;
  success: string | null = null;
  loading = false;
  showPassword: boolean = false;

  constructor(private auth: AuthService, public router: Router, private cdr: ChangeDetectorRef, private renderer: Renderer2) {}

  /**
   * Al iniciar el componente, se deshabilita el scroll del body para evitar 
   * que el fondo se desplace en pantallas pequeñas.
   * También se limpia el formulario para asegurarse de que no haya datos 
   * residuales. Al destruir el componente, se vuelve a habilitar el scroll 
   * del body.
   * @returns void
   */
  ngOnInit(): void {
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
    this.clearForm();
    setTimeout(() => {
      this.clearForm();
    }, 200);
  }

  /**
   * Al destruir el componente, se vuelve a habilitar el scroll del body para
   * permitir que el usuario navegue normalmente por el sitio.
   * @returns void
   */
  ngOnDestroy(): void {
    this.renderer.removeStyle(document.body, 'overflow');
  }

  /**
   * Limpia el formulario de registro, restableciendo los campos de nombre de 
   * usuario, correo electrónico y contraseña a valores vacíos. También borra
   * cualquier mensaje de error o éxito que pueda estar presente. 
   */
  clearForm(): void {
    this.username = '';
    this.email = '';
    this.password = '';
    this.error = null;
    this.success = null;
  }

  /**
   * Envía la solicitud de registro al backend a través del servicio de autenticación.
   * Valida que todos los campos estén completos y que la contraseña tenga al
   * menos 6 caracteres antes de enviar la solicitud. Muestra un mensaje de éxito
   * si la cuenta se crea correctamente o un mensaje de error si falla.
   * @returns void
   */
  submit() {
    this.error = null;
    this.success = null;
    
    if (!this.username || !this.email || !this.password) {
      this.error = 'Por favor, rellena todos los campos';
      return;
    }
    
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    
    this.loading = true;
    if (!this.isValidEmail(this.email)) {
      this.loading = false;
      this.error = 'Por favor, introduce un correo electrónico válido';
      this.cdr.detectChanges();
      return;
    }
    this.auth.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.success = '¡Cuenta creada correctamente! Redirigiendo al login...';
        this.username = '';
        this.email = '';
        this.password = '';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409 || err.status === 400) {
          this.error = 'El usuario o email ya existe';
        } else if (err.status === 0) {
          this.error = 'No se puede conectar con el servidor';
        } else {
          this.error = 'Error al crear la cuenta. Correo ya existente';
        }
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }
  
  /**
   * Alterna la visibilidad de la contraseña en el formulario de registro.
   * Cambia el valor de showPassword entre true y false, lo que a su vez 
   * cambia el tipo del input de contraseña entre 'password' y 'text' en la plantilla.
   * @returns void
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Valida que el formato del correo electrónico sea correcto utilizando una expresión regular.
   * @param email El correo electrónico a validar.
   * @returns true si el correo electrónico es válido, false en caso contrario.
   */
  private isValidEmail(email: string): boolean {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }
}
