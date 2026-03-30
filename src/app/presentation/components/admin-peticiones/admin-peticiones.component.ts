import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeticionesService, BookRequestDto } from '../../../domain/services/peticiones.service';
import { ConfirmService } from '../../shared/confirm.service';

@Component({
  selector: 'app-admin-peticiones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-peticiones.component.html',
  styleUrl: './admin-peticiones.component.css'
})
export class AdminPeticionesComponent implements OnInit {
  requests: BookRequestDto[] = [];
  loading = false;
  error: string | null = null;
  deletingId: number | null = null;

  constructor(private peticiones: PeticionesService, private cdr: ChangeDetectorRef, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.peticiones.getAll().subscribe({
      next: (r) => {
        this.requests = r;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.error = 'Error cargando peticiones';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async remove(id?: number): Promise<void> {
    if (id == null) {
      this.error = 'Id de petición inválido';
      return;
    }
    const ok = await this.confirm.confirm('¿Estás seguro de eliminar esta petición?');
    if (!ok) return;
    this.deletingId = id;
    this.peticiones.delete(id).subscribe({
      next: () => {
        this.requests = this.requests.filter(x => x.id !== id);
        this.deletingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Error al eliminar';
        this.deletingId = null;
        this.cdr.detectChanges();
      }
    });
  }
}
