import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
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
  groupedRequests: Array<{ key: string; title: string; author: string; ids: number[]; count: number; }> = [];
  loading = false;
  error: string | null = null;
  deletingId: number | null = null;
  deletingGroupKey: string | null = null;

  pageSize = 9;
  currentPage = 1;
  pagedRequests: Array<{ key: string; title: string; author: string; ids: number[]; count: number; }> = [];

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
        this.buildGroups();
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
    const totalPages = Math.max(1, Math.ceil(this.groupedRequests.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedRequests = this.groupedRequests.slice(start, start + this.pageSize);
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
    this.error = 'Id de petición inválido';
    return;
  }

  /** Elimina todas las peticiones agrupadas (mismo título+autor) */
  async removeGroup(group?: { key: string; title: string; author: string; ids: number[]; count: number; }): Promise<void> {
    if (!group) {
      this.error = 'Grupo inválido';
      return;
    }
    const ok = await this.confirm.confirm('¿Estás seguro de eliminar todas las peticiones de este libro?');
    if (!ok) return;
    this.deletingGroupKey = group.key;
    const ids = [...group.ids];
    for (const id of ids) {
      try {
        await firstValueFrom(this.peticiones.delete(id));
        this.requests = this.requests.filter(x => x.id !== id);
      } catch (e) {
        // continuar con los siguientes
      }
    }
    this.buildGroups();
    this.updatePagination();
    this.deletingGroupKey = null;
    this.cdr.detectChanges();
  }

  private buildGroups(): void {
    const map = new Map<string, { key: string; title: string; author: string; ids: number[]; count: number; }>();
    for (const r of this.requests) {
      const title = (r.title || '').trim();
      const author = (r.author || '').trim();
      const key = `${title.toLowerCase()}|${author.toLowerCase()}`;
      const existing = map.get(key);
      if (existing) {
        existing.ids.push(r.id as number);
        existing.count = existing.ids.length;
      } else {
        map.set(key, { key, title, author, ids: [r.id as number], count: 1 });
      }
    }
    this.groupedRequests = Array.from(map.values());
  }
}
