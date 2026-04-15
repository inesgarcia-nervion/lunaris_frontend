import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookSearchService, OpenLibraryBook } from '../../../domain/services/book-search.service';
import { AuthService } from '../../../domain/services/auth.service';
import { ListasService } from '../../../domain/services/listas.service';
import { ConfirmService } from '../../shared/confirm.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
 * Componente para mostrar las listas de usuario (excepto las del perfil) 
 * con búsqueda, paginación y gestión de listas.
 */
@Component({
  selector: 'app-listas-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './listas-usuarios.component.html',
  styleUrls: ['./listas-usuarios.component.css']
})
export class ListasUsuariosComponent implements OnInit {
  search: string = '';
  listas: any[] = [];
  filteredListas: any[] = [];
  pageSize = 8;
  currentPage = 1;
  pagedListas: any[] = [];
  showCreateInput: boolean = false;
  newListName: string = '';
  newListPrivate: boolean = false;
  currentUser: string | null = null;
  createError: string = '';
  private errorTimer: any = null;
  listSuccess: string | null = null;

  constructor(
    public bookSearchService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private listasService: ListasService,
    private route: ActivatedRoute,
    public router: Router,
    public auth: AuthService,
    private confirm: ConfirmService
  ) {}

  /**
   * Al iniciar el componente, se cargan las listas de usuario 
   * (filtrando las del perfil y privadas si no es admin),
   * se establece el usuario actual y se configuran las suscripciones 
   * para actualizar la vista cuando cambien las listas o favoritos.
   */
  ngOnInit(): void {
    this.listas = this.filterOutProfileLists(this.listasService.getAll());
    this.filteredListas = this.listas;
    this.updatePagination();
    this.currentUser = this.listasService.getCurrentUser();
    this.listasService.listas$.subscribe(l => { this.listas = this.filterOutProfileLists(l || []); this.filteredListas = this.listas; this.updatePagination(); this.cdr.markForCheck(); });
    this.listasService.favorites$.subscribe(() => { this.cdr.markForCheck(); });
    this.route.queryParams.subscribe((q: Record<string, any>) => {
      if (q && q['msg']) {
        this.listSuccess = q['msg'];
        setTimeout(() => { this.listSuccess = null; try { this.cdr.markForCheck(); } catch(_){} }, 5000);
      }
    });
    console.log('ListasUsuariosComponent initialized; current searchQuery:', this.bookSearchService.getSearchQuery());
  }

  /**
   * Edita el nombre de una lista si el usuario es el propietario y no es una lista de perfil.
   * @param listId El ID de la lista a editar.
   * @returns void
   */
  editList(listId: string): void {
    const lista = this.listasService.getById(listId);
    if (!lista) return;
    if (!lista.owner || lista.owner !== this.currentUser) return;
    if (this.listasService.isProfileListName(lista.nombre)) {
      alert('Las listas del perfil (Leyendo, Leído, Plan para leer) no se pueden renombrar.');
      return;
    }
    const nuevo = prompt('Nuevo nombre de la lista', lista.nombre);
    if (!nuevo) return;
    const nombre = nuevo.trim();
    if (!nombre) return;
    this.listasService.updateListName(listId, nombre);
  }

  /**
   * Elimina una lista si el usuario es el propietario y no es una lista de perfil, 
   * solicitando confirmación antes de la eliminación.
   * @param listId El ID de la lista a eliminar.
   * @returns void
   */
  async deleteList(listId: string): Promise<void> {
    const lista = this.listasService.getById(listId);
    if (!lista) return;
    if (!lista.owner || (lista.owner !== this.currentUser && !this.auth.isAdmin())) return;
    if (this.listasService.isProfileListName(lista.nombre)) {
      alert('Las listas del perfil no se pueden eliminar.');
      return;
    }
    const ok = await this.confirm.confirm(`¿Estás seguro de eliminar la lista "${lista.nombre}"?`);
    if (!ok) return;
    this.listasService.deleteList(listId);
    this.listSuccess = 'Lista eliminada';
    setTimeout(() => { this.listSuccess = null; try { this.cdr.markForCheck(); } catch(_){} }, 5000);
  }

  /**
   * Filtra las listas mostradas según el término de búsqueda ingresado,
   * actualizando la paginación para mostrar los resultados filtrados.
   * @returns void  
   */
  onSearch(): void {
    const term = this.search.toLowerCase();
    this.filteredListas = this.listas.filter(l => l.nombre.toLowerCase().includes(term));
    this.currentPage = 1;
    this.updatePagination();
  }

  /**
   * Actualiza la lista de listas mostradas según la página actual y el tamaño de página,
   * aplicando la paginación a las listas filtradas.
   * @returns void
   */
  updatePagination(): void {
    const rest = this.filteredListas.slice(1);
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedListas = rest.slice(start, start + this.pageSize);
  }

  /**
   * Maneja el cambio de página en la paginación, actualizando la página actual y recalculando las listas a mostrar.
   * @param page El número de página seleccionado.
   * @returns void
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  /**
   * Filtra las listas para excluir las listas de perfil (Leyendo, Leído, Plan para leer) 
   * y las listas privadas si el usuario no es admin.
   * @param listas Las listas a filtrar.
   * @returns Las listas filtradas.
   */
  private filterOutProfileLists(listas: any[]): any[] {
    if (!Array.isArray(listas)) return [];
    const skip = new Set(['leyendo', 'leído', 'leido', 'plan para leer']);
    return listas.filter(l => {
      try {
        const nombre = (l.nombre || '').toString().toLowerCase();
        const isProfile = skip.has(nombre);
        const isPrivate = !!l.isPrivate;
        if (isProfile) return false;
        if (isPrivate && !this.auth.isAdmin()) return false;
        return true;
      } catch {
        return true;
      }
    });
  }

