import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService, ReviewDto } from '../../../app/domain/services/review.service';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { of } from 'rxjs';

/**
 * Pruebas unitarias para ReviewService.
 */
describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;
  let bookSearchServiceMock: { getBookByApiId: ReturnType<typeof vi.fn> };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(() => {
    bookSearchServiceMock = {
      getBookByApiId: vi.fn().mockReturnValue(of(null)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BookSearchService, useValue: bookSearchServiceMock },
      ],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * Verificación después de cada prueba.
   */
  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Verifica que el servicio se crea correctamente.
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Verifica que getByBookApiId realiza un GET a /reviews/book con el apiId correcto.
   */
  it('getByBookApiId should GET reviews for a book', () => {
    const mockReviews: ReviewDto[] = [{ id: 1, comment: 'Great', rating: 5 }];
    let result: ReviewDto[] | null = null;
    service.getByBookApiId('api123').subscribe(r => (result = r));
    const req = httpMock.expectOne(r => r.url === 'http://localhost:8080/reviews/book');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('apiId')).toBe('api123');
    req.flush(mockReviews);
    expect(result).toEqual(mockReviews);
  });

  /**
   * Verifica que getAll realiza un GET a /reviews y actualiza el subject.
   */
  it('getAll should GET all reviews and update subject', () => {
    const mockReviews: ReviewDto[] = [
      { id: 1, bookApiId: 'ol-111', bookTitle: 'Dune', coverUrl: 'cover.jpg' },
    ];
    let emitted: ReviewDto[] | null = null;
    service.reviews$.subscribe(r => (emitted = r));
    service.getAll().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    req.flush(mockReviews);
    expect(emitted).toEqual(mockReviews);
  });

  /**
   * Verifica que getAll enriquece las reseñas de libros personalizados que no tienen título/portada.
   */
  it('getAll should enrich custom book reviews that are missing title/cover', () => {
    const mockReviews: ReviewDto[] = [
      { id: 2, bookApiId: 'custom-abc', bookTitle: null as any, coverUrl: null as any },
    ];
    bookSearchServiceMock.getBookByApiId.mockReturnValue(
      of({ title: 'Custom Book', coverImage: 'custom.jpg' })
    );
    let emitted: ReviewDto[] | null = null;
    service.reviews$.subscribe(r => (emitted = r));
    service.getAll().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    req.flush(mockReviews);
    expect(bookSearchServiceMock.getBookByApiId).toHaveBeenCalledWith('custom-abc');
    expect(emitted![0].bookTitle).toBe('Custom Book');
    expect(emitted![0].coverUrl).toBe('custom.jpg');
  });

  /**
   * Verifica que getAll no sobrescribe el título/portada existente para libros personalizados.
   */
  it('getAll should not overwrite existing title/cover for custom books', () => {
    const mockReviews: ReviewDto[] = [
      { id: 3, bookApiId: 'custom-xyz', bookTitle: 'Existing Title', coverUrl: 'existing.jpg' },
    ];
    bookSearchServiceMock.getBookByApiId.mockReturnValue(
      of({ title: 'Other Title', coverImage: 'other.jpg' })
    );
    service.getAll().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    req.flush(mockReviews);
    expect(service['reviewsSubject'].getValue()[0].bookTitle).toBe('Existing Title');
  });

  /**
   * Verifica que getAll maneja correctamente un libro nulo devuelto por getBookByApiId.
   */
  it('getAll handles null book from getBookByApiId gracefully', () => {
    const mockReviews: ReviewDto[] = [
      { id: 4, bookApiId: 'custom-null', bookTitle: null as any, coverUrl: null as any },
    ];
    bookSearchServiceMock.getBookByApiId.mockReturnValue(of(null));
    service.getAll().subscribe();
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    req.flush(mockReviews);
    expect(service['reviewsSubject'].getValue()[0].bookTitle).toBeNull();
  });

  /**
   * Verifica que getAll maneja correctamente reseñas no personalizadas sin llamar a getBookByApiId.
   */
  it('getAll handles non-custom reviews without fetching book', () => {
    const mockReviews: ReviewDto[] = [
      { id: 5, bookApiId: 'ol-standard', bookTitle: 'Std', coverUrl: 'std.jpg' },
    ];
    service.getAll().subscribe();
    httpMock.expectOne('http://localhost:8080/reviews').flush(mockReviews);
    expect(bookSearchServiceMock.getBookByApiId).not.toHaveBeenCalled();
  });

  /**
   * Verifica que refreshAll llama a getAll sin errores.
   */
  it('refreshAll should call getAll without error', () => {
    service.refreshAll();
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    req.flush([]);
  });

  /**
   * Verifica que refreshAll no lanza errores en caso de error HTTP.
   */
  it('refreshAll should not throw on HTTP error', () => {
    service.refreshAll();
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    req.flush('error', { status: 500, statusText: 'Server Error' });
  });

  /**
   * Verifica que create realiza un POST a /reviews.
   */
  it('create should POST to /reviews', () => {
    const review: ReviewDto = { comment: 'Good', rating: 4 };
    let result: ReviewDto | null = null;
    service.create(review).subscribe(r => (result = r));
    const req = httpMock.expectOne('http://localhost:8080/reviews');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(review);
    req.flush({ id: 10, ...review });
    expect(result!.id).toBe(10);
  });

  /**
   * Verifica que update realiza un PUT a /reviews/:id.
   */
  it('update should PUT to /reviews/:id', () => {
    const review: ReviewDto = { comment: 'Updated', rating: 3 };
    let result: ReviewDto | null = null;
    service.update(7, review).subscribe(r => (result = r));
    const req = httpMock.expectOne('http://localhost:8080/reviews/7');
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 7, ...review });
    expect(result!.comment).toBe('Updated');
  });

  /**
   * Verifica que delete realiza un DELETE a /reviews/:id.
   */
  it('delete should DELETE /reviews/:id', () => {
    let completed = false;
    service.delete(3).subscribe(() => (completed = true));
    const req = httpMock.expectOne('http://localhost:8080/reviews/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(completed).toBe(true);
  });

  /**
   * Verifica que reviews$ tiene un valor inicial de array vacío.
   */
  it('reviews$ initial value is empty array', () => {
    let current: ReviewDto[] = [];
    service.reviews$.subscribe(r => (current = r));
    expect(current).toEqual([]);
  });
});
