import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../../domain/services/book-search.service';
import { AuthService } from '../../../domain/services/auth.service';
import { PeticionesService, BookRequestDto } from '../../../domain/services/peticiones.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
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

  // Local UI state for review/list selectors
  userRating: number = 0;
  userReview: string = '';
  selectedList: string = 'Ejemplo2';
  selectedStatus: string = 'Leído';

  private subs: Subscription[] = [];

  constructor(public bookSearchService: BookSearchService, private auth: AuthService, private router: Router, private peticiones: PeticionesService) {
    this.isAdmin = this.auth.isAdmin();
  }

  ngOnInit(): void {
    // Subscribe to admin status changes
    this.subs.push(this.auth.isAdmin$.subscribe(isAdmin => {
      this.isAdmin = isAdmin;
    }));
    // If already admin or becomes admin, load recent requests to show in menu
    if (this.isAdmin) this.loadAdminRequests();
    this.subs.push(this.auth.isAdmin$.subscribe(isAdmin => { if (isAdmin) this.loadAdminRequests(); }));
    this.subs.push(this.bookSearchService.response$.subscribe((r: OpenLibrarySearchResponse | null) => {
      this.searchResults = r?.docs || [];
      this.totalResults = r?.numFound || 0;
    }));

    this.subs.push(this.bookSearchService.selectedBook$.subscribe(b => this.selectedBook = b));
    this.subs.push(this.bookSearchService.loading$.subscribe(l => this.loading = l));
    this.subs.push(this.bookSearchService.error$.subscribe(e => this.error = e));
    this.subs.push(this.bookSearchService.success$.subscribe(s => this.successMessage = s));
    this.subs.push(this.bookSearchService.currentPage$.subscribe(p => this.currentPage = p));
  }

  private loadAdminRequests(): void {
    this.peticiones.getAll().subscribe({ next: (r) => { this.adminRequests = r || []; }, error: () => { this.adminRequests = []; } });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.bookSearchService.setCurrentPage(this.currentPage - 1);
      this.bookSearchService.searchCurrent();
    }
  }

  nextPage(): void {
    const maxPages = this.getTotalPages();
    if (this.currentPage < maxPages) {
      this.bookSearchService.setCurrentPage(this.currentPage + 1);
      this.bookSearchService.searchCurrent();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalResults / 12) || 1;
  }

  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  selectBook(book: OpenLibraryBook): void {
    // mark origin as search because selection occurred from search results
    this.bookSearchService.setNavigationOrigin({ type: 'search' });
    this.bookSearchService.setSelectedBook(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToSearch(): void {
    const origin = this.bookSearchService.getNavigationOrigin();
    if (origin && origin.type === 'list' && origin.listId) {
      // navigate back to originating list
      this.bookSearchService.setSelectedBook(null);
      this.bookSearchService.setNavigationOrigin(null);
      this.router.navigate(['/listas', origin.listId]);
      return;
    }
    this.bookSearchService.setSelectedBook(null);
  }

  submitReview(): void {
    if (this.userReview.trim()) {
      this.bookSearchService.setSuccess('Review enviado correctamente');
    }
  }

  addToList(): void {
    this.bookSearchService.setSuccess(`Libro añadido a la lista "${this.selectedList}"`);
  }

  // Wrappers para funciones utilitarias del servicio (mantener plantillas sin cambios)
  getCoverUrl(book: OpenLibraryBook): string {
    return this.bookSearchService.getCoverUrl(book);
  }

  getFirstAuthor(book: OpenLibraryBook): string {
    return this.bookSearchService.getFirstAuthor(book);
  }

  getSagaName(book: any): string | null {
    return this.bookSearchService.getSagaName(book);
  }

  isSaga(book: OpenLibraryBook): boolean {
    return this.bookSearchService.isSaga(book);
  }

  getEditionCount(book: OpenLibraryBook): string {
    return this.bookSearchService.getEditionCount(book);
  }

  getCategories(book: any): string[] {
    return this.bookSearchService.getCategories(book);
  }

  generateRatingArray(rating: number | undefined): string[] {
    return this.bookSearchService.generateRatingArray(rating);
  }

  // Exponer la query actual desde el servicio para las plantillas
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

  // Navegación delegada (usada desde la plantilla)
  navigate(path: string): void {
    console.log('Menu navigate called:', path);
    this.router.navigateByUrl(path);
  }
}
