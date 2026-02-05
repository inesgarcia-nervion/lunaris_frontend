import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  newPassword = '';
  confirmPassword = '';
  message: string | null = null;
  error: string | null = null;
  loading = false;
  tokenValid = false;
  validating = true;
  showPassword = false;
  showConfirmPassword = false;

  private readonly backendBase = 'http://localhost:8080';

  constructor(
    public router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    
    if (!this.token) {
      this.validating = false;
      this.error = 'Enlace inválido. No se encontró el token.';
      return;
    }

    // Validar el token
    this.http.get<any>(`${this.backendBase}/auth/validate-token?token=${this.token}`).subscribe({
      next: (res) => {
        this.validating = false;
        this.tokenValid = res.valid;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.validating = false;
        this.tokenValid = false;
        this.error = err.error?.error || 'El enlace ha expirado o no es válido.';
        this.cdr.detectChanges();
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  submit() {
    this.error = null;
    this.message = null;

    if (!this.newPassword) {
      this.error = 'Por favor, introduce una nueva contraseña';
      return;
    }

    if (this.newPassword.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;
    this.http.post<any>(`${this.backendBase}/auth/reset-password`, {
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res.message || '¡Contraseña actualizada correctamente!';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al cambiar la contraseña. El enlace puede haber expirado.';
        this.cdr.detectChanges();
      }
    });
  }
}
