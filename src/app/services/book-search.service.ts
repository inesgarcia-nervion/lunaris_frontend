import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

  constructor(private http: HttpClient) { }

  /**
   * Mapea la respuesta del backend al formato esperado
   */
  private mapBooks(response: any): OpenLibrarySearchResponse {
    console.log('Response recibida:', response);
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

    return this.http.get<any>(`${this.apiUrl}/api/openlibrary/search`, { params })
      .pipe(map(response => this.mapBooks(response)));
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
    return 'assets/default-book-cover.png'; // Imagen por defecto
  }
}
