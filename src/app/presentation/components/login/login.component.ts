import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../domain/services/auth.service';
import { ListasService } from '../../../domain/services/listas.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  rememberMe = false;
  error: string | null = null;
  loading = false;
  showPassword: boolean = false;


  constructor(private auth: AuthService, public router: Router, private cdr: ChangeDetectorRef, private listasService: ListasService) {}

  ngOnInit(): void {
    try {
      // If the user previously chose "remember me" we stored a flag and the username
      const remembered = localStorage.getItem('lunaris_remember');
      if (remembered === 'true') {
        this.rememberMe = true;
        this.username = (localStorage.getItem('lunaris_current_user') || '') as string;
        const encodedPass = localStorage.getItem('lunaris_remember_pass');
        if (encodedPass) {
          try { this.password = atob(encodedPass); } catch { /* ignore decode error */ }
        }
      } else {
        // If not remembered but there is a session-stored username, prefill it
        this.username = (sessionStorage.getItem('lunaris_current_user') || '');
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  submit() {
    this.error = null;
   
    if (!this.username || !this.password) {
      this.error = 'Por favor, introduce usuario y contraseña';
      return;
    }
   
    this.loading = true;

    this.auth.login(this.username, this.password, this.rememberMe).subscribe({
      next: () => {
        // assign ownership for any lists created earlier without owner
        try {
          this.listasService.assignUnownedListsToCurrentUser(this.username);
        } catch (e) {
          console.error('Error assigning list ownership', e);
        }
        // Ensure remember flags and current user are stored (double-check)
        try {
          if (this.rememberMe) {
            try { localStorage.setItem('lunaris_remember', 'true'); } catch {}
            try { localStorage.setItem('lunaris_current_user', this.username); } catch {}
          } else {
            try { sessionStorage.setItem('lunaris_current_user', this.username); } catch {}
          }
        } catch (e) {
          console.warn('Unable to persist remember-me settings', e);
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
