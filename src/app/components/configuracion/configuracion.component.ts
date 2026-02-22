import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit {
  username: string | null = null;
  newUsername: string = '';
  avatarUrl: string = '';
  avatarPreview: string | null = null;
  useFile: File | null = null;
  theme: 'light' | 'dark' = (localStorage.getItem('lunaris_theme') as 'light' | 'dark') || 'light';
  error: string | null = null;
  success: string | null = null;
  isSaving: boolean = false;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.username = this.auth.getCurrentUsername();
    this.newUsername = this.username || '';
    const storedAvatar = localStorage.getItem('lunaris_avatar');
    if (storedAvatar) this.avatarPreview = storedAvatar;
    // Apply theme immediately on init so the UI matches stored preference
    try {
      document.body.classList.toggle('theme-dark', this.theme === 'dark');
    } catch (e) {
      console.warn('Unable to apply theme class on init', e);
    }
  }

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    this.useFile = f;
    const reader = new FileReader();
    reader.onload = () => { this.avatarPreview = reader.result as string; };
    reader.readAsDataURL(f);
  }

  setAvatarFromUrl() {
    if (!this.avatarUrl) return;
    this.avatarPreview = this.avatarUrl;
    this.useFile = null;
    this.success = 'Vista previa actualizada';
    setTimeout(() => this.success = null, 3000);
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('lunaris_theme', this.theme);
    try {
      if (this.theme === 'dark') document.body.classList.add('theme-dark');
      else document.body.classList.remove('theme-dark');
    } catch (e) {
      console.warn('Unable to toggle theme class', e);
    }
  }

  applyAvatar() {
    if (!this.avatarPreview) return;
    try {
      // persist locally and notify AuthService so other components update
      localStorage.setItem('lunaris_avatar', this.avatarPreview);
    } catch (e) {
      console.warn('Unable to save avatar to localStorage', e);
    }
    // notify auth service
    try { this.auth.setLocalAvatar(this.avatarPreview); } catch (e) { console.warn(e); }
    this.success = 'Avatar aplicado correctamente';
    setTimeout(() => this.success = null, 2500);
  }

  async submitChanges() {
    this.error = null; this.success = null;
    const current = this.username || '';
    const newName = (this.newUsername || '').trim();
    if (!newName) { this.error = 'El nombre de usuario no puede estar vacío'; return; }
    if (newName === current && !this.useFile && !this.avatarPreview) { this.error = 'No hay cambios para guardar'; return; }

    const ok = confirm(`¿Estás seguro de cambiar tu usuario a "${newName}"?`);
    if (!ok) return;
    // prepare payload
    const payload: any = { username: newName };
    // Avoid sending large base64 payloads to the backend (DB may have varchar limits).
    // If the user provided a URL (starts with http/https), send it. If they uploaded
    // a file (base64), persist locally and notify the user to re-login — backend
    // should handle file uploads separately.
    if (this.avatarPreview && /^https?:\/\//i.test(this.avatarPreview)) {
      payload.avatarUrl = this.avatarPreview;
    }

    this.isSaving = true;
    this.auth.updateUser(current, payload).subscribe({
      next: () => {
        // save avatar locally and clear auth so user must login again
        if (this.avatarPreview) this.auth.setLocalAvatar(this.avatarPreview);
        alert('Usuario actualizado. Se te redirigirá al login.');
        this.auth.logout();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        if (err?.status === 409) this.error = 'El nombre de usuario ya existe o no se puede usar';
        else this.error = err?.error?.message || err?.message || 'Error al actualizar el usuario';
        this.isSaving = false;
      },
      complete: () => { this.isSaving = false; }
    });
  }
}
