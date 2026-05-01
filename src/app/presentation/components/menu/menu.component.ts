import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../../domain/services/book-search.service';
import { AuthService } from '../../../domain/services/auth.service';
import { PeticionesService, BookRequestDto } from '../../../domain/services/peticiones.service';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { ReviewService, ReviewDto } from '../../../domain/services/review.service';
import { NewsService, NewsItem } from '../../../domain/services/news.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Componente principal que muestra el menú de búsqueda, resultados, 
 * detalles de libro, listas de usuarios, reseñas recientes y noticias.
 * 
 * También maneja la navegación entre estas secciones y la interacción 
 * con los servicios para mantener el estado sincronizado.
 */
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit, OnDestroy {
  searchResults: OpenLibraryBook[] = [];
  totalResults: number = 0;
  selectedBook: OpenLibraryBook | null = null;
  loading: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;
  currentPage: number = 1;
  isAdmin: boolean = false;
  adminRequests: BookRequestDto[] = [];

  userLists: ListaItem[] = [];
  listPageIndex: number = 0;
  readonly listsPerPage = 3;

  allReviews: ReviewDto[] = [];
  reviewPageIndex: number = 0;
  readonly reviewsPerPage = 3;

  latestNews: NewsItem[] = [];

  private customCoverCache = new Map<string, string>();

  userRating: number = 0;
  userReview: string = '';
  selectedList: string = 'Ejemplo2';
  selectedStatus: string = 'Leído';

  private subs: Subscription[] = [];

  constructor(public bookSearchService: BookSearchService, private auth: AuthService, private router: Router, private peticiones: PeticionesService, private listasService: ListasService, private reviewService: ReviewService, private newsService: NewsService, private cdr: ChangeDetectorRef) {
    this.isAdmin = this.auth.isAdmin();
  }

  /**
   * Inicializa el componente suscribiéndose a los observables 
   * de los servicios para mantener el estado sincronizado.
   */
  ngOnInit(): void {
    this.subs.push(this.auth.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    }));
    // refresh listas when entering menu so lists appear without page reload
    try { this.listasService.refreshFromServer(); } catch (e) {}
    if (this.isAdmin) this.loadAdminRequests();
    this.subs.push(this.auth.isAdmin$.subscribe(isAdmin => { if (isAdmin) this.loadAdminRequests(); }));
    this.subs.push(this.bookSearchService.response$.subscribe((r: OpenLibrarySearchResponse | null) => {
      this.searchResults = r?.docs || [];
      this.totalResults = r?.numFound || 0;
    }));

    this.subs.push(this.listasService.listas$.subscribe(listas => {
      this.userLists = listas
        .filter(l => !this.listasService.isProfileListName(l.nombre) && (!l.isPrivate || this.auth.isAdmin()))
        .sort((a, b) => Number(b.id) - Number(a.id));
      if (this.listPageIndex >= this.listTotalPages) {
        this.listPageIndex = Math.max(0, this.listTotalPages - 1);
      }
    }));

    this.subs.push(this.bookSearchService.selectedBook$.subscribe(b => {
      this.selectedBook = b;
      if (!b) this.reviewService.refreshAll();
    }));
    this.subs.push(this.bookSearchService.loading$.subscribe(l => this.loading = l));
    this.subs.push(this.bookSearchService.error$.subscribe(e => this.error = e));
    this.subs.push(this.bookSearchService.success$.subscribe(s => this.successMessage = s));
    this.subs.push(this.bookSearchService.currentPage$.subscribe(p => this.currentPage = p));

    this.subs.push(this.newsService.news$.subscribe(items => {
      this.latestNews = items.slice(0, 3);
    }));

    this.subs.push(this.reviewService.reviews$.subscribe(reviews => {
      this.allReviews = reviews;
      if (this.reviewPageIndex >= this.reviewTotalPages) {
        this.reviewPageIndex = Math.max(0, this.reviewTotalPages - 1);
      }
      try { this.cdr.detectChanges(); } catch (e) { 

      }
    }));
    this.reviewService.refreshAll();
  }

  /**
   * Carga las peticiones de libros pendientes para el administrador.
   * Solo se llama si el usuario es administrador, y se vuelve a 
   * cargar cada vez que cambia a admin.
   */
  private loadAdminRequests(): void {
    this.peticiones.getAll().subscribe({ next: (r) => { this.adminRequests = r || []; }, error: () => { this.adminRequests = []; } });
  }

  /**
   * Limpia las suscripciones para evitar fugas de memoria cuando el 
   * componente se destruye. Es importante para mantener el rendimiento 
   * y evitar comportamientos inesperados.
   */
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /**
   * Maneja la paginación de resultados de búsqueda. Estas funciones 
   * se llaman desde la plantilla para navegar entre páginas de resultados. 
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.bookSearchService.setCurrentPage(this.currentPage - 1);
      this.bookSearchService.searchCurrent();
    }
  }

  /**
   * Navega a la página siguiente de resultados de búsqueda, si existe.
   */
  nextPage(): void {
    const maxPages = this.getTotalPages();
    if (this.currentPage < maxPages) {
      this.bookSearchService.setCurrentPage(this.currentPage + 1);
      this.bookSearchService.searchCurrent();
    }
  }

  /**
   * Calcula el número total de páginas de resultados basado en el total 
   * de resultados y el número de resultados por página (12). Si no hay 
   * resultados, devuelve 1 para mostrar al menos una página vacía.
   * @returns El número total de páginas de resultados de búsqueda.
   */
  getTotalPages(): number {
    return Math.ceil(this.totalResults / 12) || 1;
  }

  /**
   * Determina si hay una página siguiente disponible comparando la página 
   * actual con el total de páginas.
   * @returns True si hay una página siguiente disponible, false en caso 
   * contrario.
   */
  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  /**
   * Determina si hay una página anterior disponible comparando la página 
   * actual con la primera página. 
   * @returns True si hay una página anterior disponible, false en caso 
   * contrario.
   */
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Maneja la selección de un libro de los resultados de búsqueda. 
   * @param book El libro seleccionado, que se establece como el 
   * libro seleccionado en el servicio de búsqueda. 
   */
  selectBook(book: OpenLibraryBook): void {
    this.bookSearchService.setNavigationOrigin({ type: 'search' });
    this.bookSearchService.setSelectedBook(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Maneja la acción de volver a la búsqueda desde el detalle de un libro.
   * Si el libro seleccionado proviene de una lista, navega de vuelta a esa 
   * lista en lugar de simplemente limpiar la selección. 
   * @returns void
   */
  backToSearch(): void {
    const origin = this.bookSearchService.getNavigationOrigin();
    if (origin && origin.type === 'list' && origin.listId) {
      this.bookSearchService.setSelectedBook(null);
      this.bookSearchService.setNavigationOrigin(null);
      this.router.navigate(['/listas', origin.listId]);
      return;
    }
    this.bookSearchService.setSelectedBook(null);
  }

  /**
   * Maneja la acción de enviar una reseña de usuario para el libro seleccionado.
   * @returns void
   */
  submitReview(): void {
    if (this.userRating && (isNaN(Number(this.userRating)) || this.userRating < 0 || this.userRating > 5)) {
      this.error = 'La puntuación debe estar entre 0 y 5';
      setTimeout(() => { this.error = null; try { this.cdr.markForCheck(); } catch {} }, 5000);
      return;
    }
    if (this.userReview.trim()) {
      this.bookSearchService.setSuccess('Review enviado correctamente');
    }
  }

  /**
   * Maneja la acción de añadir el libro seleccionado a una lista del usuario.
   * Actualmente solo muestra un mensaje de éxito, pero en una implementación 
   * completa debería interactuar con el servicio de listas para añadir el 
   * libro a la lista seleccionada por el usuario.
   */
  addToList(): void {
    this.bookSearchService.setSuccess(`Libro añadido a la lista "${this.selectedList}"`);
  }

  /**
   * Obtiene la URL de la portada de un libro utilizando el servicio de búsqueda de libros. 
   * @param book El libro para el cual se desea obtener la URL de la portada.
   * @returns La URL de la portada del libro, o una imagen predeterminada si no se encuentra 
   * una portada específica.
   */
  getCoverUrl(book: OpenLibraryBook): string {
    return this.bookSearchService.getCoverUrl(book);
  }

  /**
   * Obtiene el primer autor de un libro utilizando el servicio de búsqueda de libros.
   * @param book El libro del cual se desea obtener el primer autor.
   * @returns El nombre del primer autor del libro.
   */
  getFirstAuthor(book: OpenLibraryBook): string {
    return this.bookSearchService.getFirstAuthor(book);
  }

  /**
   * Obtiene el nombre de la saga a la que pertenece un libro, si es aplicable, 
   * utilizando el servicio de búsqueda de libros.
   * @param book El libro del cual se desea obtener el nombre de la saga.
   * @returns El nombre de la saga, o null si el libro no pertenece a ninguna saga.
   */
  getSagaName(book: any): string | null {
    return this.bookSearchService.getSagaName(book);
  }

  /**
   * Determina si un libro pertenece a una saga utilizando el servicio de búsqueda 
   * de libros.
   * @param book El libro del cual se desea verificar si pertenece a una saga.
   * @returns True si el libro pertenece a una saga, false en caso contrario.
   */
  isSaga(book: OpenLibraryBook): boolean {
    return this.bookSearchService.isSaga(book);
  }

  /**
   * Obtiene el número de ediciones de un libro utilizando el servicio de búsqueda 
   * de libros.
   * @param book El libro del cual se desea obtener el número de ediciones.
   * @returns El número de ediciones del libro como una cadena, o una cadena 
   * vacía si no se encuentra esta información.
   */
  getEditionCount(book: OpenLibraryBook): string {
    return this.bookSearchService.getEditionCount(book);
  }

  /**
   * Obtiene las categorías de un libro utilizando el servicio de búsqueda de libros.
   * @param book El libro del cual se desea obtener las categorías.
   * @returns Un arreglo de cadenas con las categorías del libro.
   */
  getCategories(book: any): string[] {
    return this.bookSearchService.getCategories(book);
  }

  /**
   * Genera un arreglo de cadenas que representan las estrellas de calificación 
   * basándose en la calificación numérica de un libro, utilizando el servicio 
   * de búsqueda de libros.
   * @param rating La calificación numérica del libro.
   * @returns Un arreglo de cadenas que representan las estrellas de calificación.
   */
  generateRatingArray(rating: number | undefined): string[] {
    return this.bookSearchService.generateRatingArray(rating);
  }

  /**
   * Obtiene la consulta de búsqueda actual desde el servicio de búsqueda de libros.
   * @returns La consulta de búsqueda actual como una cadena.
   */
  get searchQuery(): string {
    return this.bookSearchService.getSearchQuery();
  }

  /**
   * Decide si mostrar la sección hero en la página de menú.
   * Oculta la hero cuando se está mostrando el detalle de un libro
   * que proviene de una lista.
   */
  showHero(): boolean {
    const origin = this.bookSearchService.getNavigationOrigin();
    if (this.selectedBook && origin && origin.type === 'list') {
      return false;
    }
    return !this.searchQuery && this.searchResults.length === 0;
  }


  /**
   * Navega a una ruta específica utilizando el enrutador de Angular.
   * @param path La ruta a la que se desea navegar.
   */
  navigate(path: string): void {
    console.log('Menu navigate called:', path);
    this.router.navigateByUrl(path);
  }

  /**
   * Maneja la acción de abrir una lista específica desde el menú. 
   * Establece el origen de navegación en el servicio de búsqueda 
   * de libros para que el componente de detalle del libro sepa que 
   * proviene del menú, y luego navega a la ruta de la lista correspondiente.
   * @param listId El ID de la lista que se desea abrir.
   */
  openListFromMenu(listId: string): void {
    this.bookSearchService.setNavigationOrigin({ type: 'menu' });
    this.router.navigate(['/listas', listId]);
  }

  /**
   * Obtiene las listas paginadas de usuarios.
   * @returns Un arreglo de elementos de lista correspondientes a la página 
   * actual.
   */
  get pagedLists(): ListaItem[] {
    const start = this.listPageIndex * this.listsPerPage;
    return this.userLists.slice(start, start + this.listsPerPage);
  }

  /**
   * Obtiene el número total de páginas de listas de usuarios.
   * @returns El número total de páginas.
   */
  get listTotalPages(): number {
    return Math.max(1, Math.ceil(this.userLists.length / this.listsPerPage));
  }

  /**
   * Obtiene la página actual de listas de usuarios en formato de cadena.
   * @returns La página actual como una cadena con dos dígitos.
   */
  get currentListPageDisplay(): string {
    return (this.listPageIndex + 1).toString().padStart(2, '0');
  }

  /**
   * Obtiene el número total de páginas de listas de usuarios en formato de cadena.
   * @returns El número total de páginas como una cadena con dos dígitos.
   */
  get listTotalPagesDisplay(): string {
    return this.listTotalPages.toString().padStart(2, '0');
  }

  /**
   * Navega a la página siguiente de listas de usuarios, si existe. Incrementa 
   * el índice de página actual si no se ha alcanzado la última página.
    * @returns void
   */
  listPageNext(): void {
    if (this.listPageIndex < this.listTotalPages - 1) this.listPageIndex++;
  }

  /**
   * Navega a la página anterior de listas de usuarios, si existe. Decrementa 
   * el índice de página actual si no se ha alcanzado la primera página.
   * @returns void  
   */
  listPagePrev(): void {
    if (this.listPageIndex > 0) this.listPageIndex--;
  }

  /**
   * Obtiene la URL de la portada de un libro en una lista de usuarios. 
   * @param lista El elemento de lista que contiene el libro del cual se desea 
   * obtener la portada.
   * @param index El índice del libro dentro de la lista.
   * @returns La URL de la portada del libro, o una imagen predeterminada si no 
   * se encuentra una portada específica.
   */
  getListCover(lista: ListaItem, index: number): string {
    const book = lista.libros?.[index];
    if (!book) return '';
    const url = this.bookSearchService.getCoverUrl(book);
    const isDefault = url === 'assets/default-book-cover.svg';
    const apiId: string = (book as any).key || '';
    if (isDefault && apiId.startsWith('custom-')) {
      if (this.customCoverCache.has(apiId)) {
        return this.customCoverCache.get(apiId)!;
      }
      this.customCoverCache.set(apiId, url);
      this.bookSearchService.getBookByApiId(apiId).subscribe((b: any) => {
        if (b?.coverImage) this.customCoverCache.set(apiId, b.coverImage);
      });
    }
    return url;
  }

  /**
   * Obtiene las reseñas paginadas de usuarios.
   * @returns Un arreglo de reseñas correspondientes a la página actual.
   */
  get pagedReviews(): ReviewDto[] {
    const start = this.reviewPageIndex * this.reviewsPerPage;
    return this.allReviews.slice(start, start + this.reviewsPerPage);
  }

  /**
   * Obtiene el número total de páginas de reseñas de usuarios.
   * @returns El número total de páginas.
   */
  get reviewTotalPages(): number {
    return Math.max(1, Math.ceil(this.allReviews.length / this.reviewsPerPage));
  }

  /**
   * Obtiene la página actual de reseñas de usuarios en formato de cadena.
   * @returns La página actual como una cadena con dos dígitos.
   */
  get currentReviewPageDisplay(): string {
    return (this.reviewPageIndex + 1).toString().padStart(2, '0');
  }

  /**
   * Obtiene el número total de páginas de reseñas de usuarios en formato de cadena.
   * @returns El número total de páginas como una cadena con dos dígitos.
   */
  get reviewTotalPagesDisplay(): string {
    return this.reviewTotalPages.toString().padStart(2, '0');
  }

  /**
   * Navega a la página siguiente de reseñas de usuarios, si existe. Incrementa el
   * índice de página actual si no se ha alcanzado la última página.
   * @returns void
   */
  reviewPageNext(): void {
    if (this.reviewPageIndex < this.reviewTotalPages - 1) this.reviewPageIndex++;
  }

  /**
   * Navega a la página anterior de reseñas de usuarios, si existe. Decrementa el
   * índice de página actual si no se ha alcanzado la primera página.
   * @returns void  
   */
  reviewPagePrev(): void {
    if (this.reviewPageIndex > 0) this.reviewPageIndex--;
  }

  /**
   * Maneja el cambio de página para la paginación de listas de usuarios. 
   * Actualiza el índice de página actual basado en la página seleccionada.
   * @param page La página a la que se desea navegar, representada como un 
   * número.
   * @returns void
   */
  onListPageChange(page: number): void {
    this.listPageIndex = Math.max(0, page - 1);
  }

  /**
   * Maneja el cambio de página para la paginación de reseñas de usuarios. 
   * Actualiza el índice de página actual basado en la página seleccionada.
   * @param page La página a la que se desea navegar, representada como un número.
   * @returns void
   */
  onReviewPageChange(page: number): void {
    this.reviewPageIndex = Math.max(0, page - 1);
  }

  /**
   * Obtiene la URL de la portada de un libro en una reseña de usuario.
   * @param review La reseña de la cual se desea obtener la portada del libro 
   * asociado.
   * @returns La URL de la portada del libro, o una imagen predeterminada si 
   * no se encuentra una portada específica.
   */
  getReviewCoverUrl(review: ReviewDto): string {
    if (review.coverUrl) return review.coverUrl;
    const id = review.bookApiId;
    if (!id || id.startsWith('custom-')) return 'assets/default-book-cover.svg';
    const last = id.split('/').pop();
    if (!last) return 'assets/default-book-cover.svg';
    const candidates = [
      `https://covers.openlibrary.org/b/works/${last}-M.jpg`,
      `https://covers.openlibrary.org/b/olid/${last}-M.jpg`,
      `https://covers.openlibrary.org/b/id/${last}-M.jpg`
    ];
    return candidates[0] || 'assets/default-book-cover.svg';
  }

  /**
   * Obtiene la URL del avatar de un usuario que ha escrito una reseña. 
   * Utiliza el servicio de autenticación para obtener el avatar local del 
   * usuario, o devuelve null si no se encuentra un avatar específico.
   * @param username El nombre de usuario del cual se desea obtener el avatar.
   * @returns La URL del avatar del usuario, o null si no se encuentra un 
   * avatar específico.
   */
  getReviewAvatarUrl(username?: string | null): string | null {
    return this.auth.getLocalAvatar(username) || null;
  }

  /**
   * Genera un arreglo de cadenas que representan las estrellas de calificación 
   * para una reseña de usuario, basándose en la calificación numérica de la 
   * reseña y utilizando el servicio de búsqueda de libros.
   * @param rating La calificación numérica de la reseña.
   * @returns Un arreglo de cadenas que representan las estrellas de calificación.
   */
  getReviewStars(rating: number | undefined): string[] {
    return this.bookSearchService.generateRatingArray(rating);
  }
}
