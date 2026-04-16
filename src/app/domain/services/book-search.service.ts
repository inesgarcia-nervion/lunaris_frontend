import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of, Subscription } from 'rxjs';
import { map, catchError as rxCatchError } from 'rxjs/operators';
import { Router, NavigationStart } from '@angular/router';

/**
 * Interfaz para un libro obtenido de Open Library, adaptada al formato que usamos en la app
 * 
 * Incluye campos comunes de Open Library y también mapea algunos campos alternativos que 
 * podrían venir del backend o de la base de datos local, para facilitar el consumo en los 
 * componentes sin tener que lidiar con múltiples formatos. 
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
 * Interfaz para la respuesta de búsqueda de Open Library, adaptada al formato que usamos en la app
 * 
 * Contiene el número total de resultados encontrados, el índice de inicio (offset) y un array de libros.
 * El array de libros ya está mapeado al formato de OpenLibraryBook para facilitar su consumo en los componentes.
 */
export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  docs: OpenLibraryBook[];
}

/**
 * Interfaz para un libro dentro de una saga scrapeada, con los campos relevantes para mostrar en la UI
 * 
 * Incluye el título, autor, número de orden dentro de la saga (si se pudo inferir), número de páginas, 
 * año de publicación y URL a StoryGraph.
 */
export interface SagaBookEntry {
  title: string;
  author: string;
  orderNumber: string;
  pages: number | null;
  year: number | null;
  storygraphUrl: string | null;
}

/**
 * Interfaz para la información de una saga scrapeada, que incluye el nombre de la saga y un array 
 * de libros pertenecientes a esa saga.
 * 
 * El nombre de la saga se infiere a partir de patrones comunes en los títulos, series o subjects 
 * de Open Library, o directamente desde Goodreads si se scrapea desde allí.
 * El array de libros contiene objetos con la información relevante para mostrar en la UI, como 
 * título, autor, orden dentro de la saga, número de páginas, año y URL a StoryGraph.
 */
export interface SagaScraped {
  sagaName: string;
  books: SagaBookEntry[];
}

/**
 * Servicio para manejar la búsqueda de libros, tanto en Open Library como en la base de datos local.
 * 
 * Este servicio centraliza toda la lógica relacionada con la búsqueda de libros: 
 */
@Injectable({
  providedIn: 'root'
})
export class BookSearchService {
  private apiUrl = 'http://localhost:8080'; 
  private pageCache = new Map<string, OpenLibrarySearchResponse>();

  private responseSubject = new BehaviorSubject<OpenLibrarySearchResponse | null>(null);
  response$ = this.responseSubject.asObservable();

  private selectedBookSubject = new BehaviorSubject<OpenLibraryBook | null>(null);
  selectedBook$ = this.selectedBookSubject.asObservable();
  private originSubject = new BehaviorSubject<{ type: 'search' | 'list' | 'other' | 'profile' | 'menu' | 'listas'; listId?: string } | null>(null);
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

  private cachedGenreNames: Set<string> = new Set();

  private currentSearchSub: Subscription | null = null;
  private prefetchSubs: Subscription[] = [];

