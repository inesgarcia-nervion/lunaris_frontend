import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeticionesService, BookRequestDto } from '../../../domain/services/peticiones.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
 * Componente para administrar las peticiones de libros. Permite listar, eliminar 
 * y paginar las peticiones.
 * 
 * Utiliza el servicio PeticionesService para obtener y eliminar peticiones, y 
 * ConfirmService para confirmar eliminaciones.
 * Implementa paginación manual para mostrar un número limitado de peticiones 
 * por página.
 */
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

  pageSize = 9;
  currentPage = 1;
  pagedRequests: BookRequestDto[] = [];

  constructor(private peticiones: PeticionesService, private cdr: ChangeDetectorRef, private confirm: ConfirmService) {}

  /**
   * Carga las peticiones al inicializar el componente. Muestra un mensaje de carga 
   * mientras se obtienen los datos, y maneja errores si la carga falla.
   * Después de cargar las peticiones, actualiza la paginación para mostrar la 
   * primera página de resultados.
   */
  ngOnInit(): void {
    this.load();
  }

  /**
   * Carga las peticiones desde el servicio. Establece el estado de carga y error
   * según corresponda. Al obtener las peticiones, actualiza la paginación para 
   * mostrar la primera página de resultados.
   * Si ocurre un error durante la carga, muestra un mensaje de error.
   */
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

  /**
   * Actualiza la paginación de las peticiones. Calcula el número total de páginas
   * y ajusta la página actual si es necesario. Luego, selecciona el subconjunto de 
   * peticiones que corresponden a la página actual para mostrar en la interfaz.
   * Este método se llama después de cargar las peticiones y cada vez que se cambia 
   * de página o se elimina una petición.
   */
  updatePagination(): void {
    const totalPages = Math.max(1, Math.ceil(this.requests.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedRequests = this.requests.slice(start, start + this.pageSize);
  }

  /**
   * Maneja el cambio de página. Actualiza la página actual y luego llama a 
   * updatePagination para mostrar las peticiones correspondientes a la nueva página.
   * @param page El número de página seleccionado por el usuario.
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  /**
   * Elimina una petición de libro. Primero, solicita confirmación al usuario. 
   * Si el usuario confirma, llama al servicio para eliminar la petición. 
   * Mientras se elimina, muestra un estado de eliminación.
   * Si la eliminación es exitosa, actualiza la lista de peticiones y la paginación. 
   * Si ocurre un error, muestra un mensaje de error.
   * @param id El ID de la petición a eliminar.
   * @returns Una promesa que se resuelve cuando la operación de eliminación se completa.
   */
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
