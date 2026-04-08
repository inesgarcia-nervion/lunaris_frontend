import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { ConfirmService } from '../../shared/confirm.service';
import { Subscription } from 'rxjs';
import { BookSearchService, OpenLibraryBook } from '../../../domain/services/book-search.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
 * Componente para mostrar los detalles de una lista de libros, 
 * incluyendo su paginación, edición y eliminación.
 */
@Component({
  selector: 'app-lista-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-detalle.component.html',
  styleUrls: ['./lista-detalle.component.css']
})
export class ListaDetalleComponent implements OnInit, OnDestroy {
  lista: ListaItem | undefined;
  pageSize = 12;
  currentPage = 1;
  pagedLibros: any[] = [];
  private subs: Subscription[] = [];
  private currentId: string = '';
  currentUser: string | null = null;

  // Estado para la ventana de edición
  editingList = false;
  editNombre = '';
  editIsPrivate = false;
  editOriginalNombre = '';
  editOriginalIsPrivate = false;

  constructor(private route: ActivatedRoute, private listas: ListasService, private router: Router, private bookSearch: BookSearchService, private location: Location, private confirm: ConfirmService) {}

  /**
   * Inicializa el componente, obteniendo la lista a mostrar según el ID de la ruta,
   * configurando la paginación y suscribiéndose a cambios en las listas para actualizar la vista.
   */
  ngOnInit(): void {
    this.currentId = this.route.snapshot.paramMap.get('id') || '';
    this.lista = this.listas.getById(this.currentId);
    this.updatePagination();
    this.currentUser = this.listas.getCurrentUser();
    this.subs.push(this.listas.listas$.subscribe(() => {
      this.lista = this.listas.getById(this.currentId);
      this.currentPage = 1;
      this.updatePagination();
    }));
  }

  /**
   * Actualiza la lista de libros a mostrar según la página actual y el tamaño de página.
   */
  updatePagination(): void {
    const libros = this.lista?.libros || [];
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedLibros = libros.slice(start, start + this.pageSize);
  }

  /**
   * Maneja el cambio de página en la paginación, actualizando la página actual y la lista de libros mostrados.
   * @param page El número de página seleccionado.
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  /**
   * Abre el detalle de un libro seleccionado, estableciendo el origen de navegación para permitir un regreso adecuado.
   * @param book El libro seleccionado para mostrar en detalle.
   * @returns void
   */
  openFromDetail(book: any): void {
    const b = book as OpenLibraryBook;
    if (!b) return;
    const prev = this.bookSearch.getNavigationOrigin();
    const origin: any = { type: 'list', listId: this.currentId };
    if (prev && prev.type === 'profile') {
      origin.parentType = prev.type;
      origin.parentListId = prev.listId;
    }
    this.bookSearch.setNavigationOrigin(origin);
    this.bookSearch.setSelectedBook(b);
    this.router.navigateByUrl('/menu');
  }

  /**
   * Maneja la acción de volver a la vista anterior, determinando el destino según el origen de navegación registrado.
   * @returns void
   */
  back(): void {
    const origin = this.bookSearch.getNavigationOrigin();
    if (origin) {
      if (origin.type === 'menu') {
        this.bookSearch.setNavigationOrigin(null);
        this.location.back();
        return;
      }
      if (origin.type === 'listas') {
        this.bookSearch.setNavigationOrigin(null);
        this.router.navigateByUrl('/listas-usuarios');
        return;
      }
      if (origin.type === 'profile') {
        this.bookSearch.setNavigationOrigin(null);
        this.router.navigateByUrl('/perfil');
        return;
      }
      if ((origin as any).parentType === 'profile') {
        this.bookSearch.setNavigationOrigin(null);
        this.router.navigateByUrl('/perfil');
        return;
      }
    }
    this.router.navigateByUrl('/listas-usuarios');
  }

  /**
   * Obtiene la etiqueta del botón de retroceso según el origen de navegación registrado.
   * @returns La etiqueta del botón de retroceso.
   */
  get backButtonLabel(): string {
    const origin = this.bookSearch.getNavigationOrigin();
    if (!origin) return '← Volver';
    if (origin.type === 'menu') return '← Volver al menú';
    if (origin.type === 'listas') return '← Volver a listas';
    if (origin.type === 'profile') return '← Volver al perfil';
    return '← Volver';
  }

  /**
   * Limpia las suscripciones al destruir el componente para evitar fugas de memoria.
   */
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /**
   * Verifica si el nombre de la lista corresponde a una lista de perfil.
   * @param name El nombre de la lista a verificar.
   * @returns true si es una lista de perfil, false en caso contrario.
   */
  isProfileList(name: string | undefined | null): boolean {
    return this.listas.isProfileListName(name || undefined);
  }

  /**
   * Obtiene la URL de la portada de un libro, utilizando el servicio de 
   * búsqueda de libros o construyendo la URL manualmente según los datos 
   * disponibles.
   * @param book El libro del cual obtener la portada.
   * @returns La URL de la portada del libro.
   */
  getCover(book: any): string {
    try {
      return this.bookSearch.getCoverUrl(book as OpenLibraryBook);
    } catch {
      const coverId = (book && (book.cover_i || book.coverId));
      if (coverId) return 'https://covers.openlibrary.org/b/id/' + coverId + '-M.jpg';
      if (book && book.coverUrl) return book.coverUrl;
      if (book && book.coverImage) return book.coverImage;
      return '/assets/placeholder.png';
    }
  }

