import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  error: string | null = null;
  showPassword: boolean = false;

  constructor(private auth: AuthService, public router: Router) {}

  submit() {
    this.error = null;
    this.auth.register(this.username, this.email, this.password).subscribe({
      next: () => {
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.error = 'Error al crear usuario';
        console.error(err);
      }
    });
  }
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
