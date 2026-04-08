import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListasService, ListaItem } from '../../../app/domain/services/listas.service';
import { OpenLibraryBook } from '../../../app/domain/services/book-search.service';

function makeBook(key: string, title: string): OpenLibraryBook {
  return { key, title, authorNames: [] };
}

describe('ListasService', () => {
  let service: ListasService;

  function createService(): void {
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListasService);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    createService();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── Initialization ─────────────────────────────────────────────────────

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load empty list from empty localStorage', () => {
    expect(service.getAll()).toEqual([]);
  });

  it('should load lists from localStorage on init', () => {
    const stored: ListaItem[] = [{ id: '1', nombre: 'Mis Libros', libros: [], owner: 'alice' }];
    localStorage.setItem('lunaris_lists', JSON.stringify(stored));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getAll()).toHaveLength(1);
  });

  it('should handle broken localStorage JSON gracefully', () => {
    localStorage.setItem('lunaris_lists', 'invalid-json{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getAll()).toEqual([]);
  });

  // ── addList() ─────────────────────────────────────────────────────────

  it('addList should create a list with unique id', () => {
    localStorage.setItem('lunaris_current_user', 'bob');
    const lista = service.addList('Favorites');
    expect(lista.nombre).toBe('Favorites');
    expect(lista.id).toBeTruthy();
    expect(lista.libros).toEqual([]);
    expect(lista.owner).toBe('bob');
    expect(lista.isPrivate).toBe(false);
  });

  it('addList with isPrivate=true should create private list', () => {
    const lista = service.addList('Private', true);
    expect(lista.isPrivate).toBe(true);
  });

  it('addList should prepend to existing lists', () => {
    service.addList('First');
    const second = service.addList('Second');
    expect(service.getAll()[0].id).toBe(second.id);
  });

  it('addList should persist to localStorage', () => {
    service.addList('Persisted');
    const stored = JSON.parse(localStorage.getItem('lunaris_lists')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].nombre).toBe('Persisted');
  });

  // ── deleteList() ───────────────────────────────────────────────────────

  it('deleteList should remove list by id', () => {
    const lista = service.addList('Remove Me');
    service.deleteList(lista.id);
    expect(service.getAll()).toHaveLength(0);
    const stored = JSON.parse(localStorage.getItem('lunaris_lists')!);
    expect(stored).toHaveLength(0);
  });

  it('deleteList with non-existent id should not fail', () => {
    service.addList('Keep');
    service.deleteList('nonexistent');
    expect(service.getAll()).toHaveLength(1);
  });

  // ── updateListName() ───────────────────────────────────────────────────

  it('updateListName should rename the list', () => {
    const lista = service.addList('Old Name');
    service.updateListName(lista.id, 'New Name');
    expect(service.getById(lista.id)?.nombre).toBe('New Name');
  });

  it('updateListName should not affect other lists', () => {
    vi.useFakeTimers();
    service.addList('L1');
    vi.advanceTimersByTime(1);
    service.addList('L2');
    vi.useRealTimers();
    const l1 = service.getAll().find(l => l.nombre === 'L1')!;
    const l2 = service.getAll().find(l => l.nombre === 'L2')!;
    service.updateListName(l1.id, 'L1 Updated');
    expect(service.getAll().find(l => l.nombre === 'L2')).toBeTruthy();
    expect(service.getById(l2.id)?.nombre).toBe('L2');
  });

  // ── updateListPrivacy() ────────────────────────────────────────────────

  it('updateListPrivacy should toggle privacy', () => {
    const lista = service.addList('Public');
    service.updateListPrivacy(lista.id, true);
    expect(service.getById(lista.id)?.isPrivate).toBe(true);
    service.updateListPrivacy(lista.id, false);
    expect(service.getById(lista.id)?.isPrivate).toBe(false);
  });

  // ── assignUnownedListsToCurrentUser() ─────────────────────────────────

  it('assignUnownedListsToCurrentUser should assign owner to unowned lists', () => {
    service.addList('Orphan');
    service.addList('Orphan2');
    const listas = service.getAll().map(l => ({ ...l, owner: null as any }));
    localStorage.setItem('lunaris_lists', JSON.stringify(listas));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    fresh.assignUnownedListsToCurrentUser('owner1');
    expect(fresh.getByOwner('owner1')).toHaveLength(2);
  });

  it('assignUnownedListsToCurrentUser with empty username does nothing', () => {
    service.addList('List');
    service.assignUnownedListsToCurrentUser('');
    expect(service.getAll()[0].owner).toBeFalsy();
  });

  it('assignUnownedListsToCurrentUser should not overwrite existing owners', () => {
    const lista = service.addList('Owned');
    const listas = service.getAll().map(l => ({ ...l, owner: 'existing' }));
    localStorage.setItem('lunaris_lists', JSON.stringify(listas));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    fresh.assignUnownedListsToCurrentUser('new-owner');
    expect(fresh.getById(lista.id)?.owner).toBe('existing');
  });

  // ── getCurrentUser() ───────────────────────────────────────────────────

  it('getCurrentUser returns from localStorage', () => {
    localStorage.setItem('lunaris_current_user', 'carl');
    expect(service.getCurrentUser()).toBe('carl');
  });

  it('getCurrentUser returns from sessionStorage', () => {
    sessionStorage.setItem('lunaris_current_user', 'diana');
    expect(service.getCurrentUser()).toBe('diana');
  });

  it('getCurrentUser returns null when not set', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  // ── getById() ─────────────────────────────────────────────────────────

  it('getById returns correct list', () => {
    const lista = service.addList('Find Me');
    expect(service.getById(lista.id)?.nombre).toBe('Find Me');
  });

  it('getById returns undefined for unknown id', () => {
    expect(service.getById('unknown')).toBeUndefined();
  });

  // ── isProfileListName() ────────────────────────────────────────────────

  it('isProfileListName returns true for "Leyendo"', () => {
    expect(service.isProfileListName('Leyendo')).toBe(true);
  });

  it('isProfileListName returns true for "Leído" with accent', () => {
    expect(service.isProfileListName('Leído')).toBe(true);
  });

  it('isProfileListName returns true for "Plan para leer"', () => {
    expect(service.isProfileListName('Plan para leer')).toBe(true);
  });

  it('isProfileListName returns false for custom list names', () => {
    expect(service.isProfileListName('My Favorites')).toBe(false);
  });

  it('isProfileListName returns false for null/undefined', () => {
    expect(service.isProfileListName(null)).toBe(false);
    expect(service.isProfileListName(undefined)).toBe(false);
  });

  // ── getByOwner() ───────────────────────────────────────────────────────

  it('getByOwner returns lists for given owner', () => {
    const listas: ListaItem[] = [
      { id: '1', nombre: 'A', libros: [], owner: 'alice' },
      { id: '2', nombre: 'B', libros: [], owner: 'bob' },
    ];
    localStorage.setItem('lunaris_lists', JSON.stringify(listas));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getByOwner('alice')).toHaveLength(1);
    expect(fresh.getByOwner('alice')[0].nombre).toBe('A');
  });

  it('getByOwner returns empty for null', () => {
    service.addList('Any');
    expect(service.getByOwner(null)).toEqual([]);
  });

  // ── Favorites ─────────────────────────────────────────────────────────

  it('toggleFavorite should add a list to favorites', () => {
    const lista = service.addList('Fav');
    const result = service.toggleFavorite(lista.id, 'user1');
    expect(result).toBe(true);
    expect(service.isFavorited(lista.id, 'user1')).toBe(true);
  });

  it('toggleFavorite should remove a list from favorites', () => {
    const lista = service.addList('Fav');
    service.toggleFavorite(lista.id, 'user1');
    service.toggleFavorite(lista.id, 'user1');
    expect(service.isFavorited(lista.id, 'user1')).toBe(false);
  });

  it('toggleFavorite returns false when user is null and no current user', () => {
    const lista = service.addList('Fav');
    const result = service.toggleFavorite(lista.id, null);
    expect(result).toBe(false);
  });

  it('toggleFavorite uses getCurrentUser when forUser not provided', () => {
    localStorage.setItem('lunaris_current_user', 'autouser');
    const lista = service.addList('Fav');
    service.toggleFavorite(lista.id);
    expect(service.isFavorited(lista.id, 'autouser')).toBe(true);
  });

  it('isFavorited returns false for unrecognized user', () => {
    const lista = service.addList('X');
    expect(service.isFavorited(lista.id, 'unknown')).toBe(false);
  });

  it('isFavorited returns false when user is null and no current user', () => {
    const lista = service.addList('Y');
    expect(service.isFavorited(lista.id, null)).toBe(false);
  });

  it('getFavoritesForUser returns empty for null', () => {
    expect(service.getFavoritesForUser(null)).toEqual([]);
  });

  it('getFavoritesForUser returns ids after toggling', () => {
    const lista = service.addList('Fav');
    service.toggleFavorite(lista.id, 'tester');
    expect(service.getFavoritesForUser('tester')).toContain(lista.id);
  });

  it('getFavoriteListsForUser returns lists marked as favorites', () => {
    const lista = service.addList('Liked');
    service.toggleFavorite(lista.id, 'user2');
    const result = service.getFavoriteListsForUser('user2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(lista.id);
  });

  it('getFavoriteListsForUser returns empty for null', () => {
    expect(service.getFavoriteListsForUser(null)).toEqual([]);
  });

  it('getFavoritesForUser loads from localStorage', () => {
    const fakeFavs = { charlie: ['list-id-1'] };
    localStorage.setItem('lunaris_favorites', JSON.stringify(fakeFavs));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getFavoritesForUser('charlie')).toContain('list-id-1');
  });

  it('loadFavoritesMap handles broken JSON', () => {
    localStorage.setItem('lunaris_favorites', 'bad{json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getFavoritesForUser('whoever')).toEqual([]);
  });

  // ── ensureProfileSections() ────────────────────────────────────────────

  it('ensureProfileSections creates missing profile lists for user', () => {
    service.ensureProfileSections('profile-user');
    const owned = service.getByOwner('profile-user');
    const names = owned.map(l => l.nombre);
    expect(names).toContain('Leyendo');
    expect(names).toContain('Leído');
    expect(names).toContain('Plan para leer');
  });

  it('ensureProfileSections does nothing for null username', () => {
    service.ensureProfileSections(null);
    expect(service.getAll()).toHaveLength(0);
  });

  it('ensureProfileSections does not duplicate existing sections', () => {
    service.ensureProfileSections('user3');
    service.ensureProfileSections('user3');
    const existing = service.getByOwner('user3');
    const leyendo = existing.filter(l => l.nombre === 'Leyendo');
    expect(leyendo).toHaveLength(1);
  });

  // ── addBookToList() ────────────────────────────────────────────────────

  it('addBookToList should add a book to the list', () => {
    const lista = service.addList('Reading List');
    const book = makeBook('/works/OL27479W', 'Dune');
    service.addBookToList(lista.id, book);
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  it('addBookToList should not add duplicate by key', () => {
    const lista = service.addList('NoDup');
    const book = makeBook('/works/OL001', 'Book A');
    service.addBookToList(lista.id, book);
    service.addBookToList(lista.id, book);
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  it('addBookToList should not add duplicate by title', () => {
    const lista = service.addList('NoDup2');
    const b1 = makeBook('', 'Same Title');
    const b2 = makeBook('', 'Same Title');
    service.addBookToList(lista.id, b1);
    service.addBookToList(lista.id, b2);
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  it('addBookToList does nothing for non-existent list', () => {
    service.addBookToList('nonexistent-id', makeBook('k', 'T'));
    expect(service.getAll()).toHaveLength(0);
  });

  // ── removeBookFromList() ───────────────────────────────────────────────

  it('removeBookFromList should remove book by key', () => {
    const lista = service.addList('Remove Book');
    const book = makeBook('/works/OL999', 'Remove Me');
    service.addBookToList(lista.id, book);
    service.removeBookFromList(lista.id, { key: '/works/OL999' });
    expect(service.getById(lista.id)?.libros).toHaveLength(0);
  });

  it('removeBookFromList should remove book by title when no key', () => {
    const lista = service.addList('Remove ByTitle');
    const book = makeBook('', 'Title To Remove');
    service.addBookToList(lista.id, book);
    service.removeBookFromList(lista.id, { title: 'Title To Remove' });
    expect(service.getById(lista.id)?.libros).toHaveLength(0);
  });

  it('removeBookFromList keeps other books intact', () => {
    const lista = service.addList('Mix');
    const b1 = makeBook('/k1', 'Alpha');
    const b2 = makeBook('/k2', 'Beta');
    service.addBookToList(lista.id, b1);
    service.addBookToList(lista.id, b2);
    service.removeBookFromList(lista.id, { key: '/k1' });
    const libros = service.getById(lista.id)?.libros;
    expect(libros).toHaveLength(1);
    expect(libros![0].title).toBe('Beta');
  });

  it('removeBookFromList with no key or title keeps all books', () => {
    const lista = service.addList('NoMatch');
    const book = makeBook('/k1', 'Book');
    service.addBookToList(lista.id, book);
    service.removeBookFromList(lista.id, {});
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  // ── listas$ observable ─────────────────────────────────────────────────

  it('listas$ should emit on addList', () => {
    const emissions: ListaItem[][] = [];
    service.listas$.subscribe(l => emissions.push([...l]));
    service.addList('New');
    expect(emissions.length).toBeGreaterThanOrEqual(2);
    expect(emissions[emissions.length - 1]).toHaveLength(1);
  });
});
