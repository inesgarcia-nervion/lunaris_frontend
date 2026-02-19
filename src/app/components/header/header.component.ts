
import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../services/book-search.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Selectores de detalle
  selectedList: string = 'Ejemplo2';
  selectedStatus: string = 'Leído';
  userRating: number = 0;
  userReview: string = '';
  isMenuRoute: boolean = false;

  constructor(
    private bookSearchService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private router: Router
  ) { }

  // Exponer la query actual del servicio para que la plantilla use
  get serviceQuery(): string {
    return this.bookSearchService.getSearchQuery();
  }

  private subs: Subscription[] = [];

  ngOnInit(): void {
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
    this.subs.push(this.bookSearchService.selectedBook$.subscribe(b => this.selectedBook = b));
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
      this.cdr.markForCheck();
    }
    this.router.navigateByUrl(path);
    this.isMenuOpen = false;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private clearAlertAfterDelay(): void {
    setTimeout(() => {
      this.error = null;
      this.successMessage = null;
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
    }
  }

  nextPage(): void {
    const maxPages = Math.ceil(this.totalResults / this.limit);
    if (this.currentPage < maxPages) {
      this.currentPage++;
      this.bookSearchService.setCurrentPage(this.currentPage);
      this.bookSearchService.searchCurrent(this.limit);
    }
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

  selectBook(book: OpenLibraryBook): void {
    this.selectedBook = book;
    this.userRating = 0;
    this.userReview = '';
    this.bookSearchService.setSelectedBook(book);
  }

  backToSearch(): void {
    this.selectedBook = null;
    this.bookSearchService.setSelectedBook(null);
  }

  getSagaName(book: any): string | null {
    const sagaKeywords = ['saga', 'serie', 'trilogy', 'duology', 'cycle', 'series'];
    const title = (book.title || '').toLowerCase();
    if (book.series && Array.isArray(book.series) && book.series.length > 0) {
      return book.series[0];
    }
    if (book.subject && Array.isArray(book.subject)) {
      for (const subject of book.subject) {
        const subjectLower = subject.toLowerCase();
        if (subjectLower.includes('saga') || subjectLower.includes('series') || 
            subjectLower.includes('trilogy') || subjectLower.includes('cycle')) {
          const sagaName = subject.split('--')[0].trim();
          if (sagaName.length > 0 && sagaName.length < 100) {
            return sagaName;
          }
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
    const categories = book.subject || book.subjects || book.categories || [];
    if (Array.isArray(categories) && categories.length > 0) {
      return categories.slice(0, 5);
    }
    const defaultCategories = this.inferCategories(book);
    return defaultCategories;
  }

  private inferCategories(book: any): string[] {
    const categories: string[] = [];
    const titleAndDesc = ((book.title || '') + (book.description || '')).toLowerCase();
    const categoryKeywords: { [key: string]: string[] } = {
      'Ficción': ['fiction', 'novela', 'novel'],
      'Fantasía': ['fantasy', 'fantasia', 'magic', 'mágic'],
      'Ciencia Ficción': ['science fiction', 'sci-fi', 'future'],
      'Romance': ['romance', 'love', 'amour'],
      'Misterio': ['mystery', 'detective', 'misterio'],
      'Thriller': ['thriller', 'suspense', 'suspenseful'],
      'Aventura': ['adventure', 'aventura', 'quest'],
      'Histórico': ['historical', 'histórico', 'history']
    };
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => titleAndDesc.includes(keyword))) {
        categories.push(category);
      }
    }
    return categories.length > 0 ? categories : ['Ficción'];
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
    this.successMessage = `Libro añadido a la lista "${this.selectedList}"`;
    this.clearAlertAfterDelay();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  submitReview(): void {
    if (this.userReview.trim()) {
      this.successMessage = 'Review enviado correctamente';
      this.clearAlertAfterDelay();
    }
  }
}
