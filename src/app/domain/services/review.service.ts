import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { BookSearchService } from './book-search.service';

/**
 * Este servicio gestiona las reseñas de libros en la aplicación, permitiendo crear, actualizar, eliminar y obtener reseñas.
 * 
 * Cada reseña tiene un ID único, comentario, calificación, fecha, ID del libro (bookApiId), título del libro, URL de la 
 * portada y nombre de usuario.
 * El servicio se comunica con un backend a través de HTTP para realizar las operaciones CRUD (Crear, Leer, Actualizar, 
 * Eliminar) relacionadas con las reseñas de libros.
 */
export interface ReviewDto {
  id?: number;
  comment?: string;
  rating?: number;
  date?: string;
  bookApiId?: string;
  bookTitle?: string;
  coverUrl?: string;
  username?: string;
}

/**
 * El servicio de reseñas se encarga de gestionar las reseñas de libros en la aplicación. Proporciona métodos para obtener
 * reseñas por el ID del libro, obtener todas las reseñas, crear una nueva reseña, actualizar una reseña existente y eliminar
 * una reseña. Además, utiliza un BehaviorSubject para mantener un estado reactivo de las reseñas y permite a los componentes
 * suscribirse a los cambios en las reseñas.
 */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = 'http://localhost:8080';

  private reviewsSubject = new BehaviorSubject<ReviewDto[]>([]);
  reviews$ = this.reviewsSubject.asObservable();

  constructor(private http: HttpClient, private bookSearchService: BookSearchService) {}

  /**
   * Obtiene las reseñas de un libro específico por su ID de API.
   * @param apiId El ID de API del libro.
   * @returns Un Observable que emite un array de objetos ReviewDto.
   */
  getByBookApiId(apiId: string): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.apiUrl}/reviews/book`, { params: { apiId } });
  }

  getAll(): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.apiUrl}/reviews`).pipe(
      switchMap(reviews => {
        const missing = reviews.filter(r =>
          r.bookApiId?.startsWith('custom-') && (!r.bookTitle || !r.coverUrl)
        );
        if (missing.length === 0) {
          this.reviewsSubject.next(reviews);
          return of(reviews);
        }
        const uniqueApiIds = [...new Set(missing.map(r => r.bookApiId!))];
        return forkJoin(
          uniqueApiIds.map(apiId => this.bookSearchService.getBookByApiId(apiId))
        ).pipe(
          tap(books => {
            const bookMap = new Map<string, any>();
            books.forEach((b, i) => { if (b) bookMap.set(uniqueApiIds[i], b); });
            const enriched = reviews.map(r => {
              if (!r.bookApiId?.startsWith('custom-')) return r;
              const book = bookMap.get(r.bookApiId);
              if (!book) return r;
              return {
                ...r,
                bookTitle: r.bookTitle || book.title || r.bookTitle,
                coverUrl: r.coverUrl || book.coverImage || r.coverUrl
              };
            });
            this.reviewsSubject.next(enriched);
          }),
          switchMap(() => of(this.reviewsSubject.getValue()))
        );
      })
    );
  }

  /**
   * Refresca la lista de reseñas obteniendo todas las reseñas nuevamente del backend y 
   * actualizando el estado reactivo.
   * Este método se puede llamar después de crear, actualizar o eliminar una reseña para 
   * asegurarse de que la lista de reseñas
   * esté actualizada en toda la aplicación.
   */
  refreshAll(): void {
    this.getAll().subscribe({ error: () => {} });
  }

  /**
   * Crea una nueva reseña de libro enviando los datos al backend a través de una solicitud 
   * HTTP POST. El método espera un objeto
   * ReviewDto que contiene la información de la reseña a crear, como el comentario, la 
   * calificación, la fecha, el ID del libro,
   * el título del libro, la URL de la portada y el nombre de usuario. El backend procesará 
   * esta información y devolverá la reseña
   * creada con un ID asignado.
   * @param review El objeto ReviewDto que contiene la información de la reseña a crear.
   * @returns Un Observable que emite la reseña creada.
   */
  create(review: ReviewDto) {
    return this.http.post<ReviewDto>(`${this.apiUrl}/reviews`, review);
  }

  /**
   * Actualiza una reseña existente enviando los datos al backend a través de una solicitud 
   * HTTP PUT. El método espera el ID de la reseña a actualizar y un objeto ReviewDto que 
   * contiene la información actualizada de la reseña, como el comentario, la calificación, 
   * la fecha, el ID del libro, el título del libro, la URL de la portada y el nombre de 
   * usuario. El backend procesará esta información y devolverá la reseña actualizada.
   * @param id El ID de la reseña que se desea actualizar.
   * @param review El objeto ReviewDto que contiene la información actualizada de la reseña.
   * @returns Un Observable que emite la reseña actualizada.
   */
  update(id: number, review: ReviewDto) {
    return this.http.put<ReviewDto>(`${this.apiUrl}/reviews/${id}`, review);
  }

  /**
   * Elimina una reseña existente enviando el ID de la reseña al backend a través de una 
   * solicitud HTTP DELETE. El método espera el ID de la reseña que se desea eliminar. 
   * El backend procesará esta información y eliminará la reseña correspondiente.
   * @param id El ID de la reseña que se desea eliminar.
   * @returns Un Observable que emite void.
   */
  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${id}`);
  }
}
