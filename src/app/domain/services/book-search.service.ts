import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

/**
 * Interfaz para los libros de Open Library
 */
export interface OpenLibraryBook {
  key: string;
  title: string;
  authorNames: string[];
  author_name?: string[];
  firstPublishYear?: number;
  first_publish_year?: number;
  coverId?: number;
  cover_i?: number;
  editionCount?: number;
  edition_count?: number;
  internetArchiveIds?: string[];
  ia?: string[];
  hasFulltext?: boolean;
  has_fulltext?: boolean;
  coverUrl?: string;
  description?: string;
  ratingsAverage?: number;
  ratings_average?: number;
  series?: string[];
  subject?: string[];
  subjects?: string[];
  categories?: string[];
}

/**
 * Interfaz para la respuesta de búsqueda
 */
export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  docs: OpenLibraryBook[];
}

/**
 * Servicio para interactuar con la API de Open Library integrada en el backend
 */
@Injectable({
  providedIn: 'root'
})
export class BookSearchService {
  private apiUrl = 'http://localhost:8080'; // Cambiar según tu configuración

  // Estado compartido para que Header publique resultados y Menu los consuma
  private responseSubject = new BehaviorSubject<OpenLibrarySearchResponse | null>(null);
  response$ = this.responseSubject.asObservable();

  private selectedBookSubject = new BehaviorSubject<OpenLibraryBook | null>(null);
  selectedBook$ = this.selectedBookSubject.asObservable();
  // navigation origin: tells where the detail was opened from (search or list)
  private originSubject = new BehaviorSubject<{ type: 'search' | 'list' | 'other' | 'profile'; listId?: string } | null>(null);
  origin$ = this.originSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  private successSubject = new BehaviorSubject<string | null>(null);
  success$ = this.successSubject.asObservable();

  private currentPageSubject = new BehaviorSubject<number>(1);
  currentPage$ = this.currentPageSubject.asObservable();
  private currentQuery: string = '';

  constructor(private http: HttpClient) { }

  /**
   * Mapea la respuesta del backend al formato esperado
   */
  private mapBooks(response: any): OpenLibrarySearchResponse {
    console.log('Response recibida:', response);
    if (!response || !response.docs || !Array.isArray(response.docs)) {
      console.warn('Respuesta de búsqueda inesperada, devolviendo vacío:', response);
      return { numFound: 0, start: 0, docs: [] };
    }
    const mappedDocs = response.docs.map((book: any) => ({
      ...book,
      authorNames: book.author_name || book.authorNames || [],
      firstPublishYear: book.first_publish_year || book.firstPublishYear,
      coverId: book.cover_i || book.coverId,
      editionCount: book.edition_count || book.editionCount,
      internetArchiveIds: book.ia || book.internetArchiveIds,
      hasFulltext: book.has_fulltext !== undefined ? book.has_fulltext : book.hasFulltext,
      ratingsAverage: book.ratings_average || book.ratingsAverage,
      description: book.description
    }));
    
    console.log('Mapped docs:', mappedDocs);

    return {
      numFound: response.numFound,
      start: response.start,
      docs: mappedDocs
    };
  }

  /**
   * Búsqueda general de libros
   * @param query Término de búsqueda
   * @param limit Número de resultados (default: 10)
   * @param offset Para paginación
   */
  searchBooks(query: string, limit: number = 10, offset: number = 0): Observable<OpenLibrarySearchResponse> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    const openLibrary$ = this.http
      .get<any>(`${this.apiUrl}/api/openlibrary/search`, { params })
      .pipe(
        map(response => this.mapBooks(response)),
        catchError(() => of({ numFound: 0, start: 0, docs: [] } as OpenLibrarySearchResponse))
      );

    const localSearch$ = this.http
      .get<any[]>(`${this.apiUrl}/books/search`, { params: new HttpParams().set('q', query) })
      .pipe(
        map(books => books.map(b => ({
          key: b.apiId,
          title: b.title,
          authorNames: b.author ? [b.author] : [],
          firstPublishYear: b.releaseYear,
          coverUrl: b.coverImage,
          description: b.description,
          ratingsAverage: b.score
        } as OpenLibraryBook))),
        catchError(() => of([] as OpenLibraryBook[]))
      );

