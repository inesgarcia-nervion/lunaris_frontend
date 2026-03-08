import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../domain/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  username = '';
  email = '';
  password = '';
  error: string | null = null;
  success: string | null = null;
  loading = false;
  showPassword: boolean = false;

  constructor(private auth: AuthService, public router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.clearForm();
    // Limpiar de nuevo después de un pequeño delay para evitar que el gestor de contraseñas autocomplete
    setTimeout(() => {
      this.clearForm();
    }, 200);
  }

  clearForm(): void {
    this.username = '';
    this.email = '';
    this.password = '';
    this.error = null;
    this.success = null;
  }

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
    this.auth.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.success = '¡Cuenta creada correctamente! Redirigiendo al login...';
        this.clearForm();
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
          this.error = 'Error al crear la cuenta. Inténtalo de nuevo.';
        }
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }
  
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
