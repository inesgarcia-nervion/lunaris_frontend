import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListasService, ListaItem } from '../../../app/domain/services/listas.service';
import { OpenLibraryBook } from '../../../app/domain/services/book-search.service';

/**
 * Helper para crear libros de prueba con solo key y title
 * @param key 
 * @param title  
 * @returns Un objeto OpenLibraryBook con authorNames vacío
 */
function makeBook(key: string, title: string): OpenLibraryBook {
  return { key, title, authorNames: [] };
}

/**
 * Tests unitarios para ListasService. Cubre la mayoría de los métodos públicos y casos de borde.
 * Utiliza TestBed para configurar el servicio y limpiar localStorage/sessionStorage antes y después de cada test.
 * Verifica la persistencia en localStorage, manejo de usuarios, favoritos, y manipulación de libros en las listas.
 */
describe('ListasService', () => {
  let service: ListasService;

  /**
   * Función auxiliar para configurar el TestBed e inyectar el servicio antes de cada test. 
   */
  function createService(): void {
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListasService);
  }

  /**
   * Limpia localStorage y sessionStorage antes de cada test y crea una nueva instancia del servicio.
   */
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    createService();
  });

  /**
   * Limpia localStorage y sessionStorage después de cada test.
   */
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  /**
   * Verifica que el servicio se crea correctamente.
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Verifica que se carga una lista vacía desde un localStorage vacío.
   */
  it('should load empty list from empty localStorage', () => {
    expect(service.getAll()).toEqual([]);
  });

  /**
   * Verifica que se cargan las listas desde localStorage al inicializar el servicio.
   */
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

  /**
   * Verifica que el servicio maneja JSON roto en localStorage de manera segura.
   */
  it('should handle broken localStorage JSON gracefully', () => {
    localStorage.setItem('lunaris_lists', 'invalid-json{');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getAll()).toEqual([]);
  });


  /**
   * Verifica que addList crea una lista con un id único.
   */
  it('addList should create a list with unique id', () => {
    localStorage.setItem('lunaris_current_user', 'bob');
    const lista = service.addList('Favorites');
    expect(lista.nombre).toBe('Favorites');
    expect(lista.id).toBeTruthy();
    expect(lista.libros).toEqual([]);
    expect(lista.owner).toBe('bob');
    expect(lista.isPrivate).toBe(false);
  });

  /**
   * Verifica que addList con isPrivate=true crea una lista privada.
   */
  it('addList with isPrivate=true should create private list', () => {
    const lista = service.addList('Private', true);
    expect(lista.isPrivate).toBe(true);
  });

  /**
   * Verifica que addList agrega la nueva lista al inicio de la lista existente.
   */
  it('addList should prepend to existing lists', () => {
    service.addList('First');
    const second = service.addList('Second');
    expect(service.getAll()[0].id).toBe(second.id);
  });

  /**
   * Verifica que addList persiste la lista en localStorage.
   */
  it('addList should persist to localStorage', () => {
    service.addList('Persisted');
    const stored = JSON.parse(localStorage.getItem('lunaris_lists')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].nombre).toBe('Persisted');
  });

  /**
   * Verifica que deleteList elimina una lista por su id.
   */
  it('deleteList should remove list by id', () => {
    const lista = service.addList('Remove Me');
    service.deleteList(lista.id);
    expect(service.getAll()).toHaveLength(0);
    const stored = JSON.parse(localStorage.getItem('lunaris_lists')!);
    expect(stored).toHaveLength(0);
  });

  /**
   * Verifica que deleteList con un id inexistente no falla.
   */
  it('deleteList with non-existent id should not fail', () => {
    service.addList('Keep');
    service.deleteList('nonexistent');
    expect(service.getAll()).toHaveLength(1);
  });

  /**
   * Verifica que updateListName renombra la lista.
   */
  it('updateListName should rename the list', () => {
    const lista = service.addList('Old Name');
    service.updateListName(lista.id, 'New Name');
    expect(service.getById(lista.id)?.nombre).toBe('New Name');
  });

  /**
   * Verifica que updateListName no afecta a otras listas.
   */
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

  /**
   * Verifica que updateListPrivacy cambia la privacidad de la lista.
   */
  it('updateListPrivacy should toggle privacy', () => {
    const lista = service.addList('Public');
    service.updateListPrivacy(lista.id, true);
    expect(service.getById(lista.id)?.isPrivate).toBe(true);
    service.updateListPrivacy(lista.id, false);
    expect(service.getById(lista.id)?.isPrivate).toBe(false);
  });

  /**
   * Verifica que assignUnownedListsToCurrentUser asigna un propietario a las listas sin propietario.
   */
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

  /**
   * Verifica que assignUnownedListsToCurrentUser con un nombre de usuario vacío no hace nada.
   */
  it('assignUnownedListsToCurrentUser with empty username does nothing', () => {
    service.addList('List');
    service.assignUnownedListsToCurrentUser('');
    expect(service.getAll()[0].owner).toBeFalsy();
  });

  /**
   * Verifica que assignUnownedListsToCurrentUser no sobrescribe propietarios existentes.
   */
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

  /**
   * Verifica que getCurrentUser devuelve el usuario actual desde localStorage.
   */
  it('getCurrentUser returns from localStorage', () => {
    localStorage.setItem('lunaris_current_user', 'carl');
    expect(service.getCurrentUser()).toBe('carl');
  });

  /**
   * Verifica que getCurrentUser devuelve el usuario actual desde sessionStorage.
   */
  it('getCurrentUser returns from sessionStorage', () => {
    sessionStorage.setItem('lunaris_current_user', 'diana');
    expect(service.getCurrentUser()).toBe('diana');
  });

  /**
   * Verifica que getCurrentUser devuelve null cuando no hay usuario establecido.
   */
  it('getCurrentUser returns null when not set', () => {
    expect(service.getCurrentUser()).toBeNull();
  });

  /**
   * Verifica que getById devuelve la lista correcta.
   */
  it('getById returns correct list', () => {
    const lista = service.addList('Find Me');
    expect(service.getById(lista.id)?.nombre).toBe('Find Me');
  });

  /**
   * Verifica que getById devuelve undefined para un id desconocido.
   */
  it('getById returns undefined for unknown id', () => {
    expect(service.getById('unknown')).toBeUndefined();
  });

  /**
   * Verifica que isProfileListName devuelve true para nombres de listas de perfil.
   */
  it('isProfileListName returns true for "Leyendo"', () => {
    expect(service.isProfileListName('Leyendo')).toBe(true);
  });

  /**
   * Verifica que isProfileListName devuelve true para nombres de listas de perfil con acento.
   */
  it('isProfileListName returns true for "Leído" with accent', () => {
    expect(service.isProfileListName('Leído')).toBe(true);
  });

  /**
   * Verifica que isProfileListName devuelve true para "Plan para leer".
   */
  it('isProfileListName returns true for "Plan para leer"', () => {
    expect(service.isProfileListName('Plan para leer')).toBe(true);
  });

  /**
   * Verifica que isProfileListName devuelve false para nombres de listas personalizadas.
   */
  it('isProfileListName returns false for custom list names', () => {
    expect(service.isProfileListName('My Favorites')).toBe(false);
  });

  /**
   * Verifica que isProfileListName devuelve false para null o undefined.
   */
  it('isProfileListName returns false for null/undefined', () => {
    expect(service.isProfileListName(null)).toBe(false);
    expect(service.isProfileListName(undefined)).toBe(false);
  });

  /**
   * Verifica que getByOwner devuelve las listas para un propietario dado.
   */
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

  /**
   * Verifica que getByOwner devuelve un array vacío cuando el propietario es null.
   */
  it('getByOwner returns empty for null', () => {
    service.addList('Any');
    expect(service.getByOwner(null)).toEqual([]);
  });

  /**
   * Verifica que toggleFavorite agrega una lista a los favoritos.
   */
  it('toggleFavorite should add a list to favorites', () => {
    const lista = service.addList('Fav');
    const result = service.toggleFavorite(lista.id, 'user1');
    expect(result).toBe(true);
    expect(service.isFavorited(lista.id, 'user1')).toBe(true);
  });

  /**
   * Verifica que toggleFavorite elimina una lista de los favoritos.
   */
  it('toggleFavorite should remove a list from favorites', () => {
    const lista = service.addList('Fav');
    service.toggleFavorite(lista.id, 'user1');
    service.toggleFavorite(lista.id, 'user1');
    expect(service.isFavorited(lista.id, 'user1')).toBe(false);
  });

  /**
   * Verifica que toggleFavorite devuelve false cuando el usuario es null y no hay usuario actual.
   */
  it('toggleFavorite returns false when user is null and no current user', () => {
    const lista = service.addList('Fav');
    const result = service.toggleFavorite(lista.id, null);
    expect(result).toBe(false);
  });

  /**
   * Verifica que toggleFavorite utiliza getCurrentUser cuando no se proporciona forUser.
   */
  it('toggleFavorite uses getCurrentUser when forUser not provided', () => {
    localStorage.setItem('lunaris_current_user', 'autouser');
    const lista = service.addList('Fav');
    service.toggleFavorite(lista.id);
    expect(service.isFavorited(lista.id, 'autouser')).toBe(true);
  });

  /**
   * Verifica que isFavorited devuelve false para un usuario no reconocido.
   */
  it('isFavorited returns false for unrecognized user', () => {
    const lista = service.addList('X');
    expect(service.isFavorited(lista.id, 'unknown')).toBe(false);
  });

  /**
   * Verifica que isFavorited devuelve false cuando el usuario es null y no hay usuario actual.
   */
  it('isFavorited returns false when user is null and no current user', () => {
    const lista = service.addList('Y');
    expect(service.isFavorited(lista.id, null)).toBe(false);
  });

  /**
   * Verifica que getFavoritesForUser devuelve un array vacío cuando el usuario es null.
   */
  it('getFavoritesForUser returns empty for null', () => {
    expect(service.getFavoritesForUser(null)).toEqual([]);
  });

  /**
   * Verifica que getFavoritesForUser devuelve los IDs después de alternar favoritos.
   */
  it('getFavoritesForUser returns ids after toggling', () => {
    const lista = service.addList('Fav');
    service.toggleFavorite(lista.id, 'tester');
    expect(service.getFavoritesForUser('tester')).toContain(lista.id);
  });

  /**
   * Verifica que getFavoriteListsForUser devuelve las listas marcadas como favoritas.
   */
  it('getFavoriteListsForUser returns lists marked as favorites', () => {
    const lista = service.addList('Liked');
    service.toggleFavorite(lista.id, 'user2');
    const result = service.getFavoriteListsForUser('user2');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(lista.id);
  });

  /**
   * Verifica que getFavoriteListsForUser devuelve un array vacío cuando el usuario es null.
   */
  it('getFavoriteListsForUser returns empty for null', () => {
    expect(service.getFavoriteListsForUser(null)).toEqual([]);
  });

  /**
   * Verifica que getFavoritesForUser carga los favoritos desde localStorage.
   */
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

  /**
   * Verifica que loadFavoritesMap maneja JSON roto.
   */
  it('loadFavoritesMap handles broken JSON', () => {
    localStorage.setItem('lunaris_favorites', 'bad{json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ListasService, provideHttpClient(), provideHttpClientTesting()],
    });
    const fresh = TestBed.inject(ListasService);
    expect(fresh.getFavoritesForUser('whoever')).toEqual([]);
  });

  /**
   * Verifica que ensureProfileSections crea listas de perfil faltantes para el usuario.
   */
  it('ensureProfileSections creates missing profile lists for user', () => {
    service.ensureProfileSections('profile-user');
    const owned = service.getByOwner('profile-user');
    const names = owned.map(l => l.nombre);
    expect(names).toContain('Leyendo');
    expect(names).toContain('Leído');
    expect(names).toContain('Plan para leer');
  });

  /**
   * Verifica que ensureProfileSections no hace nada cuando el nombre de usuario es null.
   */
  it('ensureProfileSections does nothing for null username', () => {
    service.ensureProfileSections(null);
    expect(service.getAll()).toHaveLength(0);
  });

  /**
   * Verifica que ensureProfileSections no duplica secciones existentes.
   */
  it('ensureProfileSections does not duplicate existing sections', () => {
    service.ensureProfileSections('user3');
    service.ensureProfileSections('user3');
    const existing = service.getByOwner('user3');
    const leyendo = existing.filter(l => l.nombre === 'Leyendo');
    expect(leyendo).toHaveLength(1);
  });

  /**
   * Verifica que addBookToList agrega un libro a la lista.
   */
  it('addBookToList should add a book to the list', () => {
    const lista = service.addList('Reading List');
    const book = makeBook('/works/OL27479W', 'Dune');
    service.addBookToList(lista.id, book);
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  /**
   * Verifica que addBookToList no agrega duplicados por clave.
   */
  it('addBookToList should not add duplicate by key', () => {
    const lista = service.addList('NoDup');
    const book = makeBook('/works/OL001', 'Book A');
    service.addBookToList(lista.id, book);
    service.addBookToList(lista.id, book);
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  /**
   * Verifica que addBookToList no agrega duplicados por título.
   */
  it('addBookToList should not add duplicate by title', () => {
    const lista = service.addList('NoDup2');
    const b1 = makeBook('', 'Same Title');
    const b2 = makeBook('', 'Same Title');
    service.addBookToList(lista.id, b1);
    service.addBookToList(lista.id, b2);
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  /**
   * Verifica que addBookToList no hace nada para listas inexistentes.
   */
  it('addBookToList does nothing for non-existent list', () => {
    service.addBookToList('nonexistent-id', makeBook('k', 'T'));
    expect(service.getAll()).toHaveLength(0);
  });

  /**
   * Verifica que removeBookFromList elimina un libro por clave.
   */
  it('removeBookFromList should remove book by key', () => {
    const lista = service.addList('Remove Book');
    const book = makeBook('/works/OL999', 'Remove Me');
    service.addBookToList(lista.id, book);
    service.removeBookFromList(lista.id, { key: '/works/OL999' });
    expect(service.getById(lista.id)?.libros).toHaveLength(0);
  });

  /**
   * Verifica que removeBookFromList elimina un libro por título cuando no hay clave.
   */
  it('removeBookFromList should remove book by title when no key', () => {
    const lista = service.addList('Remove ByTitle');
    const book = makeBook('', 'Title To Remove');
    service.addBookToList(lista.id, book);
    service.removeBookFromList(lista.id, { title: 'Title To Remove' });
    expect(service.getById(lista.id)?.libros).toHaveLength(0);
  });

  /**
   * Verifica que removeBookFromList mantiene otros libros intactos.
   */
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

  /**
   * Verifica que removeBookFromList no hace nada cuando no se proporciona clave ni título.
   */
  it('removeBookFromList with no key or title keeps all books', () => {
    const lista = service.addList('NoMatch');
    const book = makeBook('/k1', 'Book');
    service.addBookToList(lista.id, book);
    service.removeBookFromList(lista.id, {});
    expect(service.getById(lista.id)?.libros).toHaveLength(1);
  });

  /**
   * Verifica que listas$ emite cuando se agrega una lista.
   */
  it('listas$ should emit on addList', () => {
    const emissions: ListaItem[][] = [];
    service.listas$.subscribe(l => emissions.push([...l]));
    service.addList('New');
    expect(emissions.length).toBeGreaterThanOrEqual(2);
    expect(emissions[emissions.length - 1]).toHaveLength(1);
  });
});
