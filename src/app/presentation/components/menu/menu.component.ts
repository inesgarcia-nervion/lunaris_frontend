import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../../domain/services/book-search.service';
import { AuthService } from '../../../domain/services/auth.service';
import { PeticionesService, BookRequestDto } from '../../../domain/services/peticiones.service';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { ReviewService, ReviewDto } from '../../../domain/services/review.service';
import { NewsService, NewsItem } from '../../../domain/services/news.service';
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

  // Listas de usuarios
  userLists: ListaItem[] = [];
  listPageIndex: number = 0;
  readonly listsPerPage = 3;

  // Reseñas recientes
  allReviews: ReviewDto[] = [];
  reviewPageIndex: number = 0;
  readonly reviewsPerPage = 3;

  // Noticias recientes (3 últimas)
  latestNews: NewsItem[] = [];

  // Cache de portadas para libros custom (key: apiId, value: coverUrl)
  private customCoverCache = new Map<string, string>();

  // Local UI state for review/list selectors
  userRating: number = 0;
  userReview: string = '';
  selectedList: string = 'Ejemplo2';
  selectedStatus: string = 'Leído';

  private subs: Subscription[] = [];

  constructor(public bookSearchService: BookSearchService, private auth: AuthService, private router: Router, private peticiones: PeticionesService, private listasService: ListasService, private reviewService: ReviewService, private newsService: NewsService, private cdr: ChangeDetectorRef) {
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

    // Listas creadas por usuarios (excluir listas de perfil)
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
      // When returning to hero view, reload reviews to pick up any new ones
      if (!b) this.reviewService.refreshAll();
    }));
    this.subs.push(this.bookSearchService.loading$.subscribe(l => this.loading = l));
    this.subs.push(this.bookSearchService.error$.subscribe(e => this.error = e));
    this.subs.push(this.bookSearchService.success$.subscribe(s => this.successMessage = s));
    this.subs.push(this.bookSearchService.currentPage$.subscribe(p => this.currentPage = p));

    // Noticias recientes (3 últimas)
    this.subs.push(this.newsService.news$.subscribe(items => {
      this.latestNews = items.slice(0, 3);
    }));

    // Reseñas recientes — stay in sync via shared BehaviorSubject
    this.subs.push(this.reviewService.reviews$.subscribe(reviews => {
      this.allReviews = reviews;
      if (this.reviewPageIndex >= this.reviewTotalPages) {
        this.reviewPageIndex = Math.max(0, this.reviewTotalPages - 1);
      }
      // Force change detection so the menu shows latest reviews immediately
      try { this.cdr.detectChanges(); } catch (e) { 

      }
    }));
    this.reviewService.refreshAll();
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

  openListFromMenu(listId: string): void {
    // Mark origin so lista-detalle can return here
    this.bookSearchService.setNavigationOrigin({ type: 'menu' });
    this.router.navigate(['/listas', listId]);
  }

  // ===== Listas de usuarios =====
  get pagedLists(): ListaItem[] {
    const start = this.listPageIndex * this.listsPerPage;
    return this.userLists.slice(start, start + this.listsPerPage);
  }

  get listTotalPages(): number {
    return Math.max(1, Math.ceil(this.userLists.length / this.listsPerPage));
  }

  get currentListPageDisplay(): string {
    return (this.listPageIndex + 1).toString().padStart(2, '0');
  }

  get listTotalPagesDisplay(): string {
    return this.listTotalPages.toString().padStart(2, '0');
  }

  listPageNext(): void {
    if (this.listPageIndex < this.listTotalPages - 1) this.listPageIndex++;
  }

  listPagePrev(): void {
    if (this.listPageIndex > 0) this.listPageIndex--;
  }

  getListCover(lista: ListaItem, index: number): string {
    const book = lista.libros?.[index];
    if (!book) return '';
    const url = this.bookSearchService.getCoverUrl(book);
    // If the book is custom and returns the default SVG, try to fetch the real cover
    const isDefault = url === 'assets/default-book-cover.svg';
    const apiId: string = (book as any).key || '';
    if (isDefault && apiId.startsWith('custom-')) {
      if (this.customCoverCache.has(apiId)) {
        return this.customCoverCache.get(apiId)!;
      }
      // Put a placeholder immediately so we don't spam requests
      this.customCoverCache.set(apiId, url);
      this.bookSearchService.getBookByApiId(apiId).subscribe((b: any) => {
        if (b?.coverImage) this.customCoverCache.set(apiId, b.coverImage);
      });
    }
    return url;
  }

  // ===== Reseñas recientes =====
  get pagedReviews(): ReviewDto[] {
    const start = this.reviewPageIndex * this.reviewsPerPage;
    return this.allReviews.slice(start, start + this.reviewsPerPage);
  }

  get reviewTotalPages(): number {
    return Math.max(1, Math.ceil(this.allReviews.length / this.reviewsPerPage));
  }

  get currentReviewPageDisplay(): string {
    return (this.reviewPageIndex + 1).toString().padStart(2, '0');
  }

  get reviewTotalPagesDisplay(): string {
    return this.reviewTotalPages.toString().padStart(2, '0');
  }

  reviewPageNext(): void {
    if (this.reviewPageIndex < this.reviewTotalPages - 1) this.reviewPageIndex++;
  }

  reviewPagePrev(): void {
    if (this.reviewPageIndex > 0) this.reviewPageIndex--;
  }

  getReviewCoverUrl(review: ReviewDto): string {
    if (review.coverUrl) return review.coverUrl;
    // Fallback: derive from bookApiId (support several OpenLibrary patterns)
    const id = review.bookApiId;
    if (!id || id.startsWith('custom-')) return 'assets/default-book-cover.svg';
    const last = id.split('/').pop();
    if (!last) return 'assets/default-book-cover.svg';
    // Try common OpenLibrary cover endpoints: works, books (olid), and cover id
    const candidates = [
      `https://covers.openlibrary.org/b/works/${last}-M.jpg`,
      `https://covers.openlibrary.org/b/olid/${last}-M.jpg`,
      `https://covers.openlibrary.org/b/id/${last}-M.jpg`
    ];
    // Return first candidate; browser will show fallback if 404 — choose the most likely first
    return candidates[0] || 'assets/default-book-cover.svg';
  }

  getReviewAvatarUrl(username?: string | null): string | null {
    return this.auth.getLocalAvatar(username) || null;
  }

  getReviewStars(rating: number | undefined): string[] {
    return this.bookSearchService.generateRatingArray(rating);
  }
}
