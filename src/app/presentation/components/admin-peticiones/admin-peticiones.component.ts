import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeticionesService, BookRequestDto } from '../../../domain/services/peticiones.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-admin-peticiones',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './admin-peticiones.component.html',
    styleUrls: ['./admin-peticiones.component.css']
})
export class AdminPeticionesComponent implements OnInit {
  requests: BookRequestDto[] = [];
  loading = false;
  error: string | null = null;
  deletingId: number | null = null;

  // Pagination
  pageSize = 9;
  currentPage = 1;
  pagedRequests: BookRequestDto[] = [];

  constructor(private peticiones: PeticionesService, private cdr: ChangeDetectorRef, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.peticiones.getAll().subscribe({
      next: (r) => {
        this.requests = r;
        this.currentPage = 1;
        this.updatePagination();
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

  updatePagination(): void {
    const totalPages = Math.max(1, Math.ceil(this.requests.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedRequests = this.requests.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
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
        this.updatePagination();
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
