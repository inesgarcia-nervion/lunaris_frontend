
import { Component, ChangeDetectorRef, OnInit, OnDestroy, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../../domain/services/book-search.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../domain/services/auth.service';
import { ListasService } from '../../../domain/services/listas.service';
import { ReviewService } from '../../../domain/services/review.service';
import { ConfirmService } from '../../shared/confirm.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  // Navegación y usuario
  isMenuOpen = false;
  showUserMenu = false;

  // Búsqueda
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

  // Return only the user's custom lists (exclude reserved profile lists)
  get customLists(): any[] {
    const user = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
    return (this.listas || []).filter(l => l.owner === user && !this.listasService.isProfileListName(l.nombre));
  }

  // Selectores de detalle
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

  onUserButtonClick(event: Event) {
    event.stopPropagation();
    this.toggleUserMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.showUserMenu && !this.elementRef.nativeElement.contains(event.target)) {
      this.showUserMenu = false;
      this.cdr.markForCheck();
    }
  }

  // Exponer la query actual del servicio para que la plantilla use
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

  ngOnInit(): void {
    // Track theme changes on <html>
    this.themeObserver = new MutationObserver(() => {
      this.isDarkTheme = document.documentElement.classList.contains('theme-dark');
      this.cdr.markForCheck();
    });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // reflect current admin state immediately
    this.isAdmin = this.auth.isAdmin();
    this.username = this.auth.getCurrentUsername();
    this.subs.push(this.auth.isAdmin$.subscribe(v => { this.isAdmin = v; this.cdr.markForCheck(); }));
    // inicializar estado de ruta
    this.isMenuRoute = this.router.url.startsWith('/menu');
    this.subs.push(this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) {
        const newIsMenu = e.urlAfterRedirects.startsWith('/menu');
        // Si el usuario cambia de pestaña a otra que NO sea /menu, limpiar la búsqueda
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
      // reset user's draft review UI when opening new book
      this.userReview = '';
      this.userRating = 0;
      this.currentUserReview = null;
      // load reviews for the selected book (if any)
      this.loadReviewsForSelectedBook();
    }));
    // subscribe to avatar changes so header shows the current avatar immediately
    this.subs.push(this.auth.avatar$.subscribe(a => { this.avatar = a; this.cdr.markForCheck(); }));
    // listas disponibles para añadir
    this.subs.push(this.listasService.listas$.subscribe(l => {
      this.listas = l || [];
      // Do not auto-select the first list. Keep `selectedList` empty so the placeholder shows
      // If the selected book is already in a list, updateSelectedListFromBook will set it.
      // Avoid overwriting UI state while we're actively adding a book to lists/statuses.
      if (!this.updatingStatusOrList) {
        this.updateSelectedListFromBook(this.selectedBook);
      }
      this.cdr.markForCheck();
    }));
  }

  // Helper to render skeleton placeholders while loading
  get skeletonArray(): any[] {
    return Array.from({ length: this.limit });
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }
  navigate(path: string): void {
    console.log('Header navigate called:', path);
    // If navigating to menu, ensure any open book detail is cleared so Menu shows hero/search correctly
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

  navigateAndClose(path: string): void {
    this.showUserMenu = false;
    this.navigate(path);
  }

  logout(): void {
    this.showUserMenu = false;
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  onAvatarError(): void {
    try { this.auth.setLocalAvatar(null); } catch (e) { /* ignore */ }
  }

  private clearAlertAfterDelay(): void {
    setTimeout(() => {
      this.error = null;
      this.successMessage = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  private clearReviewAlertAfterDelay(): void {
    setTimeout(() => {
      this.reviewError = null;
      this.reviewSuccess = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  search(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un término de búsqueda';
      this.clearAlertAfterDelay();
      return;
    }
    // Delegar la búsqueda al servicio compartido
    this.bookSearchService.setSearchQuery(this.searchQuery);
    this.bookSearchService.setSelectedBook(null);
    this.bookSearchService.searchCurrent(this.limit);
    // Navegar a la vista de resultados (reemplaza la vista actual)
    this.router.navigate(['/menu']);
    // el servicio actualizará los observables a los que estamos suscritos en ngOnInit
  }

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

  getCoverUrl(book: OpenLibraryBook): string {
    return this.bookSearchService.getCoverUrl(book);
  }

  getFirstAuthor(book: OpenLibraryBook): string {
    return book.authorNames && book.authorNames.length > 0 ? book.authorNames[0] : 'Autor desconocido';
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.bookSearchService.setCurrentPage(this.currentPage);
      this.bookSearchService.searchCurrent(this.limit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    const maxPages = Math.ceil(this.totalResults / this.limit);
    if (this.currentPage < maxPages) {
      this.currentPage++;
      this.bookSearchService.setCurrentPage(this.currentPage);
      this.bookSearchService.searchCurrent(this.limit);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onPageChange(page: number): void {
    if (page === this.currentPage) return;
    this.currentPage = page;
    this.bookSearchService.setCurrentPage(page);
    this.bookSearchService.searchCurrent(this.limit);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getTotalPages(): number {
    return Math.ceil(this.totalResults / this.limit);
  }

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }
  backToSearch(): void {
    const origin = this.bookSearchService.getNavigationOrigin();
    if (origin) {
      if (origin.type === 'list' && origin.listId) {
        // clear selection and navigate back to the originating list
        this.bookSearchService.setSelectedBook(null);
        // if the origin has a parent (e.g., came from profile -> list -> book), restore parent as origin
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
        // opened from profile -> return to profile view
        this.bookSearchService.setSelectedBook(null);
        this.bookSearchService.setNavigationOrigin(null);
        this.router.navigate(['/perfil']);
        return;
      }
    }
    this.selectedBook = null;
    this.bookSearchService.setSelectedBook(null);
  }

  getSagaName(book: any): string | null {
    const title = (book.title || '').toLowerCase();
    if (book.series && Array.isArray(book.series) && book.series.length > 0) {
      // Try entries with "series:Name" prefix — strip the prefix
      for (const s of book.series) {
        if (typeof s === 'string' && !s.includes('=') && /^series:/i.test(s)) {
          const name = s.substring(s.indexOf(':') + 1).trim();
          if (name.length > 0 && name.length < 100) return name;
        }
      }
      // Fall back to plain names with no internal identifier pattern
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
          // Strip any "word:" prefix (e.g. "series:", "serie:")
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

  isSaga(book: OpenLibraryBook): boolean {
    return this.getSagaName(book) !== null;
  }

  getEditionCount(book: OpenLibraryBook): string {
    return book.editionCount?.toString() || book.edition_count?.toString() || '0';
  }

  getCategories(book: any): string[] {
    return this.bookSearchService.getCategories(book);
  }

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

  addToList(): void {
    if (!this.selectedBook) return;

    const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
    // Ensure profile lists exist for the user (safe to call)
    this.updatingStatusOrList = true;
    this.listasService.ensureProfileSections(currentUser);

    let addedToCustom = false;
    let addedToStatus = false;

    // If a custom list is selected, add to it
    if (this.selectedList) {
      this.listasService.addBookToList(this.selectedList, this.selectedBook);
      addedToCustom = true;
    }

    // If a status is selected and corresponds to a profile list, add to that special list as well
    const status = (this.selectedStatus || '').toString().trim();
    const profileNames = ['Leyendo', 'Leído', 'Plan para leer'];
    if (status && profileNames.includes(status)) {
      const profileList = this.listasService.getAll().find(l => l.owner === currentUser && l.nombre === status);
      if (profileList) {
        this.listasService.addBookToList(profileList.id, this.selectedBook);
        // Remove the book from other profile lists so a book has only one profile status
        const otherProfileNames = profileNames.filter(n => n !== status);
        for (const otherName of otherProfileNames) {
          const otherList = this.listasService.getAll().find(l => l.owner === currentUser && l.nombre === otherName);
          if (otherList) {
            this.listasService.removeBookFromList(otherList.id, this.selectedBook);
          }
        }
        addedToStatus = true;
        // ensure UI reflects the new status immediately
        this.selectedStatus = status;
      }
    }

    if (!addedToCustom && !addedToStatus) {
      this.error = 'Selecciona una lista o un estado para guardar el libro';
      this.updatingStatusOrList = false;
      this.clearAlertAfterDelay();
      return;
    }

    // Prefer the status-specific message when a status was added
    // Prefer the "lista" message when a custom list was involved (user expects list message)
    if (addedToCustom) {
      // include the list name when available
      const list = this.listasService.getById(this.selectedList || '');
      const name = list?.nombre || '';
      this.successMessage = name ? `Libro añadido a la lista "${name}" correctamente` : 'Libro añadido a la lista correctamente';
    } else if (addedToStatus) {
      this.successMessage = 'Estado añadido';
    }

    // Debug logging to help trace UI update issues
    // eslint-disable-next-line no-console
    console.debug('[Header] addToList result:', { addedToCustom, addedToStatus, selectedList: this.selectedList, selectedStatus: this.selectedStatus, currentUser });
    // eslint-disable-next-line no-console
    console.debug('[Header] listas after add:', this.listasService.getAll());
    // Reflect the updated lists immediately in the UI and keep the selected status
    this.updateSelectedListFromBook(this.selectedBook);
    this.updatingStatusOrList = false;
    this.clearAlertAfterDelay();
  }

  addStatus(): void {
    // Shortcut to add the selected book to the selected status (profile list)
    this.addToList();
  }

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
      // Prefer a custom/user-created list match (not a reserved profile list) so the select shows correctly
      const currentUser = this.auth.getCurrentUsername() || this.listasService.getCurrentUser();
      const customMatch = matches.find(m => !this.listasService.isProfileListName(m.nombre) && m.owner === currentUser);
      if (customMatch) {
        this.selectedList = customMatch.id;
      } else {
        this.selectedList = matches[0].id;
      }
      // Do not clear `successMessage` here: keep any recently-set success message
    } else {
      this.selectedList = '';
    }
    // Also detect if the book is present in one of the reserved profile lists for the current user
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
      // If the target is a profile list for this user, treat it as a status change
      if (target.owner === currentUser && this.listasService.isProfileListName(target.nombre)) {
        // add to target profile list
        this.listasService.addBookToList(target.id, book);
        // remove from other profile lists
        const profileNames = ['Leyendo', 'Leído', 'Plan para leer'];
        const otherProfileNames = profileNames.filter(n => n !== target.nombre);
        for (const otherName of otherProfileNames) {
          const other = listasAll.find(l => l.owner === currentUser && l.nombre === otherName);
          if (other) this.listasService.removeBookFromList(other.id, book);
        }
        addedToStatus = true;
        this.selectedStatus = target.nombre;
      } else {
        // custom list
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

    // Refresh UI state
    this.updateSelectedListFromBook(book);
    this.updatingStatusOrList = false;
    this.clearAlertAfterDelay();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.themeObserver?.disconnect();
  }
  
  // Handler for contenteditable review editor. Receives the element reference from template.
  onReviewEditorInput(el: HTMLElement | null | undefined): void {
    try {
      if (!el) {
        this.userReview = '';
      } else {
        this.userReview = (el as HTMLElement).innerText || '';
      }
    } catch (e) {
      // Fallback: do not throw template errors
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
          // set content into editor element if present without triggering re-render
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

  selectBook(book: OpenLibraryBook): void {
    this.selectedBook = book;
    this.userRating = 0;
    this.userReview = '';
    // ensure editor cleared visually
    try { if (this.reviewEditor && this.reviewEditor.nativeElement) this.reviewEditor.nativeElement.innerText = ''; } catch {}
    // mark as coming from search/header
    this.bookSearchService.setNavigationOrigin({ type: 'search' });
    this.bookSearchService.setSelectedBook(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  submitReview(): void {
    if (!this.selectedBook || !this.selectedBook.key) {
      this.error = 'No hay libro seleccionado';
      this.clearAlertAfterDelay();
      return;
    }
    // rating may be decimal, clamp to 0-5 and round to 1 decimal
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
      // update
      this.reviewService.update(this.currentUserReview.id, payload).subscribe({
        next: (updated) => {
          // replace in list
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
      // create
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