  constructor(private http: HttpClient, private router: Router) {
    this.loadGenreCache();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.cancelPendingSearches();
      }
    });
  }

  cancelPendingSearches(): void {
    if (this.currentSearchSub) {
      try { 
        this.currentSearchSub.unsubscribe(); 
      } catch (e) { /* ignore */ }
      this.currentSearchSub = null;
    }
    if (this.prefetchSubs && this.prefetchSubs.length > 0) {
      for (const s of this.prefetchSubs) {
        try { 
          s.unsubscribe(); 
        } catch (e) { 
          /* ignore */ 
        }
      }
      this.prefetchSubs = [];
    }
    this.setLoading(false);
    this.setError(null);
  }

  /**
   * Carga los nombres de los géneros desde la base de datos al iniciar el servicio 
   * y los almacena en un Set para validación rápida.
   * 
   * Esto se hace para poder filtrar los subjects de Open Library y mapearlos a los 
   * géneros existentes en la base de datos, evitando mostrar categorías que no 
   * tenemos definidas o que no son relevantes.
   * Si la carga falla, se inicializa con un Set vacío para evitar errores posteriores, 
   * aunque esto significa que no se podrán mapear géneros desde los subjects.
   */
  private loadGenreCache(): void {
    this.getGenres().pipe(
      rxCatchError(() => of([] as { id: number; name: string }[]))
    ).subscribe(genres => {
      this.cachedGenreNames = new Set(genres.map(g => g.name.toLowerCase()));
    });
  }

  /**
   * Mapea la respuesta del backend al formato esperado
   * 
   * Dado que el backend puede devolver campos con nombres diferentes o estructuras ligeramente distintas,
   * esta función se encarga de normalizar la respuesta para que los componentes puedan consumirla de forma consistente.
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
              ratingsAverage: b.score,
              categories: b.genres ? b.genres.map((g: any) => g.name) : []
            } as OpenLibraryBook))),
            rxCatchError(() => of([] as OpenLibraryBook[]))
          )
      : of([] as OpenLibraryBook[]);

    return forkJoin([openLibrary$, localSearch$]).pipe(
      map(([olResponse, localBooks]) => {
        const localKeys = new Set(localBooks.map(b => b.key));
        const filteredOl = olResponse.docs.filter(b => !localKeys.has(b.key));
        const merged = [...localBooks, ...filteredOl];
        const totalFromOl = olResponse.numFound || 0;
        const total = totalFromOl > 0 ? totalFromOl : merged.length;
        return { numFound: total, start: offset, docs: merged };
      })
    );
  }

  /**
   * Recupera todos los resultados (OpenLibrary + locales) sin paginar.
   * 
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
          ratingsAverage: b.score,
          categories: b.genres ? b.genres.map((g: any) => g.name) : []
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
   * 
   * Esta función se llama después de obtener los resultados de búsqueda para 
   * actualizar el estado compartido que los componentes pueden suscribirse 
   * para mostrar los resultados. También se encarga de limpiar el estado de 
   * error y loading.
   */
  publishResults(response: OpenLibrarySearchResponse | null): void {
    this.responseSubject.next(response);
  }

  setSelectedBook(book: OpenLibraryBook | null): void {
    this.selectedBookSubject.next(book);
  }

  setNavigationOrigin(origin: { type: 'search' | 'list' | 'other' | 'profile' | 'menu' | 'listas'; listId?: string } | null): void {
    this.originSubject.next(origin);
  }

  getNavigationOrigin(): { type: 'search' | 'list' | 'other' | 'profile' | 'menu' | 'listas'; listId?: string } | null {
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
   * 
   * Esta función es útil para componentes que necesitan acceder a la query actual 
   * sin suscribirse a un observable, como por ejemplo para mostrarla en un campo 
   * de búsqueda o para realizar acciones basadas en la query actual.
   */
  getSearchQuery(): string {
    return this.currentQuery;
  }

  /**
   * Ejecuta la búsqueda usando la query y la página actuales y publica los resultados
   * 
   * Esta función se llama típicamente cuando el usuario navega a una nueva página de 
   * resultados o cuando se actualiza la query.
   * Se encarga de manejar el estado de loading, error y success, así como de cachear 
   * los resultados por página para mejorar la experiencia de usuario.
   * También implementa una estrategia de prefetching para cargar la siguiente página en 
   * segundo plano y hacer la navegación más fluida.
   */
  searchCurrent(limit: number = 12): void {
    if (!this.currentQuery || !this.currentQuery.trim()) {
      this.setError('Por favor ingresa un término de búsqueda');
      return;
    }
    const page = this.currentPageSubject.value || 1;
    const offset = (page - 1) * limit;
    const cacheKey = `${this.currentQuery}::${limit}::${offset}`;

    const cached = this.pageCache.get(cacheKey);
    if (cached) {
      this.setLoading(false);
      this.setError(null);
      this.publishResults(cached);
      this.prefetchPage(this.currentQuery, limit, offset + limit);
      return;
    }

    this.setLoading(true);
    this.setError(null);
    this.setSuccess(null);

    this.currentSearchSub = this.searchBooks(this.currentQuery, limit, offset).subscribe({
      next: (response) => {
        try { this.pageCache.set(cacheKey, response); } catch (e) { /* */ }
        this.publishResults(response);
        this.setLoading(false);
        if (!response.docs || response.docs.length === 0) {
          this.setError('No se encontraron libros. Intenta con otra búsqueda.');
        }
        this.prefetchPage(this.currentQuery, limit, offset + limit);
        this.currentSearchSub = null;
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
        this.currentSearchSub = null;
      }
    });
  }

  /**
   * Prefetch de la siguiente página de resultados para mejorar la experiencia de usuario
   * @param query Término de búsqueda
   * @param limit Número de resultados por página
   * @param offset Desplazamiento para la paginación
   * @returns void
   */
  private prefetchPage(query: string, limit: number, offset: number): void {
    if (!query || offset < 0) return;
    const cacheKey = `${query}::${limit}::${offset}`;
    if (this.pageCache.has(cacheKey)) return;
    // don't block UI; subscribe and store in cache
    const sub = this.searchBooks(query, limit, offset).subscribe({
      next: (response) => {
        try { this.pageCache.set(cacheKey, response); } catch (e) { /* ignore */ }
      },
      error: () => { /*  */ }
    });
    this.prefetchSubs.push(sub);
  }

  /**
   * Búsqueda por autor usando la query actual
   * @param limit Número de resultados a mostrar (default: 10)
   * @returns void
   */
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
    sagaName?: string;
    sagaId?: number;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/books`, bookData);
  }

  /**
   * Obtiene todos los géneros disponibles
   * @return Observable con un array de objetos que contienen el id y nombre de cada género
   */
  getGenres(): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(`${this.apiUrl}/genres`);
  }

  getBookByApiId(apiId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/books/by-api-id`, { params: { apiId } }).pipe(
      rxCatchError(() => of(null))
    );
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
    return 'assets/default-book-cover.svg';
  }

  /**
   * Obtiene el nombre del primer autor de un libro, o "Autor desconocido" si no hay autores disponibles
   * @param book El libro del cual obtener el nombre del autor
   * @returns El nombre del primer autor o "Autor desconocido" si no hay autores disponibles
   */
  getFirstAuthor(book: OpenLibraryBook): string {
    return book.authorNames && book.authorNames.length > 0 ? book.authorNames[0] : 'Autor desconocido';
  }

  /**
   * Intenta inferir el nombre de la saga a la que pertenece un libro a partir de su título, series o subjects.
   * @param book El libro del cual intentar inferir el nombre de la saga
   * @returns El nombre de la saga si se pudo inferir, o null si no se pudo determinar un nombre de saga válido
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
        if (subjectLower.includes('saga') || subjectLower.includes('series') || subjectLower.includes('trilogy') || subjectLower.includes('cycle')) {
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
   * Determina si un libro pertenece a una saga intentando inferir el nombre 
   * de la saga a partir de su título, series o subjects.
   * @param book El libro del cual intentar inferir si pertenece a una saga
   * @returns true si se pudo inferir un nombre de saga válido, o false si no 
   * se pudo determinar un nombre de saga o si el libro no parece pertenecer 
   * a una saga
   */
  isSaga(book: OpenLibraryBook): boolean {
    return this.getSagaName(book) !== null;
  }

  /**
   * Obtiene el número de ediciones de un libro, intentando mapear tanto el campo 
   * `editionCount` como `edition_count` para mayor compatibilidad con diferentes 
   * formatos de respuesta.
   * Si no se encuentra ninguno de los campos, devuelve '0' por defecto.
   * @param book El libro del cual obtener el número de ediciones
   * @returns El número de ediciones como cadena, o '0' si no se encuentra la información de ediciones
   */
  getEditionCount(book: OpenLibraryBook): string {
    return book.editionCount?.toString() || book.edition_count?.toString() || '0';
  }

  /**
   * Obtiene las categorías de un libro a partir de sus géneros o subjects, filtrando y mapeando
   * solo aquellos que coincidan con los géneros existentes en la base de datos.
   * @param book El libro del cual obtener las categorías
   * @returns Un arreglo de categorías como cadenas, o un arreglo vacío si no se encuentran categorías válidas
   */
  getCategories(book: any): string[] {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
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
    const raw: any[] = book.subject || book.subjects || book.categories || [];
    if (Array.isArray(raw)) {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const s of raw) {
        if (typeof s !== 'string' || s.includes('=') || /^[A-Za-z_]+:/.test(s)) continue;
        const parts = s.split(',').map((p: string) => p.trim()).filter(Boolean);
        for (const part of parts) {
          const key = part.toLowerCase();
          if (!this.cachedGenreNames.has(key)) continue;
          if (!seen.has(key)) { seen.add(key); result.push(capitalize(part)); }
          if (result.length >= 5) break;
        }
        if (result.length >= 5) break;
      }
      if (result.length > 0) return result;
    }
    return [];
  }

  /**
   * Intenta inferir categorías de un libro a partir de palabras clave en su título o descripción,
   * utilizando un conjunto de palabras clave predefinidas para cada categoría común.
   * Esta función se utiliza como último recurso cuando no se pueden obtener categorías 
   * válidas a partir de los géneros o subjects, para al menos asignar una categoría 
   * general basada en el contenido del libro.
   * @param book El libro del cual intentar inferir las categorías
   * @returns Un arreglo de categorías inferidas como cadenas, o un arreglo con 'Ficción' si no 
   * se pudieron inferir categorías específicas, o un arreglo vacío si no se pudo determinar 
   * ninguna categoría relevante
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
   * Genera un arreglo de strings que representan el estado de cada estrella (full, half, empty)
   * a partir de un rating numérico, para facilitar la visualización de estrellas en la UI.
   * El rating se redondea hacia abajo para determinar el número de estrellas completas, y si 
   * hay una fracción decimal se agrega una estrella media. El resto se completa con estrellas 
   * vacías hasta un total de 5.
   * @param rating El rating numérico del libro, que puede ser un número decimal o entero, o 
   * undefined si no hay rating disponible
   * @returns Un arreglo de strings que representan el estado de cada estrella (full, half, empty), 
   * o un arreglo con 5 'empty' si no hay rating disponible
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
   * Scrapea la información de la saga de un libro desde Goodreads
   * 
   * Dado un título y opcionalmente un autor, esta función hace una petición al 
   * backend para obtener la información de la saga a la que pertenece el libro, 
   * incluyendo el nombre de la saga y los libros que forman parte de ella.
   */
  scrapeSaga(title: string, author?: string): Observable<SagaScraped | null> {
    let params = new HttpParams().set('title', title);
    if (author) {
      params = params.set('author', author);
    }
    return this.http.get<SagaScraped>(`${this.apiUrl}/api/saga/scrape`, { params }).pipe(
      rxCatchError(() => of(null))
    );
  }
}
