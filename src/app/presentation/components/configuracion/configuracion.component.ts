import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../domain/services/auth.service';
import { ConfirmService } from '../../shared/confirm.service';

/**
 * Componente para configurar el perfil del usuario
 * 
 * Permite subir un avatar desde un archivo o usar una URL, con vista 
 * previa antes de aplicar.
 */
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
  filePreviewDataUrl: string | null = null;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  private initialUsername: string = '';
  private initialAvatar: string | null = null;
  useFile: File | null = null;
  theme: 'light' | 'dark' = 'light';
  error: string | null = null;
  success: string | null = null;
  isSaving: boolean = false;

  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef, private confirm: ConfirmService) {}

  /**
   * Inicializa el componente cargando el nombre de usuario actual, avatar y 
   * tema desde el servicio de autenticación.
   */
  ngOnInit(): void {
    const stored = this.auth.getCurrentUsername() || '';
    this.username = stored ? stored.trim() : null;
    this.newUsername = this.username || '';
    const storedAvatar = this.auth.getLocalAvatar();
    this.initialUsername = this.username || '';
    this.initialAvatar = storedAvatar || null;
    this.theme = this.auth.getUserTheme();
    try {
      document.body.classList.toggle('theme-dark', this.theme === 'dark');
      document.documentElement.classList.toggle('theme-dark', this.theme === 'dark');
    } catch (e) {
      console.warn('Unable to apply theme class on init', e);
    }
  }

  /**
   * Maneja el cambio de archivo para el avatar, generando una vista previa y
   * preparando el archivo para su aplicación.
   * @param ev Evento de cambio del input de archivo, del cual se extrae el archivo seleccionado.
   * @returns void
   */
  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    this.useFile = f;
    this.avatarUrl = '';
    this.avatarPreview = null;
    const reader = new FileReader();
    reader.onload = () => { this.filePreviewDataUrl = reader.result as string; };
    reader.readAsDataURL(f);
  }

  /**
   * Maneja el cambio en el campo de URL del avatar, limpiando cualquier selección de archivo y
   * vista previa relacionada.
   * @returns void
   */
  onUrlChange() {
    if (this.avatarUrl) {
      this.useFile = null;
      this.filePreviewDataUrl = null;
      this.avatarPreview = null;
      if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Alterna la vista previa del avatar basado en la URL ingresada, permitiendo al usuario ver 
   * cómo se verá antes de aplicarlo.
   * @returns void
   */
  setAvatarFromUrl() {
    if (!this.avatarUrl) return;
    if (this.avatarPreview === this.avatarUrl) {
      this.avatarPreview = null;
    } else {
      this.avatarPreview = this.avatarUrl;
      this.useFile = null;
      this.filePreviewDataUrl = null;
    }
    if (this.success) setTimeout(() => this.success = null, 3000);
  }

  /**
   * Alterna la vista previa del avatar basado en el archivo seleccionado, permitiendo al usuario ver
   * cómo se verá antes de aplicarlo.
   * @returns void
   */
  toggleFilePreview() {
    if (!this.useFile || !this.filePreviewDataUrl) return;
    if (this.avatarPreview === this.filePreviewDataUrl) {
      this.avatarPreview = null;
    } else {
      this.avatarPreview = this.filePreviewDataUrl;
      this.avatarUrl = '';
    }
  }

  /**
   * Alterna el tema entre claro y oscuro, aplicando la clase correspondiente al body y al elemento 
   * raíz, y guardando la preferencia en el servicio de autenticación.
   * @returns void
   */
  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.auth.setUserTheme(this.theme);
    try {
      if (this.theme === 'dark') {
        document.body.classList.add('theme-dark');
        document.documentElement.classList.add('theme-dark');
      } else {
        document.body.classList.remove('theme-dark');
        document.documentElement.classList.remove('theme-dark');
      }
    } catch (e) {
      console.warn('Unable to toggle theme class', e);
    }
  }

  /**
   * Aplica el avatar seleccionado, ya sea desde una URL o un archivo, guardándolo en el servicio de 
   * autenticación y mostrando un mensaje de éxito.
   * @returns void
   */
  applyAvatar() {
    const toApply = this.avatarPreview || this.filePreviewDataUrl || (this.avatarUrl || null);
    if (!toApply) return;
    this.saveAppliedAvatar(toApply);
  }

  /**
   * Aplica el avatar ingresado por URL, guardándolo en el servicio de autenticación y mostrando un mensaje de éxito.
   * @returns void
   */
  applyUrlAvatar() {
    const toApply = (this.avatarUrl || '').trim();
    if (!toApply) return;
    this.saveAppliedAvatar(toApply);
    this.avatarUrl = '';
    this.avatarPreview = null;
    this.filePreviewDataUrl = null;
    this.initialAvatar = toApply;
  }

  /**
   * Aplica el avatar seleccionado desde un archivo, guardándolo en el servicio de autenticación y mostrando un mensaje de éxito.
   * @returns void
   */
  applyFileAvatar() {
    const toApply = this.filePreviewDataUrl || this.avatarPreview || null;
    if (!toApply) return;
    this.saveAppliedAvatar(toApply);
    this.useFile = null;
    this.filePreviewDataUrl = null;
    if (this.fileInput && this.fileInput.nativeElement) this.fileInput.nativeElement.value = '';
    this.avatarPreview = null;
    this.initialAvatar = toApply;
  }

  /**
   * Maneja la vista previa del avatar basado en la entrada actual, ya sea URL o archivo, 
   * permitiendo al usuario ver cómo se verá antes de aplicarlo.
   * @returns void
   */
  previewAvatar() {
    if (this.avatarUrl) {
      this.setAvatarFromUrl();
    } else if (this.useFile) {
      this.toggleFilePreview();
    }
  }

  /**
   * Aplica el avatar seleccionado, ya sea desde una URL o un archivo, guardándolo en el 
   * servicio de autenticación y mostrando un mensaje de éxito.
   * @returns void  
   */
  applyAvatarUnified() {
    if (this.avatarUrl) {
      this.applyUrlAvatar();
    } else if (this.filePreviewDataUrl || this.useFile) {
      this.applyFileAvatar();
    }
  }

  /**
   * Guarda el avatar aplicado en el servicio de autenticación y muestra un mensaje de éxito, 
   * centralizando la lógica de aplicación del avatar.
   * @returns void
   * @param toApply La URL o Data URL del avatar a aplicar.
   */
  private saveAppliedAvatar(toApply: string) {
    try { this.auth.setLocalAvatar(toApply); } catch (e) { console.warn(e); }
    this.success = 'Avatar aplicado correctamente';
    setTimeout(() => this.success = null, 2500);
  }

  /**
   * Indica si hay cambios pendientes en el nombre de usuario o el avatar.
   * @returns boolean
   */
  get hasChanges(): boolean {
    const newName = (this.newUsername || '').trim();
    const nameChanged = newName.length > 0 && newName.toLowerCase() !== (this.initialUsername || '').toLowerCase();
    const avatarChanged = (this.useFile != null) || (this.avatarPreview || null) !== (this.initialAvatar || null);
    return nameChanged || avatarChanged;
  }

  /**
   * Indica si el nombre de usuario ha cambiado.
   * @returns boolean
   */
  get isNameChanged(): boolean {
    const newName = (this.newUsername || '').trim();
    return newName.length > 0 && newName.toLowerCase() !== (this.initialUsername || '').toLowerCase();
  }

  /**
   * Indica si el avatar ha cambiado, ya sea por una nueva URL o un nuevo archivo seleccionado.
   * @returns boolean
   */
  async submitChanges() {
    this.error = null; this.success = null;
    const current = this.username || '';
    const newName = (this.newUsername || '').trim();
    if (!newName) { this.error = 'El nombre de usuario no puede estar vacío'; return; }
    if (newName === current && !this.useFile && !this.avatarPreview) {
      this.error = 'No hay cambios para guardar';
      setTimeout(() => {
        if (this.error === 'No hay cambios para guardar') {
          this.error = null;
          try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
        }
      }, 5000);
      return;
    }

    const ok = await this.confirm.confirm(`¿Estás seguro de cambiar tu usuario a "${newName}"?`);
    if (!ok) return;
    const payload: any = { username: newName };
    if (this.avatarPreview && /^https?:\/\//i.test(this.avatarPreview)) {
      payload.avatarUrl = this.avatarPreview;
    }

    this.isSaving = true;
    this.auth.updateUser(current, payload).subscribe({
      next: () => {
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
