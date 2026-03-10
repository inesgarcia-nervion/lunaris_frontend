import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeticionesService } from '../../../domain/services/peticiones.service';

@Component({
  selector: 'app-peticiones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './peticiones.component.html',
  styleUrl: './peticiones.component.css'
})
export class PeticionesComponent {
  title = '';
  author = '';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private peticiones: PeticionesService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  submit() {
    this.error = null;
    this.success = null;
    if (!this.title.trim()) { this.error = 'El título es obligatorio'; return; }
    if (!this.author.trim()) { this.error = 'El autor es obligatorio'; return; }

    this.loading = true;
    this.peticiones.create({ title: this.title.trim(), author: this.author.trim() }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.success = 'Petición enviada correctamente';
          this.title = '';
          this.author = '';
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.error = err?.error?.message || 'Error enviando la petición';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
