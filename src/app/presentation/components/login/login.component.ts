import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ListasService } from '../../services/listas.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  rememberMe = false;
  error: string | null = null;
  loading = false;
  showPassword: boolean = false;


  constructor(private auth: AuthService, public router: Router, private cdr: ChangeDetectorRef, private listasService: ListasService) {}


  submit() {
    this.error = null;
   
    if (!this.username || !this.password) {
      this.error = 'Por favor, introduce usuario y contraseña';
      return;
    }
   
    this.loading = true;
    // Development bypass: accept admin/admin locally without contacting backend
    if (this.username === 'admin' && this.password === 'admin') {
      this.auth.devAdminLogin(this.rememberMe).subscribe({
        next: () => {
          try { this.listasService.assignUnownedListsToCurrentUser(this.username); } catch (e) { console.error('Error assigning list ownership', e); }
          this.loading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/menu']);
        }
      });
      return;
    }


    this.auth.login(this.username, this.password, this.rememberMe).subscribe({
      next: () => {
        // assign ownership for any lists created earlier without owner
        try {
          this.listasService.assignUnownedListsToCurrentUser(this.username);
        } catch (e) {
          console.error('Error assigning list ownership', e);
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

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }
}
