
import { Component, ChangeDetectorRef, OnInit, OnDestroy, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse, SagaScraped, SagaBookEntry } from '../../../domain/services/book-search.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../domain/services/auth.service';
import { ListasService } from '../../../domain/services/listas.service';
import { ReviewService } from '../../../domain/services/review.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
 * HeaderComponent es el componente principal que maneja la barra de navegación, 
 * la búsqueda de libros, la visualización de resultados y detalles del libro 
 * seleccionado, así como la gestión de listas y reseñas. 
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isMenuOpen = false;
  showUserMenu = false;

  searchQuery: string = '';
  searchResults: OpenLibraryBook[] = [];
  loading: boolean = false;
  error: string | null = null;
  currentPage: number = 1;
  limit: number = 12;
  totalResults: number = 0;
  successMessage: string | null = null;
  selectedBook: OpenLibraryBook | null = null;
  listas: any[] = [];
  avatar: string | null = null;
  isAdmin: boolean = false;
  username: string | null = null;
  isDarkTheme: boolean = document.documentElement.classList.contains('theme-dark');
  private themeObserver?: MutationObserver;

  get customLists(): any[] {
    const user = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
    return (this.listas || []).filter(l => l.owner === user && !this.listasService.isProfileListName(l.nombre));
  }

  selectedList: string = '';
  selectedStatus: string = '';
  userRating: number = 0;
  userReview: string = '';
  reviews: any[] = [];
  currentUserReview: any | null = null;
  reviewSuccess: string | null = null;
  reviewError: string | null = null;
  isMenuRoute: boolean = false;
  @ViewChild('reviewEditor') reviewEditor?: ElementRef<HTMLElement>;

  sagaData: SagaScraped | null = null;
  sagaLoading: boolean = false;
  sagaExpanded: boolean = false;
  sagaNavigationError: string | null = null;
  private navigatingSagaBook: boolean = false;

  constructor(
    private bookSearchService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private router: Router,
    private listasService: ListasService,
    private elementRef: ElementRef,
    private reviewService: ReviewService,
    private confirmService: ConfirmService
  ) { }

  /**
   * Handler para el clic en el botón de usuario. Detiene la propagación 
   * del evento para evitar que el clic cierre el menú inmediatamente y 
   * luego alterna la visibilidad del menú de usuario.
   * @param event El evento de clic que se dispara al hacer clic en el botón de usuario.
   */
  onUserButtonClick(event: Event) {
    event.stopPropagation();
    this.toggleUserMenu();
  }

  /**
   * Handler para clics en el documento. Si el menú de usuario está abierto y el clic ocurre fuera 
   * del componente, cierra el menú de usuario.
   * @param event El evento de clic que se dispara al hacer clic en cualquier parte del documento.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.showUserMenu && !this.elementRef.nativeElement.contains(event.target)) {
      this.showUserMenu = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Getter para la query de búsqueda actual del servicio.
   * @returns La query de búsqueda actual.
   */
  get serviceQuery(): string {
    return this.bookSearchService.getSearchQuery();
  }

  get backButtonLabel(): string {
    const origin = this.bookSearchService.getNavigationOrigin();
    if (origin && origin.type === 'list') {
      return '← Volver a la lista';
    }
    return '← Volver a la búsqueda';
  }

  private subs: Subscription[] = [];
  private updatingStatusOrList = false;

  /**
   * Inicializa el componente, configurando observadores para cambios de tema, autenticación,
   * navegación y estado de búsqueda.
   */
  ngOnInit(): void {
    this.themeObserver = new MutationObserver(() => {
      this.isDarkTheme = document.documentElement.classList.contains('theme-dark');
      this.cdr.markForCheck();
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    this.isAdmin = this.auth.isAdmin();
    this.username = this.auth.getCurrentUsername();
    this.subs.push(this.auth.isAdmin$.subscribe(v => { this.isAdmin = v; this.cdr.markForCheck(); }));
    this.isMenuRoute = this.router.url.startsWith('/menu');
    this.subs.push(this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        const newIsMenu = e.urlAfterRedirects.startsWith('/menu');
        if (!newIsMenu && this.isMenuRoute) {
          this.searchQuery = '';
          this.bookSearchService.setSearchQuery('');
          this.bookSearchService.setSelectedBook(null);
          this.bookSearchService.publishResults(null);
          this.bookSearchService.setCurrentPage(1);
          this.bookSearchService.setError(null);
          this.bookSearchService.setSuccess(null);
        }
        this.isMenuRoute = newIsMenu;
        this.cdr.markForCheck();
      }
    }));
    this.subs.push(this.bookSearchService.loading$.subscribe(v => { this.loading = v; this.cdr.markForCheck(); }));
    this.subs.push(this.bookSearchService.error$.subscribe(e => { this.error = e; }));
    this.subs.push(this.bookSearchService.success$.subscribe(s => { this.successMessage = s; }));
    this.subs.push(this.bookSearchService.response$.subscribe(r => {
      this.searchResults = r?.docs || [];
      this.totalResults = r?.numFound || 0;
      this.cdr.markForCheck();
    }));
    this.subs.push(this.bookSearchService.currentPage$.subscribe(p => this.currentPage = p));
    this.subs.push(this.bookSearchService.selectedBook$.subscribe(b => {
      this.selectedBook = b;
      this.updateSelectedListFromBook(b);
      this.userReview = '';
      this.userRating = 0;
      this.currentUserReview = null;
      this.loadReviewsForSelectedBook();
      this.loadSagaData(b);
      if (b) {
        this.bookSearchService.importBook(b).subscribe({
          next: () => {},
          error: () => {}
        });
      }
    }));
    this.subs.push(this.auth.avatar$.subscribe(a => { this.avatar = a; this.cdr.markForCheck(); }));
    this.subs.push(this.listasService.listas$.subscribe(l => {
      this.listas = l || [];
      if (!this.updatingStatusOrList) {
        this.updateSelectedListFromBook(this.selectedBook);
      }
      this.cdr.markForCheck();
    }));
  }

  /**
   * Getter que devuelve un array del tamaño del límite de resultados por página 
   * para mostrar skeleton loaders en la UI mientras se cargan los resultados de 
   * búsqueda.
   * @returns Un array con la longitud igual al límite de resultados por página.
   */
  get skeletonArray(): any[] {
    return Array.from({ length: this.limit });
  }

  /**
   * Alterna la visibilidad del menú de navegación. Si el menú está abierto, lo cierra; 
   * si está cerrado, lo abre.
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Alterna la visibilidad del menú de usuario. Si el menú está abierto, lo cierra; 
   * si está cerrado, lo abre.
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Navega a la ruta especificada. Si la ruta es '/menu', también restablece el estado de búsqueda
   * para limpiar cualquier resultado o libro seleccionado previamente.
   * @param path La ruta a la que se desea navegar.
   */
  navigate(path: string): void {
    console.log('Header navigate called:', path);
    if (path === '/menu') {
      this.selectedBook = null;
      this.bookSearchService.setSelectedBook(null);
      this.bookSearchService.setSearchQuery('');
      this.bookSearchService.publishResults(null);
      this.searchQuery = '';
      this.bookSearchService.setCurrentPage(1);
      this.bookSearchService.setError(null);
      this.bookSearchService.setSuccess(null);
    }
    this.router.navigate([path]);
  }

  /**
   * Navega a la ruta especificada y cierra el menú de usuario. Este método se utiliza para asegurarse
   * de que el menú de usuario se cierre automáticamente después de seleccionar una opción de navegación.
   * @param path La ruta a la que se desea navegar.
   */
  navigateAndClose(path: string): void {
    this.showUserMenu = false;
    this.navigate(path);
  }

  /**
   * Cierra la sesión del usuario, restablece el estado de autenticación y navega a la página de inicio de sesión.
   * También se asegura de cerrar el menú de usuario para una mejor experiencia de usuario.
   */
  logout(): void {
    this.showUserMenu = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Maneja el error de carga del avatar del usuario. Si ocurre un error al cargar el avatar, se restablece el 
   * avatar local a null.
   */
  onAvatarError(): void {
    try { this.auth.setLocalAvatar(null); } catch (e) { /* ignore */ }
  }

  /**
   * Limpia los mensajes de error y éxito después de un retraso de 5 segundos. 
   */
  private clearAlertAfterDelay(): void {
    setTimeout(() => {
      this.error = null;
      this.successMessage = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Limpia los mensajes de error y éxito relacionados con las reseñas después de un retraso de 5 segundos.
   */
  private clearReviewAlertAfterDelay(): void {
    setTimeout(() => {
      this.reviewError = null;
      this.reviewSuccess = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Realiza una búsqueda de libros basada en el término de búsqueda ingresado por el usuario.
   * Si el término de búsqueda está vacío, muestra un mensaje de error.
   */
  search(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un término de búsqueda';
      this.clearAlertAfterDelay();
      return;
    }
    this.bookSearchService.setSearchQuery(this.searchQuery);
    this.bookSearchService.setSelectedBook(null);
    this.bookSearchService.searchCurrent(this.limit);
    this.router.navigate(['/menu']);
  }

  /**
   * Realiza una búsqueda de libros basada en el autor ingresado por el usuario. 
   * Si el término de búsqueda está vacío, muestra un mensaje de error.
   * @returns void
   */
  searchByAuthor(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un autor';
      this.clearAlertAfterDelay();
      return;
    }
    this.bookSearchService.setSearchQuery(this.searchQuery);
    this.bookSearchService.setSelectedBook(null);
    this.bookSearchService.searchByAuthorCurrent(this.limit);
    this.router.navigate(['/menu']);
  }

  /**
   * Importa un libro seleccionado desde los resultados de búsqueda a la base de datos local.
   * @param book El libro que se desea importar, representado como un objeto OpenLibraryBook.
   */
  importBook(book: OpenLibraryBook): void {
    this.loading = true;
    this.error = null;

    this.bookSearchService.importBook(book).subscribe({
      next: (importedBook) => {
        this.successMessage = `"${book.title}" ha sido importado correctamente!`;
        this.loading = false;
        this.cdr.markForCheck();
        this.clearAlertAfterDelay();
      },
      error: (error) => {
        console.error('Error importando libro:', error);
        this.error = 'Error al importar el libro. Intenta nuevamente.';
        this.loading = false;
        this.clearAlertAfterDelay();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Obtiene la URL de la portada de un libro utilizando el servicio BookSearchService.
   * @param book El libro para el cual se desea obtener la URL de la portada.
   * @returns La URL de la portada del libro.
   */
  getCoverUrl(book: OpenLibraryBook): string {
    return this.bookSearchService.getCoverUrl(book);
  }

  /**
   * Obtiene el nombre del primer autor de un libro. Si el libro no tiene autores, devuelve "Autor desconocido".
   * @param book El libro del cual se desea obtener el nombre del primer autor.
   * @returns El nombre del primer autor del libro o "Autor desconocido" si no hay autores disponibles.
   */
  getFirstAuthor(book: OpenLibraryBook): string {
    return book.authorNames && book.authorNames.length > 0 ? book.authorNames[0] : 'Autor desconocido';
  }

  /**
   * Navega a la página anterior de resultados de búsqueda si no se está en la primera página.
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.bookSearchService.setCurrentPage(this.currentPage);
      this.bookSearchService.searchCurrent(this.limit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Navega a la página siguiente de resultados de búsqueda si no se está en la última página.
   */
  nextPage(): void {
    const maxPages = Math.ceil(this.totalResults / this.limit);
    if (this.currentPage < maxPages) {
      this.currentPage++;
      this.bookSearchService.setCurrentPage(this.currentPage);
      this.bookSearchService.searchCurrent(this.limit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Navega a una página específica de resultados de búsqueda. Si la página solicitada es la 
   * misma que la actual, no realiza ninguna acción.
   * @param page El número de página al que se desea navegar.
   * @returns void
   */
  onPageChange(page: number): void {
    if (page === this.currentPage) return;
    this.currentPage = page;
    this.bookSearchService.setCurrentPage(page);
    this.bookSearchService.searchCurrent(this.limit);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Calcula el número total de páginas de resultados de búsqueda basado en el total de resultados 
   * y el límite por página.
   * @returns El número total de páginas de resultados de búsqueda.
   */
  getTotalPages(): number {
    return Math.ceil(this.totalResults / this.limit);
  }

  /**
   * Determina si hay una página siguiente disponible para navegar en los resultados de búsqueda.
   * @returns true si hay una página siguiente disponible, false si se está en la última página.
   */
  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  /**
   * Determina si hay una página anterior disponible para navegar en los resultados de búsqueda.
   * @returns true si hay una página anterior disponible, false si se está en la primera página.
   */
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Navega de regreso a la página de búsqueda o a la lista de origen dependiendo de dónde se 
   * accedió al detalle del libro.
   * @returns void
   */
  backToSearch(): void {
    const origin = this.bookSearchService.getNavigationOrigin();
    if (origin) {
      if (origin.type === 'list' && origin.listId) {
        this.bookSearchService.setSelectedBook(null);
        const parentType = (origin as any).parentType;
        const parentListId = (origin as any).parentListId;
        if (parentType) {
          this.bookSearchService.setNavigationOrigin({ type: parentType as any, listId: parentListId });
        } else {
          this.bookSearchService.setNavigationOrigin(null);
        }
        this.router.navigate(['/listas', origin.listId]);
        return;
      }
      if (origin.type === 'profile') {
        this.bookSearchService.setSelectedBook(null);
        this.bookSearchService.setNavigationOrigin(null);
        this.router.navigate(['/perfil']);
        return;
      }
    }
    this.selectedBook = null;
    this.bookSearchService.setSelectedBook(null);
  }

  /**
   * Intenta extraer el nombre de la saga o serie a la que pertenece un libro utilizando múltiples heurísticas,
   * incluyendo el título del libro, la serie a la que pertenece y los sujetos asociados.
   * @param book El libro del cual se desea extraer el nombre de la saga.
   * @returns El nombre de la saga si se encuentra, de lo contrario, null.
   */
  getSagaName(book: any): string | null {
    const title = (book.title || '').toLowerCase();
    if (book.series && Array.isArray(book.series) && book.series.length > 0) {
      for (const s of book.series) {
        if (typeof s === 'string' && !s.includes('=') && /^series:/i.test(s)) {
          const name = s.substring(s.indexOf(':') + 1).trim();
          if (name.length > 0 && name.length < 100) return name;
        }
      }
      const validSeries = book.series.filter((s: string) =>
        typeof s === 'string' && !s.includes('=') && !/^[A-Za-z_]+:/.test(s)
      );
      if (validSeries.length > 0) return validSeries[0];
    }
    if (book.subject && Array.isArray(book.subject)) {
      for (const subject of book.subject) {
        if (typeof subject !== 'string' || subject.includes('=')) continue;
        const subjectLower = subject.toLowerCase();
        if (subjectLower.includes('saga') || subjectLower.includes('series') ||
            subjectLower.includes('trilogy') || subjectLower.includes('cycle')) {
          let sagaName = subject.split('--')[0].trim();
          const prefixMatch = sagaName.match(/^[A-Za-z_]+:(.+)/);
          if (prefixMatch) sagaName = prefixMatch[1].trim();
          if (sagaName.length > 0 && sagaName.length < 100) return sagaName;
        }
      }
    }
    const patterns = [
      /\(([^#\)]*?)\s+#\d+\)/i,
      /\(Saga:\s*([^)]*)\)/i,
      /\(([^)]*)\s+Series\)/i,
      /\(Book\s+\d+(?:\s+of\s+|:)?\s*([^)]*)\)/i
    ];
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        const sagaName = match[1].trim();
        if (sagaName.length > 0 && sagaName.length < 100) {
          return sagaName.charAt(0).toUpperCase() + sagaName.slice(1);
        }
      }
    }
    return null;
  }

  /**
   * Determina si un libro pertenece a una saga o serie utilizando la función getSagaName. 
   * Si getSagaName devuelve un nombre de saga válido, entonces el libro se considera parte 
   * de una saga.
   * @param book El libro que se desea verificar.
   * @returns true si el libro pertenece a una saga, false en caso contrario.
   */
  isSaga(book: OpenLibraryBook): boolean {
    return this.getSagaName(book) !== null;
  }

  /**
   * Carga información adicional sobre la saga o serie a la que pertenece un libro.  
   * @param book El libro del cual se desea cargar información de la saga.
   * @returns void
   */
  private loadSagaData(book: OpenLibraryBook | null): void {
    if (this.navigatingSagaBook) return;
    this.sagaData = null;
    this.sagaLoading = false;
    this.sagaExpanded = false;
    if (!book) return;

    this.sagaLoading = true;
    const author = this.bookSearchService.getFirstAuthor(book);
    this.bookSearchService.scrapeSaga(book.title, author !== 'Autor desconocido' ? author : undefined).subscribe({
      next: (data) => {
        this.sagaData = data;
        this.sagaLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.sagaLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Obtiene el número de ediciones disponibles para un libro. 
   * @param book El libro del cual se desea obtener el número de ediciones.
   * @returns El número de ediciones disponibles para el libro como una cadena. 
   * Si no se encuentra información de ediciones, devuelve '0'.
   */
  getEditionCount(book: OpenLibraryBook): string {
    return book.editionCount?.toString() || book.edition_count?.toString() || '0';
  }

  /**
   * Obtiene las categorías de un libro.
   * @param book El libro del cual se desea obtener las categorías.
   * @returns Un arreglo de cadenas que representan las categorías del libro.
   */
  getCategories(book: any): string[] {
    return this.bookSearchService.getCategories(book);
  }

  /**
   * Genera un arreglo de cadenas que representan el estado de las estrellas (completa, media o vacía)
   * @param rating El número de estrellas que se desea convertir en un arreglo de estados de estrellas.
   * @returns Un arreglo de cadenas que representan el estado de cada estrella ('full', 'half' o 'empty').
   */
  generateRatingArray(rating: number | undefined): string[] {
    const stars: string[] = [];
    const ratingValue = rating || 0;
    for (let i = 0; i < 5; i++) {
      if (i < Math.floor(ratingValue)) {
        stars.push('full');
      } else if (i === Math.floor(ratingValue) && ratingValue % 1 !== 0) {
        stars.push('half');
      } else {
        stars.push('empty');
      }
    }
    return stars;
  }

  /**
   * Agrega el libro seleccionado a la lista personalizada seleccionada o al estado de perfil seleccionado.
   * @returns void
   */
  addToList(): void {
    if (!this.selectedBook) return;

    const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
    this.updatingStatusOrList = true;
    this.listasService.ensureProfileSections(currentUser);

    let addedToCustom = false;
    let addedToStatus = false;

    if (this.selectedList) {
      this.listasService.addBookToList(this.selectedList, this.selectedBook);
      addedToCustom = true;
    }

    const status = (this.selectedStatus || '').toString().trim();
    const profileNames = ['Leyendo', 'Leído', 'Plan para leer'];
    if (status && profileNames.includes(status)) {
      const profileList = this.listasService.getAll().find(l => l.owner === currentUser && l.nombre === status);
      if (profileList) {
        this.listasService.addBookToList(profileList.id, this.selectedBook);
        const otherProfileNames = profileNames.filter(n => n !== status);
        for (const otherName of otherProfileNames) {
          const otherList = this.listasService.getAll().find(l => l.owner === currentUser && l.nombre === otherName);
          if (otherList) {
            this.listasService.removeBookFromList(otherList.id, this.selectedBook);
          }
        }
        addedToStatus = true;
        this.selectedStatus = status;
      }
    }

    if (!addedToCustom && !addedToStatus) {
      this.error = 'Selecciona una lista o un estado para guardar el libro';
      this.updatingStatusOrList = false;
      this.clearAlertAfterDelay();
      return;
    }

    if (addedToCustom) {
      const list = this.listasService.getById(this.selectedList || '');
      const name = list?.nombre || '';
      this.successMessage = name ? `Libro añadido a la lista "${name}" correctamente` : 'Libro añadido a la lista correctamente';
    } else if (addedToStatus) {
      this.successMessage = 'Estado añadido';
    }

    console.debug('[Header] addToList result:', { addedToCustom, addedToStatus, selectedList: this.selectedList, selectedStatus: this.selectedStatus, currentUser });
    console.debug('[Header] listas after add:', this.listasService.getAll());
    this.updateSelectedListFromBook(this.selectedBook);
    this.updatingStatusOrList = false;
    this.clearAlertAfterDelay();
  }

  /**
   * Agrega el libro seleccionado a la lista personalizada o estado de perfil seleccionado. 
   */
  addStatus(): void {
    this.addToList();
  }

  /**
   * Actualiza las variables `selectedList` y `selectedStatus` basándose en la presencia del 
   * libro dado en las listas del usuario.
   * @param book El libro para el cual se desea actualizar la lista y el estado seleccionados. 
   * Si es null, se limpian las selecciones.
   * @returns void
   */
  private updateSelectedListFromBook(book: OpenLibraryBook | null): void {
    if (!book) {
      this.selectedList = '';
      this.selectedStatus = '';
      return;
    }
    const listas = this.listasService.getAll();
    const matches = listas.filter(l => Array.isArray(l.libros) && l.libros.some((b: any) => {
      try {
        return (b as any).key && (book as any).key ? (b as any).key === (book as any).key : (b as any).title === book.title;
      } catch {
        return false;
      }
    }));
    if (matches.length > 0) {
      const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
      const customMatch = matches.find(m => !this.listasService.isProfileListName(m.nombre) && m.owner === currentUser);
      if (customMatch) {
        this.selectedList = customMatch.id;
      } else {
        this.selectedList = matches[0].id;
      }
    } else {
      this.selectedList = '';
    }
    const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
    const profileNames = ['Leyendo', 'Leído', 'Plan para leer'];
    let foundStatus = '';
    for (const name of profileNames) {
      const pl = listas.find(l => l.owner === currentUser && l.nombre === name);
      if (pl && Array.isArray(pl.libros) && pl.libros.some((b: any) => {
        try { return (b as any).key && (book as any).key ? (b as any).key === (book as any).key : (b as any).title === book.title; } catch { return false; }
      })) {
        foundStatus = name;
        break;
      }
    }
    this.selectedStatus = foundStatus;
    this.cdr.markForCheck();
  }

  /**
   * Agrega un libro a una lista personalizada o estado de perfil directamente desde la tarjeta 
   * de resultados de búsqueda, sin necesidad de ir al detalle del libro.
   * @param book El libro que se desea agregar.
   * @param listId El ID de la lista a la que se desea agregar el libro.
   * @returns void
   */
  addBookFromCard(book: OpenLibraryBook, listId: string) {
    if (!listId) { this.error = 'Selecciona una lista'; this.clearAlertAfterDelay(); return; }

    const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
    this.updatingStatusOrList = true;
    this.listasService.ensureProfileSections(currentUser);

    const listasAll = this.listasService.getAll();
    const target = listasAll.find(l => l.id === listId);
    let addedToStatus = false;
    let addedToCustom = false;

    if (target) {
      if (target.owner === currentUser && this.listasService.isProfileListName(target.nombre)) {
        this.listasService.addBookToList(target.id, book);
        const profileNames = ['Leyendo', 'Leído', 'Plan para leer'];
        const otherProfileNames = profileNames.filter(n => n !== target.nombre);
        for (const otherName of otherProfileNames) {
          const other = listasAll.find(l => l.owner === currentUser && l.nombre === otherName);
          if (other) this.listasService.removeBookFromList(other.id, book);
        }
        addedToStatus = true;
        this.selectedStatus = target.nombre;
      } else {
        this.listasService.addBookToList(listId, book);
        addedToCustom = true;
      }
    }

    if (addedToStatus) {
      this.successMessage = 'Estado añadido';
    } else if (addedToCustom) {
      const list = this.listasService.getById(listId);
      const name = list?.nombre || '';
      this.successMessage = name ? `Libro añadido a la lista "${name}" correctamente` : 'Libro añadido correctamente';
    }

    this.updateSelectedListFromBook(book);
    this.updatingStatusOrList = false;
    this.clearAlertAfterDelay();
  }

  /**
   * Limpia las suscripciones y el observador de cambios de tema para evitar fugas de memoria cuando el componente se destruye.
    * @returns void
   */
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.themeObserver?.disconnect();
  }
  
  /**
   * Handler para el evento de entrada en el editor de reseñas. 
   * @param el El elemento HTML del editor de reseñas. Si es null o indefinido, 
   * se restablece la reseña del usuario a una cadena vacía.
   * @returns void
   */
  onReviewEditorInput(el: HTMLElement | null | undefined): void {
    try {
      if (!el) {
        this.userReview = '';
      } else {
        this.userReview = (el as HTMLElement).innerText || '';
      }
    } catch (e) {
      this.userReview = '';
    }
  }
  private loadReviewsForSelectedBook(): void {
    this.reviews = [];
    this.currentUserReview = null;
    if (!this.selectedBook || !this.selectedBook.key) return;
    this.reviewService.getByBookApiId(this.selectedBook.key).subscribe({
      next: (res) => {
        const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
        this.reviews = (res || []).sort((a, b) => {
          const aIsMe = a.username === currentUser ? 1 : 0;
          const bIsMe = b.username === currentUser ? 1 : 0;
          if (aIsMe !== bIsMe) return bIsMe - aIsMe;
          return (b.date || '').localeCompare(a.date || '');
        });
        this.currentUserReview = this.reviews.find(r => r.username === currentUser) || null;
        if (this.currentUserReview) {
          this.userReview = this.currentUserReview.comment || '';
          try { if (this.reviewEditor && this.reviewEditor.nativeElement) this.reviewEditor.nativeElement.innerText = this.userReview; } catch {}
          this.userRating = this.currentUserReview.rating || 0;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando reseñas:', err);
      }
    });
  }

  /**
   * Navega al libro principal de una saga o serie. Realiza una búsqueda utilizando 
   * el título del libro de la saga y selecciona el primer resultado encontrado.
   * Si no se encuentra ningún libro o si ocurre un error durante la búsqueda, muestra 
   * un mensaje de error temporal y vuelve a seleccionar el libro anterior.
   * @param sagaBook El libro de la saga o serie que se desea abrir.
   * @returns void
   */
  openSagaBook(sagaBook: SagaBookEntry): void {
    if (!sagaBook.title) return;
    const previousBook = this.selectedBook;
    this.navigatingSagaBook = true;
    this.sagaLoading = true;
    this.sagaNavigationError = null;
    this.sagaData = null;
    this.selectedBook = null;
    this.bookSearchService.setSelectedBook(null);
    this.cdr.markForCheck();

    this.bookSearchService.searchBooks(sagaBook.title, 1).subscribe({
      next: (response) => {
        this.navigatingSagaBook = false;
        if (response.docs && response.docs.length > 0) {
          this.sagaLoading = false;
          this.selectBook(response.docs[0]);
        } else {
          this.sagaNavigationError = 'No se encontró el libro "' + sagaBook.title + '"';
          this.cdr.markForCheck();
          setTimeout(() => {
            this.sagaNavigationError = null;
            this.sagaLoading = false;
            if (previousBook) {
              this.selectBook(previousBook);
            }
            this.cdr.markForCheck();
          }, 2000);
        }
      },
      error: () => {
        this.navigatingSagaBook = false;
        this.sagaNavigationError = 'Error al buscar el libro';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.sagaNavigationError = null;
          this.sagaLoading = false;
          if (previousBook) {
            this.selectBook(previousBook);
          }
          this.cdr.markForCheck();
        }, 2000);
      }
    });
  }

  /**
   * Selecciona un libro para mostrar su detalle. Establece el libro seleccionado 
   * en el servicio de búsqueda de libros,
   * restablece la reseña y calificación del usuario, y desplaza la página hacia 
   * arriba para mostrar el detalle del libro.
   * @param book El libro que se desea seleccionar.
   */
  selectBook(book: OpenLibraryBook): void {
    this.selectedBook = book;
    this.userRating = 0;
    this.userReview = '';
    try { if (this.reviewEditor && this.reviewEditor.nativeElement) this.reviewEditor.nativeElement.innerText = ''; } catch {}
    this.bookSearchService.setNavigationOrigin({ type: 'search' });
    this.bookSearchService.setSelectedBook(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Publica o actualiza la reseña del usuario para el libro seleccionado.
   * @returns void
   */
  submitReview(): void {
    if (!this.selectedBook || !this.selectedBook.key) {
      this.error = 'No hay libro seleccionado';
      this.clearAlertAfterDelay();
      return;
    }
    let rating = Number(this.userRating) || 0;
    if (rating < 0) rating = 0;
    if (rating > 5) rating = 5;
    rating = Math.round(rating * 10) / 10;

    const payload: any = {
      comment: this.userReview || '',
      rating: rating,
      date: new Date().toISOString(),
      bookApiId: this.selectedBook.key,
      bookTitle: this.selectedBook.title || '',
      coverUrl: this.bookSearchService.getCoverUrl(this.selectedBook),
      username: this.auth.getCurrentUsername() || this.listasService.getCurrentUser()
    };

    if (this.currentUserReview && this.currentUserReview.id) {
      this.reviewService.update(this.currentUserReview.id, payload).subscribe({
        next: (updated) => {
          const idx = this.reviews.findIndex(r => r.id === updated.id);
          if (idx >= 0) this.reviews[idx] = updated;
          this.currentUserReview = updated;
          this.reviewSuccess = 'Reseña actualizada';
          this.clearReviewAlertAfterDelay();
          this.reviewService.refreshAll();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error actualizando reseña:', err);
          this.reviewError = 'Error al actualizar la reseña';
          this.clearReviewAlertAfterDelay();
        }
      });
    } else {
      this.reviewService.create(payload).subscribe({
        next: (created) => {
          this.reviews.unshift(created);
          this.currentUserReview = created;
          this.reviewSuccess = 'Reseña publicada';
          this.clearReviewAlertAfterDelay();
          this.reviewService.refreshAll();
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error creando reseña:', err);
          this.reviewError = 'Error al publicar la reseña';
          this.clearReviewAlertAfterDelay();
          
        }
      });
    }
  }

  /**
   * Elimina la reseña del usuario para el libro seleccionado. Solicita confirmación 
   * antes de eliminar y, si se confirma, elimina la reseña utilizando el servicio de 
   * reseñas. 
   * @returns void
   */
  async deleteReview(): Promise<void> {
    if (!this.currentUserReview || !this.currentUserReview.id) return;
    const ok = await this.confirmService.confirm('¿Estás seguro de eliminar tu reseña?');
    if (!ok) return;
    this.reviewService.delete(this.currentUserReview.id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r.id !== this.currentUserReview.id);
        this.currentUserReview = null;
        this.userReview = '';
        this.userRating = 0;
        try { if (this.reviewEditor?.nativeElement) this.reviewEditor.nativeElement.innerText = ''; } catch {}
        this.reviewSuccess = 'Reseña eliminada';
        this.clearReviewAlertAfterDelay();
        this.reviewService.refreshAll();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error eliminando reseña:', err);
        this.reviewError = 'Error al eliminar la reseña';
        this.clearReviewAlertAfterDelay();
        
      }
    });
  }

  /**
   * Elimina una reseña específica por su ID. Solicita confirmación antes de eliminar 
   * y, si se confirma, elimina la reseña utilizando el servicio de reseñas.
   * @param id 
   * @returns void
   */
  async deleteReviewById(id: number | undefined): Promise<void> {
    if (!id) return;
    const ok = await this.confirmService.confirm('¿Estás seguro de eliminar esta reseña?');
    if (!ok) return;
    this.reviewService.delete(id).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r.id !== id);
        if (this.currentUserReview && this.currentUserReview.id === id) {
          this.currentUserReview = null;
          this.userReview = '';
          this.userRating = 0;
          try { if (this.reviewEditor?.nativeElement) this.reviewEditor.nativeElement.innerText = ''; } catch {}
        }
        this.reviewSuccess = 'Reseña eliminada';
        this.clearReviewAlertAfterDelay();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error eliminando reseña:', err);
        this.reviewError = 'Error al eliminar la reseña';
        this.clearReviewAlertAfterDelay();
        
      }
    });
  }
}
