import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../domain/services/auth.service';
import { ConfirmService } from '../../shared/confirm.service';

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
  // preview data url for an uploaded file (not applied until user clicks)
  filePreviewDataUrl: string | null = null;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  // snapshots of initial state to detect real changes
  private initialUsername: string = '';
  private initialAvatar: string | null = null;
  useFile: File | null = null;
  theme: 'light' | 'dark' = 'light';
  error: string | null = null;
  success: string | null = null;
  isSaving: boolean = false;

  constructor(private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef, private confirm: ConfirmService) {}

  ngOnInit(): void {
    const stored = this.auth.getCurrentUsername() || '';
    // normalize stored username to avoid whitespace/case mismatches
    this.username = stored ? stored.trim() : null;
    this.newUsername = this.username || '';
    const storedAvatar = this.auth.getLocalAvatar();
    // do not show existing avatar as a preview on load; only use it as the initial snapshot
    this.initialUsername = this.username || '';
    this.initialAvatar = storedAvatar || null;
    // Load per-user theme
    this.theme = this.auth.getUserTheme();
    // Apply theme immediately on init so the UI matches stored preference
    try {
      document.body.classList.toggle('theme-dark', this.theme === 'dark');
      document.documentElement.classList.toggle('theme-dark', this.theme === 'dark');
    } catch (e) {
      console.warn('Unable to apply theme class on init', e);
    }
  }

  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    this.useFile = f;
    // clear URL when a file is selected
    this.avatarUrl = '';
    this.avatarPreview = null;
    const reader = new FileReader();
    reader.onload = () => { this.filePreviewDataUrl = reader.result as string; };
    reader.readAsDataURL(f);
  }

  onUrlChange() {
    // clear file selection when URL is typed
    if (this.avatarUrl) {
      this.useFile = null;
      this.filePreviewDataUrl = null;
      this.avatarPreview = null;
      if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
    }
  }

  setAvatarFromUrl() {
    if (!this.avatarUrl) return;
    // toggle preview for the URL: if already showing this URL, clear it
    if (this.avatarPreview === this.avatarUrl) {
      this.avatarPreview = null;
    } else {
      this.avatarPreview = this.avatarUrl;
      // clear any file selection when previewing a URL
      this.useFile = null;
      this.filePreviewDataUrl = null;
    }
    if (this.success) setTimeout(() => this.success = null, 3000);
  }

  toggleFilePreview() {
    if (!this.useFile || !this.filePreviewDataUrl) return;
    if (this.avatarPreview === this.filePreviewDataUrl) {
      this.avatarPreview = null;
    } else {
      this.avatarPreview = this.filePreviewDataUrl;
      // clear URL when previewing file
      this.avatarUrl = '';
    }
  }

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

  /** Generic apply kept for backward compatibility but not used in template */
  applyAvatar() {
    const toApply = this.avatarPreview || this.filePreviewDataUrl || (this.avatarUrl || null);
    if (!toApply) return;
    this.saveAppliedAvatar(toApply);
  }

  /** Apply only the URL input as avatar; clears the URL input when done */
  applyUrlAvatar() {
    const toApply = (this.avatarUrl || '').trim();
    if (!toApply) return;
    this.saveAppliedAvatar(toApply);
    // clear URL input after applying
    this.avatarUrl = '';
    // clear visible preview after applying (user requested)
    this.avatarPreview = null;
    this.filePreviewDataUrl = null;
    this.initialAvatar = toApply;
  }

  /** Apply only the currently selected file as avatar; clears file input when done */
  applyFileAvatar() {
    const toApply = this.filePreviewDataUrl || this.avatarPreview || null;
    if (!toApply) return;
    this.saveAppliedAvatar(toApply);
    // clear file selection inputs
    this.useFile = null;
    this.filePreviewDataUrl = null;
    if (this.fileInput && this.fileInput.nativeElement) this.fileInput.nativeElement.value = '';
    // clear visible preview after applying (user requested)
    this.avatarPreview = null;
    this.initialAvatar = toApply;
  }

  /** Unified preview: uses URL if filled, otherwise the selected file */
  previewAvatar() {
    if (this.avatarUrl) {
      this.setAvatarFromUrl();
    } else if (this.useFile) {
      this.toggleFilePreview();
    }
  }

  /** Unified apply: applies URL if filled, otherwise the selected file */
  applyAvatarUnified() {
    if (this.avatarUrl) {
      this.applyUrlAvatar();
    } else if (this.filePreviewDataUrl || this.useFile) {
      this.applyFileAvatar();
    }
  }

  private saveAppliedAvatar(toApply: string) {
    try { this.auth.setLocalAvatar(toApply); } catch (e) { console.warn(e); }
    this.success = 'Avatar aplicado correctamente';
    setTimeout(() => this.success = null, 2500);
  }

  get hasChanges(): boolean {
    const newName = (this.newUsername || '').trim();
    const nameChanged = newName.length > 0 && newName.toLowerCase() !== (this.initialUsername || '').toLowerCase();
    const avatarChanged = (this.useFile != null) || (this.avatarPreview || null) !== (this.initialAvatar || null);
    return nameChanged || avatarChanged;
  }

  get isNameChanged(): boolean {
    const newName = (this.newUsername || '').trim();
    return newName.length > 0 && newName.toLowerCase() !== (this.initialUsername || '').toLowerCase();
  }

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
    // prepare payload
    const payload: any = { username: newName };
    // If avatarPreview is a URL, include it in the payload so backend can persist it
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
