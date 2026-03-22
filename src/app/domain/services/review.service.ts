import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { BookSearchService } from './book-search.service';

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

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = 'http://localhost:8080';

  private reviewsSubject = new BehaviorSubject<ReviewDto[]>([]);
  reviews$ = this.reviewsSubject.asObservable();

  constructor(private http: HttpClient, private bookSearchService: BookSearchService) {}

  getByBookApiId(apiId: string): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.apiUrl}/reviews/book`, { params: { apiId } });
  }

  getAll(): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.apiUrl}/reviews`).pipe(
      switchMap(reviews => {
        // Find custom-book reviews that are missing title or cover
        const missing = reviews.filter(r =>
          r.bookApiId?.startsWith('custom-') && (!r.bookTitle || !r.coverUrl)
        );
        if (missing.length === 0) {
          this.reviewsSubject.next(reviews);
          return of(reviews);
        }
        // Fetch each missing book in parallel, deduplicated by apiId
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

  refreshAll(): void {
    this.getAll().subscribe({ error: () => {} });
  }

  create(review: ReviewDto) {
    return this.http.post<ReviewDto>(`${this.apiUrl}/reviews`, review);
  }

  update(id: number, review: ReviewDto) {
    return this.http.put<ReviewDto>(`${this.apiUrl}/reviews/${id}`, review);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${id}`);
  }
}
