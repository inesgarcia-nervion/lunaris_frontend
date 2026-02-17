import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../services/book-search.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  searchQuery: string = '';
  searchResults: OpenLibraryBook[] = [];
  loading: boolean = false;
  error: string | null = null;
  currentPage: number = 1;
  limit: number = 10;
  totalResults: number = 0;
  successMessage: string | null = null;
  isMenuOpen: boolean = false;
  showUserMenu: boolean = false;
  selectedBook: OpenLibraryBook | null = null;
  userRating: number = 0;
  userReview: string = '';
  selectedList: string = 'Ejemplo2';
  selectedStatus: string = 'Leído';

  constructor(
    private bookSearchService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  /**
   * Alterna el menú
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Alterna el menú de usuario
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Navega a una sección
   */
  navigate(path: string): void {
    // Si navega al menú, limpiar la búsqueda para mostrar el estado inicial
    if (path === '/menu') {
      this.searchQuery = '';
      this.searchResults = [];
      this.totalResults = 0;
      this.error = null;
      this.successMessage = null;
      this.currentPage = 1;
    }
    this.router.navigate([path]);
    this.isMenuOpen = false;
  }

  /**
   * Cierra la sesión del usuario y redirige al login
   */
  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Limpia el mensaje de alerta después de 5 segundos
   */
  private clearAlertAfterDelay(): void {
    setTimeout(() => {
      this.error = null;
      this.successMessage = null;
      this.cdr.markForCheck();
    }, 5000);
  }

  /**
   * Realiza la búsqueda de libros
   */
  search(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un término de búsqueda';
      this.clearAlertAfterDelay();
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;
    const offset = (this.currentPage - 1) * this.limit;

    console.log('Iniciando búsqueda con query:', this.searchQuery);
    this.bookSearchService.searchBooks(this.searchQuery, this.limit, offset).subscribe({
      next: (response: OpenLibrarySearchResponse) => {
        console.log('Búsqueda completada, response:', response);
        this.searchResults = response.docs || [];
        this.totalResults = response.numFound || 0;
        console.log('searchResults actualizado:', this.searchResults);
        console.log('loading antes de cambiar:', this.loading);
        this.loading = false;
        console.log('loading después de cambiar:', this.loading);
        this.cdr.markForCheck();

        if (this.searchResults.length === 0) {
          this.error = 'No se encontraron libros. Intenta con otra búsqueda.';
          this.clearAlertAfterDelay();
        }
      },
      error: (error) => {
        console.error('Error buscando libros:', error);
        this.error = 'Error al buscar libros. Por favor intenta más tarde.';
        this.loading = false;
        this.clearAlertAfterDelay();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Búsqueda por autor
   */
  searchByAuthor(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un autor';
      this.clearAlertAfterDelay();
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.bookSearchService.searchByAuthor(this.searchQuery, this.limit).subscribe({
      next: (response: OpenLibrarySearchResponse) => {
        this.searchResults = response.docs || [];
        this.totalResults = response.numFound || 0;
        this.loading = false;
        this.cdr.markForCheck();

        if (this.searchResults.length === 0) {
          this.error = 'No se encontraron libros de este autor.';
          this.clearAlertAfterDelay();
        }
      },
      error: (error) => {
        console.error('Error buscando por autor:', error);
        this.error = 'Error al buscar. Por favor intenta más tarde.';
        this.loading = false;
        this.clearAlertAfterDelay();
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Importa un libro a la base de datos
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
   * Obtiene la URL de portada para un libro
   */
  getCoverUrl(book: OpenLibraryBook): string {
    return this.bookSearchService.getCoverUrl(book);
  }

  /**
   * Obtiene el nombre del primer autor
   */
  getFirstAuthor(book: OpenLibraryBook): string {
    return book.authorNames && book.authorNames.length > 0 ? book.authorNames[0] : 'Autor desconocido';
  }

  /**
   * Va a la página anterior
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.search();
    }
  }

  /**
   * Va a la siguiente página
   */
  nextPage(): void {
    const maxPages = Math.ceil(this.totalResults / this.limit);
    if (this.currentPage < maxPages) {
      this.currentPage++;
      this.search();
    }
  }

  /**
   * Calcula el número de páginas
   */
  getTotalPages(): number {
    return Math.ceil(this.totalResults / this.limit);
  }

  /**
   * Verifica si hay más páginas
   */
  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  /**
   * Verifica si hay página anterior
   */
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Selecciona un libro para ver sus detalles
   */
  selectBook(book: OpenLibraryBook): void {
    this.selectedBook = book;
    this.userRating = 0;
    this.userReview = '';
  }

  /**
   * Vuelve a la vista de búsqueda
   */
  backToSearch(): void {
    this.selectedBook = null;
  }

  /**
   * Detecta si el libro es parte de una saga y retorna el nombre de la saga
   */
  getSagaName(book: any): string | null {
    // Palabras clave para detectar sagas
    const sagaKeywords = ['saga', 'serie', 'trilogy', 'duology', 'cycle', 'series'];
    const title = (book.title || '').toLowerCase();
    
    // 1. Intentar obtener el nombre de la saga desde los datos de la API
    if (book.series && Array.isArray(book.series) && book.series.length > 0) {
      return book.series[0];
    }
    
    // 2. Buscar en subject
    if (book.subject && Array.isArray(book.subject)) {
      for (const subject of book.subject) {
        const subjectLower = subject.toLowerCase();
        // Si el subject contiene palabras de saga, extraerlo
        if (subjectLower.includes('saga') || subjectLower.includes('series') || 
            subjectLower.includes('trilogy') || subjectLower.includes('cycle')) {
          const sagaName = subject.split('--')[0].trim();
          if (sagaName.length > 0 && sagaName.length < 100) {
            return sagaName;
          }
        }
      }
    }
    
    // 3. Buscar en el título patrones como (Mistborn #1) o (Saga: Mistborn)
    const patterns = [
      /\(([^#\)]*?)\s+#\d+\)/i,  // (Mistborn #1)
      /\(Saga:\s*([^)]*)\)/i,     // (Saga: Mistborn)
      /\(([^)]*)\s+Series\)/i,    // (Mistborn Series)
      /\(Book\s+\d+(?:\s+of\s+|:)?\s*([^)]*)\)/i  // (Book 1 of Mistborn) o (Book 1: Name)
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
    
    // Si no hay datos de saga, retornar null
    return null;
  }

  /**
   * Detecta si el libro es parte de una saga (booleano)
   */
  isSaga(book: OpenLibraryBook): boolean {
    return this.getSagaName(book) !== null;
  }

  /**
   * Obtiene el número de ediciones formateado
   */
  getEditionCount(book: OpenLibraryBook): string {
    return book.editionCount?.toString() || book.edition_count?.toString() || '0';
  }

  /**
   * Obtiene las categorías del libro (si están disponibles en la API)
   */
  getCategories(book: any): string[] {
    // Intentar obtener categorías de diferentes campos posibles
    const categories = book.subject || book.subjects || book.categories || [];
    
    // Si hay categorías, retornar las primeras 5
    if (Array.isArray(categories) && categories.length > 0) {
      return categories.slice(0, 5);
    }
    
    // Si no hay categorías en la API, retornar categorías por defecto basadas en palabras clave
    const defaultCategories = this.inferCategories(book);
    return defaultCategories;
  }

  /**
   * Infiere categorías basadas en el contenido del libro
   */
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

  /**
   * Genera estrellas para la calificación (incluyendo medias estrellas)
   * Retorna un array con: 'full', 'half', 'empty'
   */
  generateRatingArray(rating: number | undefined): string[] {
    const stars: string[] = [];
    const ratingValue = rating || 0;
    
    for (let i = 0; i < 5; i++) {
      if (i < Math.floor(ratingValue)) {
        // Estrella llena
        stars.push('full');
      } else if (i === Math.floor(ratingValue) && ratingValue % 1 !== 0) {
        // Media estrella
        stars.push('half');
      } else {
        // Estrella vacía
        stars.push('empty');
      }
    }
    
    return stars;
  }

  /**
   * Añade el libro a una lista
   */
  addToList(): void {
    this.successMessage = `Libro añadido a la lista "${this.selectedList}"`;
    this.clearAlertAfterDelay();
  }

  /**
   * Actualiza el review del usuario
   */
  submitReview(): void {
    if (this.userReview.trim()) {
      this.successMessage = 'Review enviado correctamente';
      this.clearAlertAfterDelay();
    }
  }
}
