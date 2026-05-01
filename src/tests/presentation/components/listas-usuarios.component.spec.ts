import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ListasUsuariosComponent } from '../../../app/presentation/components/listas-usuarios/listas-usuarios.component';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { ListasService } from '../../../app/domain/services/listas.service';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

/**
 * Pruebas para ListasUsuariosComponent.
 */
describe('ListasUsuariosComponent', () => {
  let component: ListasUsuariosComponent;
  let fixture: ComponentFixture<ListasUsuariosComponent>;
  let bookSearchMock: any;
  let authMock: any;
  let listasMock: any;
  let confirmMock: any;
  let routerSpy: any;
  let listasSubject: BehaviorSubject<any[]>;
  let favoritesSubject: BehaviorSubject<string[]>;

  /**
   * Datos de prueba para listas, incluyendo una lista de perfil "Leyendo" que no debería mostrarse en la vista de listas de usuario.
   */
  const mockListas = [
    { id: '1', nombre: 'Primera', owner: 'testuser', libros: [], isPrivate: false },
    { id: '2', nombre: 'Segunda', owner: 'testuser', libros: [], isPrivate: false },
    { id: '3', nombre: 'Leyendo', owner: 'testuser', libros: [], isPrivate: false }
  ];

  /**
   * Configuración común para las pruebas, con la posibilidad de inyectar diferentes listas para casos específicos.
   * @param listas Listas a usar para la prueba, por defecto se usan las mockListas definidas arriba.
   */
  function setup(listas = mockListas) {
    listasSubject = new BehaviorSubject<any[]>(listas);
    favoritesSubject = new BehaviorSubject<string[]>([]);

    listasMock = {
      listas$: listasSubject.asObservable(),
      favorites$: favoritesSubject.asObservable(),
      getAll: vi.fn().mockReturnValue(listas),
      getById: vi.fn().mockImplementation((id: string) => listas.find(l => l.id === id)),
      getCurrentUser: vi.fn().mockReturnValue('testuser'),
      isProfileListName: vi.fn().mockImplementation((name: string) =>
        ['leyendo', 'leído', 'leido', 'plan para leer'].includes((name || '').toLowerCase())
      ),
      updateListName: vi.fn(),
      updateListPrivacy: vi.fn(),
      deleteList: vi.fn(),
      addList: vi.fn().mockReturnValue({ id: 'new1', nombre: 'Nueva Lista', libros: [], owner: 'testuser' }),
      toggleFavorite: vi.fn(),
      isFavorited: vi.fn().mockReturnValue(false)
    };

    bookSearchMock = {
      getCoverUrl: vi.fn().mockReturnValue('/assets/cover.jpg'),
      getSearchQuery: vi.fn().mockReturnValue(''),
      setSelectedBook: vi.fn(),
      setSearchQuery: vi.fn(),
      setNavigationOrigin: vi.fn()
    };

    authMock = {
      isAdmin: vi.fn().mockReturnValue(false),
      getLocalAvatar: vi.fn().mockReturnValue(null)
    };

    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };

    routerSpy = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [ListasUsuariosComponent],
      providers: [
        { provide: BookSearchService, useValue: bookSearchMock },
        { provide: AuthService, useValue: authMock },
        { provide: ListasService, useValue: listasMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: Router, useValue: routerSpy }
      ]
    });

    fixture = TestBed.createComponent(ListasUsuariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /**
   * Limpieza después de cada prueba.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para ngOnInit().
   */
  describe('ngOnInit', () => {
    it('should load and filter listas from service', () => {
      setup();

      expect(component.listas.some((l: any) => l.nombre === 'Leyendo')).toBe(false);
      expect(component.listas.some((l: any) => l.nombre === 'Primera')).toBe(true);
    });

    it('should set currentUser from listasService', () => {
      setup();

      expect(component.currentUser).toBe('testuser');
    });

    it('should update listas when listas$ emits', () => {
      setup();
      const newListas = [{ id: '5', nombre: 'Nueva', owner: 'testuser', libros: [], isPrivate: false }];

      listasSubject.next(newListas);

      expect(component.listas).toHaveLength(1);
    });

    it('should filter out private lists for non-admin', () => {
      const listasWithPrivate = [
        { id: '1', nombre: 'Pública', owner: 'testuser', libros: [], isPrivate: false },
        { id: '2', nombre: 'Privada', owner: 'testuser', libros: [], isPrivate: true }
      ];
      setup(listasWithPrivate);

      expect(component.listas.some((l: any) => l.nombre === 'Privada')).toBe(false);
    });

    it('should show private lists for admin', () => {
      const listasWithPrivate = [
        { id: '1', nombre: 'Pública', owner: 'testuser', libros: [], isPrivate: false },
        { id: '2', nombre: 'Privada', owner: 'testuser', libros: [], isPrivate: true }
      ];
      setup(listasWithPrivate);
      authMock.isAdmin.mockReturnValue(true);
      listasSubject.next(listasWithPrivate);

      expect(component.listas.some((l: any) => l.nombre === 'Privada')).toBe(true);
    });
  });

  /**
   * Pruebas para editList().
   */
  describe('editList()', () => {
    it('should prompt for new name and call updateListName', () => {
      setup();
      vi.spyOn(window, "prompt").mockReturnValue('Nuevo Nombre');

      component.editList('1');

      expect(listasMock.updateListName).toHaveBeenCalledWith('1', 'Nuevo Nombre');
    });

    it('should do nothing when prompt is cancelled', () => {
      setup();
      vi.spyOn(window, "prompt").mockReturnValue(null);

      component.editList('1');

      expect(listasMock.updateListName).not.toHaveBeenCalled();
    });

    it('should do nothing when list is not found', () => {
      setup();
      listasMock.getById.mockReturnValue(undefined);

      component.editList('nonexistent');

      expect(listasMock.updateListName).not.toHaveBeenCalled();
    });

    it('should do nothing when not owner', () => {
      setup();
      listasMock.getById.mockReturnValue({ id: '1', nombre: 'Test', owner: 'other' });

      component.editList('1');

      expect(listasMock.updateListName).not.toHaveBeenCalled();
    });

    it('should alert when list is profile list', () => {
      setup();
      listasMock.getById.mockReturnValue({ id: '3', nombre: 'Leyendo', owner: 'testuser' });
      listasMock.isProfileListName.mockReturnValue(true);
      vi.spyOn(window, "alert").mockImplementation(() => {});

      component.editList('3');

      expect(window.alert).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para deleteList().
   */
  describe('deleteList()', () => {
    it('should delete list when confirmed', async () => {
      setup();
      listasMock.getById.mockReturnValue({ id: '1', nombre: 'Primera', owner: 'testuser' });
      listasMock.isProfileListName.mockReturnValue(false);
      confirmMock.confirm.mockResolvedValue(true);

      await component.deleteList('1');

      expect(listasMock.deleteList).toHaveBeenCalledWith('1');
    });

    it('should not delete when cancelled', async () => {
      setup();
      listasMock.getById.mockReturnValue({ id: '1', nombre: 'Primera', owner: 'testuser' });
      listasMock.isProfileListName.mockReturnValue(false);
      confirmMock.confirm.mockResolvedValue(false);

      await component.deleteList('1');

      expect(listasMock.deleteList).not.toHaveBeenCalled();
    });

    it('should do nothing when list not found', async () => {
      setup();
      listasMock.getById.mockReturnValue(undefined);

      await component.deleteList('missing');

      expect(listasMock.deleteList).not.toHaveBeenCalled();
    });

    it('should alert and return for profile lists', async () => {
      setup();
      listasMock.getById.mockReturnValue({ id: '3', nombre: 'Leyendo', owner: 'testuser' });
      listasMock.isProfileListName.mockReturnValue(true);
      vi.spyOn(window, "alert").mockImplementation(() => {});

      await component.deleteList('3');

      expect(window.alert).toHaveBeenCalled();
      expect(listasMock.deleteList).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para onSearch().
   */
  describe('onSearch()', () => {
    it('should filter listas by search term', () => {
      setup();

      component.search = 'primera';
      component.onSearch();

      expect(component.filteredListas.every((l: any) => l.nombre.toLowerCase().includes('primera'))).toBe(true);
    });

    it('should reset to page 1 on search', () => {
      setup();
      component.currentPage = 3;

      component.search = 'test';
      component.onSearch();

      expect(component.currentPage).toBe(1);
    });

    it('should show all when search is cleared', () => {
      setup();
      component.search = '';
      component.onSearch();

      expect(component.filteredListas).toHaveLength(component.listas.length);
    });
  });

  /**
   * Pruebas para updatePagination().
   */
  describe('updatePagination()', () => {
    it('should slice filteredListas for paged display', () => {
      const manyListas = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`, nombre: `Lista ${i}`, owner: 'testuser', libros: [], isPrivate: false
      }));
      setup(manyListas);
      component.filteredListas = manyListas;
      component.currentPage = 2;

      component.updatePagination();

      expect(component.pagedListas).toHaveLength(8);
    });
  });

  /**
   * Pruebas para onPageChange().
   */
  describe('onPageChange()', () => {
    it('should update currentPage and call updatePagination', () => {
      setup();

      component.onPageChange(2);

      expect(component.currentPage).toBe(2);
    });
  });

  /**
   * Pruebas para crearLista().
   */
  describe('crearLista()', () => {
    it('should show create input', () => {
      setup();

      component.crearLista();

      expect(component.showCreateInput).toBe(true);
    });
  });

  /**
   * Pruebas para confirmCreate().
   */
  describe('confirmCreate()', () => {
    it('should create list and navigate to it', () => {
      setup();
      component.newListName = 'Mi Nueva Lista';

      component.confirmCreate();

      expect(listasMock.addList).toHaveBeenCalledWith('Mi Nueva Lista', false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listas', 'new1']);
    });

    it('should not create when name is empty', () => {
      setup();
      component.newListName = '   ';

      component.confirmCreate();

      expect(listasMock.addList).not.toHaveBeenCalled();
    });

    it('should set createError for duplicate name', () => {
      vi.useFakeTimers();
      setup();
      listasMock.getAll.mockReturnValue([
        { id: '1', nombre: 'Existente', owner: 'testuser', libros: [], isPrivate: false }
      ]);
      component.newListName = 'Existente';

      component.confirmCreate();

      expect(component.createError).toBeTruthy();
      vi.advanceTimersByTime(3001);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para cancelCreate().
   */
  describe('cancelCreate()', () => {
    it('should hide create input and clear state', () => {
      setup();
      component.showCreateInput = true;
      component.newListName = 'Test';

      component.cancelCreate();

      expect(component.showCreateInput).toBe(false);
      expect(component.newListName).toBe('');
    });
  });

  /**
   * Pruebas para getCoverForTemplate().
   */
  describe('getCoverForTemplate()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      const book = { title: 'Test', key: '/works/OL1W' };

      const result = component.getCoverForTemplate(book);

      expect(bookSearchMock.getCoverUrl).toHaveBeenCalledWith(book);
      expect(result).toBe('/assets/cover.jpg');
    });
  });

  /**
   * Pruebas para getOwnerAvatar().
   */
  describe('getOwnerAvatar()', () => {
    it('should return avatar from auth service', () => {
      setup();
      authMock.getLocalAvatar.mockReturnValue('https://avatar.url/pic.jpg');

      const result = component.getOwnerAvatar('testuser');

      expect(result).toBe('https://avatar.url/pic.jpg');
    });

    it('should return null when no avatar', () => {
      setup();

      const result = component.getOwnerAvatar('noavatar');

      expect(result).toBeNull();
    });
  });

  /**
   * Pruebas para getTitleForTemplate().
   */
  describe('getTitleForTemplate()', () => {
    it('should return title from book object', () => {
      setup();

      const result = component.getTitleForTemplate({ title: 'Dune' });

      expect(result).toBe('Dune');
    });

    it('should return empty string on error', () => {
      setup();

      const result = component.getTitleForTemplate(null);

      expect(result).toBe('');
    });
  });

  /**
   * Pruebas para openBookDetailFromList().
   */
  describe('openBookDetailFromList()', () => {
    it('should set selected book and navigate to /menu', () => {
      setup();
      const book = { title: 'Dune', key: '/works/OL1W' };

      component.openBookDetailFromList(book);

      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(book);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
    });

    it('should do nothing when book is falsy', () => {
      setup();

      component.openBookDetailFromList(null);

      expect(bookSearchMock.setSelectedBook).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para openListFromListas().
   */
  describe('openListFromListas()', () => {
    it('should set navigation origin and navigate to list', () => {
      setup();

      component.openListFromListas('list1');

      expect(bookSearchMock.setNavigationOrigin).toHaveBeenCalledWith({ type: 'listas' });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listas', 'list1']);
    });
  });

  /**
   * Pruebas para isFavorited().
   */
  describe('isFavorited()', () => {
    it('should delegate to listasService', () => {
      setup();
      listasMock.isFavorited.mockReturnValue(true);

      expect(component.isFavorited('list1')).toBe(true);
    });

    it('should return false when service throws', () => {
      setup();
      listasMock.isFavorited.mockImplementation(() => { throw new Error(); });

      expect(component.isFavorited('list1')).toBe(false);
    });
  });

  /**
   * Pruebas para toggleFavorite().
   */
  describe('toggleFavorite()', () => {
    it('should call listasService.toggleFavorite', () => {
      setup();

      component.toggleFavorite('list1');

      expect(listasMock.toggleFavorite).toHaveBeenCalledWith('list1');
    });

    it('should stop event propagation when event is provided', () => {
      setup();
      const event = { stopPropagation: vi.fn() } as any;

      component.toggleFavorite('list1', event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});
