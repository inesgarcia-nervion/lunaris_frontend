import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recuperar-contrasena.component.html',
  styleUrl: './recuperar-contrasena.component.css'
})
export class RecuperarContrasenaComponent {
  email = '';
  message: string | null = null;
  error: string | null = null;

  constructor(public router: Router) {}

  submit() {
    this.error = null;
    this.message = null;
    
    if (!this.email) {
      this.error = 'Por favor, introduce tu email';
      return;
    }

    // TODO: Implementar lógica de recuperación de contraseña
    this.message = 'Se ha enviado un correo de recuperación a ' + this.email;
  }
}