  /**
   * Muestra el input para crear una nueva lista. Al confirmar, se valida 
   * el nombre (no vacío, no duplicado para el usuario), se crea la lista, 
   * se navega a su vista detalle y se limpia el estado del input. 
   * Al cancelar, simplemente se oculta el input y se limpia el estado.
   * @returns void
   */
  crearLista(): void {
    this.showCreateInput = true;
  }

  /**
   * Valida y crea una nueva lista con el nombre ingresado, asignando el 
   * usuario actual como propietario.
   * @returns void
   */
  confirmCreate(): void {
    const name = (this.newListName || '').trim();
    if (!name) {
      return;
    }
    const duplicate = this.listasService.getAll().some(
      l => l.owner === this.currentUser && (l.nombre || '').toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      this.createError = 'Ya tienes una lista con ese nombre';
      if (this.errorTimer) clearTimeout(this.errorTimer);
      this.errorTimer = setTimeout(() => { this.createError = ''; this.cdr.markForCheck(); }, 3000);
      this.cdr.markForCheck();
      return;
    }
    this.createError = '';
    const nueva = this.listasService.addList(name, !!this.newListPrivate);
    this.bookSearchService.setNavigationOrigin({ type: 'listas' });
    this.router.navigate(['/listas', nueva.id]);
    this.cdr.detectChanges();
    this.newListName = '';
    this.showCreateInput = false;
    this.newListPrivate = false;
  }

  /**
   * Cancela la creación de una nueva lista, ocultando el input y limpiando 
   * el estado del nombre ingresado.
   * @returns void
   */
  cancelCreate(): void {
    this.newListName = '';
    this.showCreateInput = false;
  }

  /**
   * Obtiene la URL de la portada de un libro para usar en la plantilla.
   * @param book El libro del cual obtener la portada.
   * @returns La URL de la portada.
   */
  getCoverForTemplate(book: unknown): string {
    return this.bookSearchService.getCoverUrl(book as OpenLibraryBook);
  }

  /**
   * Obtiene el avatar del propietario de una lista para mostrarlo en la plantilla,
   * devolviendo null si no hay propietario o no se encuentra el avatar.
   * @param owner El nombre de usuario del propietario de la lista.
   * @returns La URL del avatar del propietario o null si no se encuentra.
   */
  getOwnerAvatar(owner?: string | null): string | null {
    return this.auth.getLocalAvatar(owner) || null;
  }

  /**
   * Obtiene el título de un libro para mostrarlo en la plantilla, devolviendo una 
   * cadena vacía si no se encuentra el título.
   * @param book El libro del cual obtener el título.
   * @returns El título del libro o una cadena vacía si no se encuentra.
   */
  getTitleForTemplate(book: unknown): string {
    try {
      return (book as OpenLibraryBook).title || '';
    } catch {
      return '';
    }
  }

  /**
   * Abre la vista de detalle de un libro al hacer clic en él desde una lista,
   * estableciendo el libro seleccionado en el servicio de búsqueda y navegando a la 
   * ruta de detalle.
   * @param book El libro que se desea abrir en detalle.
   * @returns void
   */
  openBookDetailFromList(book: unknown): void {
    const b = book as OpenLibraryBook;
    if (!b) return;
    this.bookSearchService.setSelectedBook(b);
    this.bookSearchService.setSearchQuery('');
    this.router.navigate(['/menu']);
  }

  /**
   * Abre la vista de detalle de una lista al hacer clic en ella, estableciendo el 
   * origen de navegación en el servicio de búsqueda y navegando a la ruta de detalle 
   * de la lista.
   * @param listId El ID de la lista que se desea abrir en detalle.
   */
  openListFromListas(listId: string): void {
    this.bookSearchService.setNavigationOrigin({ type: 'listas' });
    this.router.navigate(['/listas', listId]);
  }

  /**
   * Verifica si una lista está marcada como favorita por el usuario actual, devolviendo 
   * true o false según corresponda. Si ocurre algún error al verificar, se devuelve false 
   * por defecto.
   * @param listId El ID de la lista que se desea verificar.
   * @returns true si la lista está marcada como favorita, false en caso contrario.
   */
  isFavorited(listId: string): boolean {
    try {
      return this.listasService.isFavorited(listId);
    } catch {
      return false;
    }
  }

  /**
   * Alterna el estado de favorito de una lista para el usuario actual, deteniendo la 
   * propagación del evento para evitar que se active la navegación al hacer clic en el 
   * ícono de favorito. 
   * @param listId El ID de la lista cuyo estado de favorito se desea alternar.
   * @param event El evento que desencadenó la acción, opcional.
   */
  toggleFavorite(listId: string, event?: Event): void {
    if (event) event.stopPropagation();
    const lista = this.listasService.getById(listId);
    if (lista && lista.isPrivate) return;
    this.listasService.toggleFavorite(listId);
    this.cdr.markForCheck();
  }
}
