import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, catchError as rxCatchError } from 'rxjs/operators';

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
  searchBooks(query: string, limit: number = 12, offset: number = 0): Observable<OpenLibrarySearchResponse> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    const openLibrary$ = this.http
      .get<any>(`${this.apiUrl}/api/openlibrary/search`, { params })
      .pipe(
        map(response => this.mapBooks(response)),
        rxCatchError(() => of({ numFound: 0, start: 0, docs: [] } as OpenLibrarySearchResponse))
      );

    // Local books are only fetched on page 1 (offset === 0) to avoid duplicates on subsequent pages
    const localSearch$ = offset === 0
      ? this.http
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
            rxCatchError(() => of([] as OpenLibraryBook[]))
          )
      : of([] as OpenLibraryBook[]);

    return forkJoin([openLibrary$, localSearch$]).pipe(
      map(([olResponse, localBooks]) => {
        const localKeys = new Set(localBooks.map(b => b.key));
        const filteredOl = olResponse.docs.filter(b => !localKeys.has(b.key));
        const merged = [...localBooks, ...filteredOl];
        // Use OpenLibrary's real total so all pages are reachable via pagination
        const total = (olResponse.numFound || 0) + (offset === 0 ? localBooks.length : 0);
        return { numFound: total || merged.length, start: offset, docs: merged };
      })
    );
  }

  /**
   * Recupera todos los resultados (OpenLibrary + locales) sin paginar.
   * WARNING: solicita un límite alto a OpenLibrary para traer suficientes resultados
   * y permitir paginación client-side. Ajustar `maxResults` según sea necesario.
   */
  searchAll(query: string, maxResults: number = 1000): Observable<OpenLibraryBook[]> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', maxResults.toString())
      .set('offset', '0');

    const openLibrary$ = this.http
      .get<any>(`${this.apiUrl}/api/openlibrary/search`, { params })
      .pipe(
        map(response => this.mapBooks(response).docs),
        rxCatchError(() => of([] as OpenLibraryBook[]))
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
        rxCatchError(() => of([] as OpenLibraryBook[]))
      );

    return forkJoin([openLibrary$, localSearch$]).pipe(
      map(([olDocs, localBooks]) => {
        const localKeys = new Set(localBooks.map(b => b.key));
        const filteredOl = (olDocs as OpenLibraryBook[]).filter(b => !localKeys.has(b.key));
        return [...localBooks, ...filteredOl];
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
    if (book) {
      this.syncBookGenres(book);
    }
  }

  /**
   * Sincroniza las categorías del libro con la tabla de géneros del backend.
   * Crea únicamente los géneros que todavía no existen (el backend es idempotente).
   */
  private syncBookGenres(book: OpenLibraryBook): void {
    const categories = this.getCategories(book);
    if (categories.length === 0) return;

    this.getGenres().pipe(
      rxCatchError(() => of([] as { id: number; name: string }[]))
    ).subscribe(existing => {
      const existingNames = new Set(existing.map(g => g.name.toLowerCase()));
      const toCreate = categories.filter(c => !existingNames.has(c.toLowerCase()));
      toCreate.forEach(name => {
        this.http.post(`${this.apiUrl}/genres`, { name })
          .pipe(rxCatchError(() => of(null)))
          .subscribe();
      });
    });
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
  searchCurrent(limit: number = 12): void {
    if (!this.currentQuery || !this.currentQuery.trim()) {
      this.setError('Por favor ingresa un término de búsqueda');
      return;
    }
    const page = this.currentPageSubject.value || 1;
    const offset = (page - 1) * limit;
    this.setLoading(true);
    this.setError(null);
    this.setSuccess(null);

    // Paginación server-side: cada página pide sólo `limit` libros a OpenLibrary con el offset correcto
    this.searchBooks(this.currentQuery, limit, offset).subscribe({
      next: (response) => {
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
    genreIds?: number[];
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/books`, bookData);
  }

  /**
   * Obtiene todos los géneros disponibles
   */
  getGenres(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(`${this.apiUrl}/genres`);
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
        if (subjectLower.includes('saga') || subjectLower.includes('series') || subjectLower.includes('trilogy') || subjectLower.includes('cycle')) {
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
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    // Primero usar los géneros guardados en la BD (objetos con id y name)
    if (Array.isArray(book.genres) && book.genres.length > 0) {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const g of book.genres) {
        const name: string = typeof g === 'string' ? g : (g.name || '');
        if (!name) continue;
        const parts = name.split(',').map((p: string) => p.trim()).filter(Boolean);
        for (const part of parts) {
          const key = part.toLowerCase();
          if (!seen.has(key)) { seen.add(key); result.push(capitalize(part)); }
          if (result.length >= 5) break;
        }
        if (result.length >= 5) break;
      }
      if (result.length > 0) return result;
    }
    // Fallback: subjects de OpenLibrary, filtrar identificadores internos
    const raw: any[] = book.subject || book.subjects || book.categories || [];
    if (Array.isArray(raw)) {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const s of raw) {
        if (typeof s !== 'string' || s.includes('=') || /^[A-Za-z_]+:/.test(s)) continue;
        // Split on commas to separate compound values like "Fiction, fantasy, general"
        const parts = s.split(',').map((p: string) => p.trim()).filter(Boolean);
        for (const part of parts) {
          const key = part.toLowerCase();
          if (!seen.has(key)) { seen.add(key); result.push(capitalize(part)); }
          if (result.length >= 5) break;
        }
        if (result.length >= 5) break;
      }
      if (result.length > 0) return result;
    }
    return [];
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
