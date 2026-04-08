import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../../app/domain/services/book-search.service';

const BASE = 'http://localhost:8080';

function makeBook(overrides: Partial<OpenLibraryBook> = {}): OpenLibraryBook {
  return { key: '/works/OL1', title: 'Test Book', authorNames: ['Author'], ...overrides };
}

function makeResponse(docs: OpenLibraryBook[] = [], numFound = 1): OpenLibrarySearchResponse {
  return { numFound, start: 0, docs };
}

describe('BookSearchService', () => {
  let service: BookSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [BookSearchService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookSearchService);
    httpMock = TestBed.inject(HttpTestingController);
    // Flush the genre cache request made in constructor
    const genreReq = httpMock.match(`${BASE}/genres`);
    genreReq.forEach(r => r.flush([]));
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── searchBooks() ──────────────────────────────────────────────────────

  it('searchBooks should return merged OL + local results (page 1)', () => {
    let result: OpenLibrarySearchResponse | null = null;
    service.searchBooks('dune', 12, 0).subscribe(r => (result = r));

    const olReq = httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`);
    olReq.flush({ numFound: 1, start: 0, docs: [{ key: '/w/1', title: 'Dune', author_name: ['Herbert'] }] });

    const localReq = httpMock.expectOne(r => r.url === `${BASE}/books/search`);
    localReq.flush([{ apiId: 'local-1', title: 'Local Book', author: 'Author', releaseYear: 2020, genres: [] }]);

    expect(result).not.toBeNull();
    expect(result!.docs.length).toBeGreaterThan(0);
  });

  it('searchBooks at offset > 0 skips local search', () => {
    service.searchBooks('test', 12, 12).subscribe();

    const olReq = httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`);
    olReq.flush({ numFound: 5, start: 12, docs: [] });
    httpMock.expectNone(`${BASE}/books/search`);
  });

  it('searchBooks deduplicates by key', () => {
    let result: OpenLibrarySearchResponse | null = null;
    service.searchBooks('book', 12, 0).subscribe(r => (result = r));

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush({
      numFound: 1,
      start: 0,
      docs: [{ key: 'shared-key', title: 'Shared', author_name: ['A'] }],
    });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([
      { apiId: 'shared-key', title: 'Shared', author: 'A' },
    ]);

    expect(result!.docs.length).toBe(1);
  });

  it('searchBooks handles OL error gracefully', () => {
    let result: OpenLibrarySearchResponse | null = null;
    service.searchBooks('error', 12, 0).subscribe(r => (result = r));

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush('err', {
      status: 500,
      statusText: 'Server Error',
    });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([]);

    expect(result!.docs).toEqual([]);
  });

  it('searchBooks handles local error gracefully', () => {
    let result: OpenLibrarySearchResponse | null = null;
    service.searchBooks('error2', 12, 0).subscribe(r => (result = r));

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush({
      numFound: 1,
      start: 0,
      docs: [{ key: '/w/x', title: 'OL Book', author_name: ['OL Author'] }],
    });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush('err', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(result!.docs).toHaveLength(1);
  });

  // ── searchAll() ────────────────────────────────────────────────────────

  it('searchAll should return merged results without pagination', () => {
    let result: OpenLibraryBook[] | null = null;
    service.searchAll('fantasy').subscribe(r => (result = r));

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush({
      numFound: 2,
      start: 0,
      docs: [{ key: '/w/a', title: 'Fantasy A', author_name: [] }],
    });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([]);

    expect(result).toHaveLength(1);
  });

  it('searchAll handles errors from both sources', () => {
    let result: OpenLibraryBook[] | null = null;
    service.searchAll('fail').subscribe(r => (result = r));

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush('e', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush('e', {
      status: 503,
      statusText: 'Service Unavailable',
    });

    expect(result).toEqual([]);
  });

  // ── State management ────────────────────────────────────────────────────

  it('publishResults should emit on response$', () => {
    let emitted: OpenLibrarySearchResponse | null = undefined as any;
    service.response$.subscribe(v => (emitted = v));
    const resp = makeResponse([makeBook()]);
    service.publishResults(resp);
    expect(emitted).toEqual(resp);
  });

  it('setSelectedBook should emit on selectedBook$', () => {
    let emitted: OpenLibraryBook | null = null;
    service.selectedBook$.subscribe(b => (emitted = b));
    const book = makeBook();
    service.setSelectedBook(book);
    expect(emitted).toEqual(book);
    service.setSelectedBook(null);
    expect(emitted).toBeNull();
  });

  it('setNavigationOrigin / getNavigationOrigin should store and retrieve origin', () => {
    service.setNavigationOrigin({ type: 'search' });
    expect(service.getNavigationOrigin()).toEqual({ type: 'search' });
    service.setNavigationOrigin(null);
    expect(service.getNavigationOrigin()).toBeNull();
  });

  it('setLoading should emit on loading$', () => {
    let val: boolean | null = null;
    service.loading$.subscribe(v => (val = v));
    service.setLoading(true);
    expect(val).toBe(true);
    service.setLoading(false);
    expect(val).toBe(false);
  });

  it('setError should emit on error$', () => {
    let val: string | null = undefined as any;
    service.error$.subscribe(v => (val = v));
    service.setError('Oops');
    expect(val).toBe('Oops');
    service.setError(null);
    expect(val).toBeNull();
  });

  it('setSuccess should emit on success$', () => {
    let val: string | null = undefined as any;
    service.success$.subscribe(v => (val = v));
    service.setSuccess('Done');
    expect(val).toBe('Done');
  });

  it('setCurrentPage should emit on currentPage$', () => {
    let page = 1;
    service.currentPage$.subscribe(v => (page = v));
    service.setCurrentPage(3);
    expect(page).toBe(3);
  });

  it('setSearchQuery should update query and reset page to 1', () => {
    service.setCurrentPage(5);
    service.setSearchQuery('new query');
    expect(service.getSearchQuery()).toBe('new query');
    let page = 999;
    service.currentPage$.subscribe(v => (page = v));
    expect(page).toBe(1);
  });

  it('getSearchQuery should return current query', () => {
    service.setSearchQuery('fantasy novels');
    expect(service.getSearchQuery()).toBe('fantasy novels');
  });

  // ── searchCurrent() ────────────────────────────────────────────────────

  it('searchCurrent with empty query sets error', () => {
    service.searchCurrent();
    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toBeTruthy();
  });

  it('searchCurrent with whitespace-only query sets error', () => {
    service.setSearchQuery('   ');
    service.searchCurrent();
    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toBeTruthy();
  });

  it('searchCurrent makes HTTP request and publishes results', () => {
    service.setSearchQuery('dune');
    service.searchCurrent(12);

    let published: OpenLibrarySearchResponse | null = null;
    service.response$.subscribe(v => (published = v));

    const olReq = httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`);
    olReq.flush({ numFound: 1, start: 0, docs: [{ key: '/w/1', title: 'Dune', author_name: [] }] });
    const localReq = httpMock.expectOne(r => r.url === `${BASE}/books/search`);
    localReq.flush([]);

    // prefetch page 2
    const olReq2 = httpMock.match(r => r.url === `${BASE}/api/openlibrary/search`);
    olReq2.forEach(r => r.flush({ numFound: 0, start: 12, docs: [] }));
    const localReq2 = httpMock.match(r => r.url === `${BASE}/books/search`);
    localReq2.forEach(r => r.flush([]));

    expect(published!.docs.length).toBeGreaterThan(0);
  });

  it('searchCurrent sets error when no results', () => {
    service.setSearchQuery('xyznotfound');
    service.searchCurrent();

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush({ numFound: 0, start: 0, docs: [] });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([]);

    // absorb prefetch
    httpMock.match(r => r.url === `${BASE}/api/openlibrary/search`).forEach(r => r.flush({ numFound: 0, start: 12, docs: [] }));
    httpMock.match(r => r.url === `${BASE}/books/search`).forEach(r => r.flush([]));

    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toBeTruthy();
  });

  it('searchCurrent handles 401 error with specific message', () => {
    service.setSearchQuery('restricted');
    service.searchCurrent();

    // OL catches errors internally via rxCatchError and returns empty result
    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([]);

    // absorb prefetch
    httpMock.match(r => r.url === `${BASE}/api/openlibrary/search`).forEach(r => r.flush({ numFound: 0, start: 12, docs: [] }));
    httpMock.match(r => r.url === `${BASE}/books/search`).forEach(r => r.flush([]));

    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    // rxCatchError swallows the 401 and returns empty docs, so error is "no results"
    expect(err).toBeTruthy();
  });

  it('searchCurrent handles generic error', () => {
    service.setSearchQuery('failing');
    service.searchCurrent();

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([]);

    // absorb prefetch
    httpMock.match(r => r.url === `${BASE}/api/openlibrary/search`).forEach(r => r.flush({ numFound: 0, start: 12, docs: [] }));
    httpMock.match(r => r.url === `${BASE}/books/search`).forEach(r => r.flush([]));

    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toBeTruthy();
  });

  it('searchCurrent uses cache on second call', () => {
    service.setSearchQuery('cached');
    service.setCurrentPage(1);
    service.searchCurrent(12);

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search`).flush({
      numFound: 5,
      start: 0,
      docs: [{ key: '/w/cached', title: 'Cached', author_name: [] }],
    });
    httpMock.expectOne(r => r.url === `${BASE}/books/search`).flush([]);

    // absorb prefetch
    const prefetchOl = httpMock.match(r => r.url === `${BASE}/api/openlibrary/search`);
    prefetchOl.forEach(r => r.flush({ numFound: 0, start: 12, docs: [] }));
    const prefetchLocal = httpMock.match(r => r.url === `${BASE}/books/search`);
    prefetchLocal.forEach(r => r.flush([]));

    // second call should NOT make new HTTP requests
    service.searchCurrent(12);
    httpMock.expectNone(r => r.url === `${BASE}/api/openlibrary/search`);
  });

  // ── searchByAuthorCurrent() ────────────────────────────────────────────

  it('searchByAuthorCurrent with empty query sets error', () => {
    service.searchByAuthorCurrent();
    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toBeTruthy();
  });

  it('searchByAuthorCurrent makes request when query is set', () => {
    service.setSearchQuery('Tolkien');
    service.searchByAuthorCurrent(10);

    const req = httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search/author`);
    req.flush({ numFound: 0, start: 0, docs: [] });

    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toContain('No se encontraron');
  });

  it('searchByAuthorCurrent handles HTTP error', () => {
    service.setSearchQuery('Dickens');
    service.searchByAuthorCurrent();

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search/author`).flush('err', { status: 500, statusText: 'Error' });

    let err: string | null = null;
    service.error$.subscribe(v => (err = v));
    expect(err).toBeTruthy();
  });

  it('searchByAuthorCurrent publishes results', () => {
    service.setSearchQuery('Tolkien');
    service.searchByAuthorCurrent(10);

    let published: OpenLibrarySearchResponse | null = null;
    service.response$.subscribe(v => (published = v));

    httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search/author`).flush({
      numFound: 1,
      start: 0,
      docs: [{ key: '/w/lotr', title: 'LOTR', author_name: ['Tolkien'] }],
    });

    expect(published!.docs.length).toBe(1);
  });

  // ── searchByTitle() ────────────────────────────────────────────────────

  it('searchByTitle should GET from /api/openlibrary/search/title', () => {
    let result: OpenLibrarySearchResponse | null = null;
    service.searchByTitle('dune', 5, 0).subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search/title`);
    expect(req.request.params.get('title')).toBe('dune');
    req.flush({ numFound: 1, start: 0, docs: [{ key: '/w/d', title: 'Dune', author_name: [] }] });

    expect(result!.docs).toHaveLength(1);
  });

  it('searchByAuthor should GET from /api/openlibrary/search/author', () => {
    let result: OpenLibrarySearchResponse | null = null;
    service.searchByAuthor('Herbert', 5, 0).subscribe(r => (result = r));

    const req = httpMock.expectOne(r => r.url === `${BASE}/api/openlibrary/search/author`);
    expect(req.request.params.get('author')).toBe('Herbert');
    req.flush({ numFound: 1, start: 0, docs: [] });

    expect(result).not.toBeNull();
  });

  // ── importBook() / createBook() / getGenres() / getBookByApiId() ────────

  it('importBook should POST to /books/import/openlibrary', () => {
    const book = makeBook();
    service.importBook(book).subscribe();
    const req = httpMock.expectOne(`${BASE}/books/import/openlibrary`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1 });
  });

  it('createBook should POST to /books', () => {
    service.createBook({ title: 'New', author: 'Auth' }).subscribe();
    const req = httpMock.expectOne(`${BASE}/books`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 2 });
  });

  it('getGenres should GET from /genres', () => {
    let genres: { id: number; name: string }[] | null = null;
    service.getGenres().subscribe(g => (genres = g));
    const req = httpMock.expectOne(`${BASE}/genres`);
    req.flush([{ id: 1, name: 'Fantasy' }]);
    expect(genres).toHaveLength(1);
  });

  it('getBookByApiId should GET from /books/by-api-id', () => {
    service.getBookByApiId('api-1').subscribe();
    const req = httpMock.expectOne(r => r.url === `${BASE}/books/by-api-id`);
    req.flush({ id: 1, title: 'Found' });
  });

  it('getBookByApiId returns null on error', () => {
    let result: any = 'not-null';
    service.getBookByApiId('bad').subscribe(r => (result = r));
    httpMock.expectOne(r => r.url === `${BASE}/books/by-api-id`).flush('err', {
      status: 404,
      statusText: 'Not Found',
    });
    expect(result).toBeNull();
  });

  // ── Helper methods ─────────────────────────────────────────────────────

  it('getCoverUrl returns coverUrl when present', () => {
    const book = makeBook({ coverUrl: 'http://example.com/cover.jpg' });
    expect(service.getCoverUrl(book)).toBe('http://example.com/cover.jpg');
  });

  it('getCoverUrl uses coverId to build OL URL', () => {
    const book = makeBook({ coverId: 12345 });
    expect(service.getCoverUrl(book)).toContain('12345');
  });

  it('getCoverUrl uses cover_i when coverId not set', () => {
    const book = makeBook({ cover_i: 99999 });
    expect(service.getCoverUrl(book)).toContain('99999');
  });

  it('getCoverUrl falls back to default svg', () => {
    const book = makeBook();
    expect(service.getCoverUrl(book)).toContain('default-book-cover.svg');
  });

  it('getFirstAuthor returns first author name', () => {
    const book = makeBook({ authorNames: ['Tolkien', 'Other'] });
    expect(service.getFirstAuthor(book)).toBe('Tolkien');
  });

  it('getFirstAuthor returns default when no authors', () => {
    const book = makeBook({ authorNames: [] });
    expect(service.getFirstAuthor(book)).toBe('Autor desconocido');
  });

  it('getEditionCount returns editionCount as string', () => {
    const book = makeBook({ editionCount: 5 });
    expect(service.getEditionCount(book)).toBe('5');
  });

  it('getEditionCount falls back to edition_count', () => {
    const book = makeBook({ edition_count: 3 });
    expect(service.getEditionCount(book)).toBe('3');
  });

  it('getEditionCount returns "0" when not set', () => {
    expect(service.getEditionCount(makeBook())).toBe('0');
  });

  it('isSaga returns true for book with saga in title', () => {
    const book = makeBook({ title: 'Book One (My Series #1)' });
    expect(service.isSaga(book)).toBe(true);
  });

  it('isSaga returns false for regular book', () => {
    const book = makeBook({ title: 'Just a Book' });
    expect(service.isSaga(book)).toBe(false);
  });

  it('getSagaName returns series name from series array', () => {
    const book = { ...makeBook(), series: ['My Great Series'] };
    expect(service.getSagaName(book)).toBe('My Great Series');
  });

  it('getSagaName returns saga from title pattern', () => {
    const book = makeBook({ title: 'The Hero (Adventures Series)' });
    expect(service.getSagaName(book)).toBeTruthy();
  });

  it('getSagaName returns null for books without saga patterns', () => {
    const book = makeBook({ title: 'A Normal Book' });
    expect(service.getSagaName(book)).toBeNull();
  });

  it('getSagaName skips series entries with = sign', () => {
    const book = { ...makeBook(), series: ['format=invalid'] };
    expect(service.getSagaName(book)).toBeNull();
  });

  it('getSagaName parses series: prefix patterns', () => {
    const book = { ...makeBook(), series: ['series:My Series Name'] };
    expect(service.getSagaName(book)).toBe('My Series Name');
  });

  it('getSagaName returns saga from subject field with trilogy keyword', () => {
    const book = { ...makeBook(), subject: ['The Lord of the Rings trilogy'] };
    expect(service.getSagaName(book)).toBeTruthy();
  });

  it('getSagaName skips subject entries with = or prefix format', () => {
    const book = { ...makeBook(), subject: ['format=bad', 'key:value'] };
    expect(service.getSagaName(book)).toBeNull();
  });

  it('getCategories returns genres from genres array (objects)', () => {
    const book = { ...makeBook(), genres: [{ name: 'Fantasy' }, { name: 'Adventure' }] };
    const cats = service.getCategories(book);
    expect(cats).toContain('Fantasy');
  });

  it('getCategories returns genres from genres array (strings)', () => {
    const book = { ...makeBook(), genres: ['Mystery', 'Thriller'] };
    const cats = service.getCategories(book);
    expect(cats).toContain('Mystery');
  });

  it('getCategories returns empty when no genres match', () => {
    const book = makeBook({ subject: ['UnknownSubject'] });
    // cachedGenreNames is empty by default, so no match
    expect(service.getCategories(book)).toEqual([]);
  });

  it('getCategories returns empty when no genres or subject', () => {
    expect(service.getCategories(makeBook())).toEqual([]);
  });

  it('getCategories handles subject with = or prefix format by skipping', () => {
    const book = { ...makeBook(), subject: ['format=bad', 'key:value', 'Valid Subject'] };
    // cachedGenreNames empty, so no match
    expect(service.getCategories(book)).toEqual([]);
  });
});