    return forkJoin([openLibrary$, localSearch$]).pipe(
      map(([olResponse, localBooks]) => {
        const localKeys = new Set(localBooks.map(b => b.key));
        const filteredOl = olResponse.docs.filter(b => !localKeys.has(b.key));
        const merged = [...localBooks, ...filteredOl];
        return { numFound: merged.length, start: 0, docs: merged };
      })
    );
  }

  /**
   * Publica los resultados en el observable compartido
   */
  publishResults(response: OpenLibrarySearchResponse | null): void {
    this.responseSubject.next(response);
  }

  setSelectedBook(book: OpenLibraryBook | null): void {
    this.selectedBookSubject.next(book);
  }

  setNavigationOrigin(origin: { type: 'search' | 'list' | 'other' | 'profile'; listId?: string } | null): void {
    this.originSubject.next(origin);
  }

  getNavigationOrigin(): { type: 'search' | 'list' | 'other' | 'profile'; listId?: string } | null {
    return this.originSubject.value;
  }

  setLoading(flag: boolean): void {
    this.loadingSubject.next(flag);
  }

  setError(msg: string | null): void {
    this.errorSubject.next(msg);
  }

  setSuccess(msg: string | null): void {
    this.successSubject.next(msg);
  }

  setCurrentPage(page: number): void {
    this.currentPageSubject.next(page);
  }

  setSearchQuery(query: string): void {
    this.currentQuery = query;
    this.setCurrentPage(1);
  }

  /**
   * Devuelve la query de búsqueda actual
   */
  getSearchQuery(): string {
    return this.currentQuery;
  }

  /**
   * Ejecuta la búsqueda usando la query y la página actuales y publica los resultados
   */
  searchCurrent(limit: number = 10): void {
    if (!this.currentQuery || !this.currentQuery.trim()) {
      this.setError('Por favor ingresa un término de búsqueda');
      return;
    }
    const page = this.currentPageSubject.value || 1;
    const offset = (page - 1) * limit;
    this.setLoading(true);
    this.setError(null);
    this.setSuccess(null);

    this.searchBooks(this.currentQuery, limit, offset).subscribe({
      next: (response) => {
        console.log('searchCurrent response for query:', this.currentQuery, response);
        this.publishResults(response);
        this.setLoading(false);
        if (!response.docs || response.docs.length === 0) {
          this.setError('No se encontraron libros. Intenta con otra búsqueda.');
        }
      },
      error: (err) => {
        console.error('Error buscando libros (service):', err);
        const status = err?.status;
        const statusText = err?.statusText || err?.message || '';
        if (status === 401) {
          this.setError('Debes iniciar sesión para buscar libros.');
        } else {
          this.setError(`Error al buscar libros. ${status ? 'Código: ' + status + '. ' : ''}${statusText}`);
        }
        this.setLoading(false);
      }
    });
  }

  searchByAuthorCurrent(limit: number = 10): void {
    if (!this.currentQuery || !this.currentQuery.trim()) {
      this.setError('Por favor ingresa un autor');
      return;
    }
    this.setLoading(true);
    this.setError(null);
    this.setSuccess(null);

    this.searchByAuthor(this.currentQuery, limit).subscribe({
      next: (response) => {
        this.publishResults(response);
        this.setLoading(false);
        if (!response.docs || response.docs.length === 0) {
          this.setError('No se encontraron libros de este autor.');
        }
      },
      error: (err) => {
        console.error('Error buscando por autor (service):', err);
        this.setError('Error al buscar. Por favor intenta más tarde.');
        this.setLoading(false);
      }
    });
  }

  /**
   * Búsqueda por título específico
   * @param title Título del libro
   * @param limit Número de resultados
   */
  searchByTitle(title: string, limit: number = 10, offset: number = 0): Observable<OpenLibrarySearchResponse> {
    let params = new HttpParams()
      .set('title', title)
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<any>(`${this.apiUrl}/api/openlibrary/search/title`, { params })
      .pipe(map(response => this.mapBooks(response)));
  }

  /**
   * Búsqueda por autor
   * @param author Nombre del autor
   * @param limit Número de resultados
   */
  searchByAuthor(author: string, limit: number = 10, offset: number = 0): Observable<OpenLibrarySearchResponse> {
    let params = new HttpParams()
      .set('author', author)
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<any>(`${this.apiUrl}/api/openlibrary/search/author`, { params })
      .pipe(map(response => this.mapBooks(response)));
  }

  /**
   * Importa un libro desde Open Library a la base de datos
   * @param book Objeto OpenLibraryBook
   */
  importBook(book: OpenLibraryBook): Observable<any> {
    return this.http.post(`${this.apiUrl}/books/import/openlibrary`, book);
  }

  /**
   * Crea un nuevo libro en la base de datos (solo admin)
   * @param book Objeto con los datos del libro a crear
   */
  createBook(bookData: {
    title: string;
    author: string;
    description?: string;
    coverImage?: string;
    releaseYear?: number;
    score?: number;
    source?: string;
    userId?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/books`, bookData);
  }

  /**
   * Obtiene URL de portada de Open Library
   * @param book El libro
   */
  getCoverUrl(book: OpenLibraryBook): string {
    if (book.coverUrl) {
      return book.coverUrl;
    }
    const coverId = book.cover_i || book.coverId;
    if (coverId) {
      return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    }
    return 'assets/default-book-cover.svg'; // Imagen por defecto
  }

  getFirstAuthor(book: OpenLibraryBook): string {
    return book.authorNames && book.authorNames.length > 0 ? book.authorNames[0] : 'Autor desconocido';
  }

  getSagaName(book: any): string | null {
    const title = (book.title || '').toLowerCase();
    if (book.series && Array.isArray(book.series) && book.series.length > 0) {
      return book.series[0];
    }
    if (book.subject && Array.isArray(book.subject)) {
      for (const subject of book.subject) {
        const subjectLower = subject.toLowerCase();
        if (subjectLower.includes('saga') || subjectLower.includes('series') || subjectLower.includes('trilogy') || subjectLower.includes('cycle')) {
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
    return this.inferCategories(book);
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
}