  /**
   * Obtiene el nombre del autor de un libro, utilizando el servicio de búsqueda de 
   * libros o extrayendo el nombre de los campos disponibles en el objeto del libro.
   * @param book El libro del cual obtener el nombre del autor.
   * @returns El nombre del autor del libro.
   */
  getAuthor(book: any): string {
    try {
      const fromService = this.bookSearch.getFirstAuthor(book as OpenLibraryBook);
      if (fromService && fromService !== 'Autor desconocido') return fromService;
    } catch {}
    if (book) {
      if (Array.isArray(book.author_name) && book.author_name.length > 0) return book.author_name[0];
      if (Array.isArray(book.authorNames) && book.authorNames.length > 0) return book.authorNames[0];
      if (book.author) return book.author;
    }
    return '';
  }

  /**
   * Elimina un libro de la lista actual después de confirmar la acción con el usuario.
   * @param listId El ID de la lista de la cual eliminar el libro.
   * @param book El libro a eliminar de la lista. 
   * @param event El evento de clic que se puede usar para detener la propagación si es necesario.
   * @returns void
   */
  async removeFromList(listId: string, book: any, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const ok = await this.confirm.confirm('¿Estás seguro de eliminar este libro de la lista?');
    if (!ok) return;
    this.listas.removeBookFromList(listId, book as OpenLibraryBook);
  }

  /**
   * Elimina la lista actual después de confirmar la acción con el usuario, verificando que no sea 
   * una lista de perfil.
   * @returns void
   */
  async confirmAndDeleteList(): Promise<void> {
    if (!this.lista) return;
    if (this.isProfileList(this.lista.nombre)) {
      alert('Esta lista del perfil no puede eliminarse.');
      return;
    }
    const ok = await this.confirm.confirm(`¿Estás seguro de que quieres eliminar la lista "${this.lista.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    this.listas.deleteList(this.lista.id);
    this.router.navigateByUrl('/listas-usuarios');
  }

  /**
   * Edita el nombre de la lista actual después de solicitar un nuevo nombre al usuario, verificando 
   * que no sea una lista de perfil y que el usuario tenga permisos para editarla.
   * @returns void
   */
  editListName(): void {
    if (!this.lista) return;
    if (!this.lista.owner || this.lista.owner !== this.currentUser) return;
    if (this.isProfileList(this.lista.nombre)) {
      alert('El nombre de esta lista no se puede editar.');
      return;
    }
    const nuevo = prompt('Nuevo nombre de la lista', this.lista.nombre);
    if (!nuevo) return;
    const nombre = nuevo.trim();
    if (!nombre) return;
    this.listas.updateListName(this.lista.id, nombre);
    this.lista = this.listas.getById(this.currentId);
  }

  openEditModal(): void {
    if (!this.lista) return;
    if (!this.lista.owner || this.lista.owner !== this.currentUser) return;
    if (this.isProfileList(this.lista.nombre)) {
      alert('El nombre de esta lista no se puede editar.');
      return;
    }
    this.editNombre = this.lista.nombre;
    this.editIsPrivate = !!this.lista.isPrivate;
    this.editOriginalNombre = this.lista.nombre;
    this.editOriginalIsPrivate = !!this.lista.isPrivate;
    this.editingList = true;
  }

  saveEdit(): void {
    if (!this.lista) return;
    const nombre = this.editNombre.trim();
    if (!nombre) return;
    this.listas.updateListName(this.lista.id, nombre);
    this.listas.updateListPrivacy(this.lista.id, this.editIsPrivate);
    this.lista = this.listas.getById(this.currentId);
    this.editingList = false;
  }

  cancelEdit(): void {
    this.editingList = false;
  }

  hasChanges(): boolean {
    const original = (this.editOriginalNombre || '').trim();
    const current = (this.editNombre || '').trim();
    if (original !== current) return true;
    if (!!this.editOriginalIsPrivate !== !!this.editIsPrivate) return true;
    return false;
  }

  /**
   * Verifica si la lista actual está marcada como favorita por el usuario, utilizando el servicio de 
   * listas para determinarlo.
   * @returns true si la lista está marcada como favorita, false en caso contrario.
   */
  isFavorited(): boolean {
    try {
      return this.listas.isFavorited(this.currentId);
    } catch {
      return false;
    }
  }

  /**
   * Marca o desmarca la lista actual como favorita después de confirmar la acción con el usuario,
   * utilizando el servicio de listas para realizar la acción y actualizar el estado de la lista. 
   * @returns void
   */
  async confirmAndRemoveFavorite(): Promise<void> {
    if (!this.lista) return;
    const ok = await this.confirm.confirm(`¿Quieres eliminar "${this.lista.nombre}" de tus favoritos?`);
    if (!ok) return;
    this.listas.toggleFavorite(this.currentId);
    this.lista = this.listas.getById(this.currentId);
  }
}
