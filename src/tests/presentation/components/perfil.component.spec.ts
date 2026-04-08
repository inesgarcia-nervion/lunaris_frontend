import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PerfilComponent } from '../../../app/presentation/components/perfil/perfil.component';
import { ListasService } from '../../../app/domain/services/listas.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

describe('PerfilComponent', () => {
  let component: PerfilComponent;
  let fixture: ComponentFixture<PerfilComponent>;
  let listasMock: any;
  let authMock: any;
  let bookSearchMock: any;
  let routerSpy: any;
  let listasSubject: BehaviorSubject<any[]>;
  let favoritesSubject: BehaviorSubject<string[]>;
  let avatarSubject: BehaviorSubject<string | null>;

  const mockListas = [
    { id: 'ley1', nombre: 'Leyendo', libros: [{ title: 'A' }, { title: 'B' }], owner: 'testuser' },
    { id: 'lei1', nombre: 'Leído', libros: [{ title: 'C' }], owner: 'testuser' },
    { id: 'plan1', nombre: 'Plan para leer', libros: [], owner: 'testuser' },
    { id: 'custom1', nombre: 'Ciencia Ficción', libros: [], owner: 'testuser' }
  ];

  function setup(listas = mockListas) {
    listasSubject = new BehaviorSubject<any[]>(listas);
    favoritesSubject = new BehaviorSubject<string[]>([]);
    avatarSubject = new BehaviorSubject<string | null>(null);

    listasMock = {
      listas$: listasSubject.asObservable(),
      favorites$: favoritesSubject.asObservable(),
      getByOwner: vi.fn().mockReturnValue(listas),
      getFavoriteListsForUser: vi.fn().mockReturnValue([]),
      ensureProfileSections: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorited: vi.fn().mockReturnValue(false)
    };

    authMock = {
      getCurrentUsername: vi.fn().mockReturnValue('testuser'),
      isAdmin: vi.fn().mockReturnValue(false),
      getLocalAvatar: vi.fn().mockReturnValue(null),
      setLocalAvatar: vi.fn(),
      avatar$: avatarSubject.asObservable()
    };

    bookSearchMock = {
      getCoverUrl: vi.fn().mockReturnValue('/assets/cover.jpg'),
      setNavigationOrigin: vi.fn()
    };

    routerSpy = {
      navigateByUrl: vi.fn(),
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        { provide: ListasService, useValue: listasMock },
        { provide: AuthService, useValue: authMock },
        { provide: BookSearchService, useValue: bookSearchMock },
        { provide: Router, useValue: routerSpy }
      ]
    });

    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  describe('ngOnInit', () => {
    it('should load username from auth service', () => {
      setup();

      expect(component.username).toBe('testuser');
    });

    it('should load isAdmin from auth service', () => {
      setup();

      expect(component.isAdmin).toBe(false);
    });

    it('should call ensureProfileSections', () => {
      setup();

      expect(listasMock.ensureProfileSections).toHaveBeenCalledWith('testuser');
    });

    it('should update avatar when avatar$ emits', () => {
      setup();

      avatarSubject.next('https://new.avatar/img.jpg');

      expect(component.avatar).toBe('https://new.avatar/img.jpg');
    });

    it('should reload lists when listas$ emits', () => {
      setup();
      listasMock.getByOwner.mockClear();

      listasSubject.next(mockListas);

      expect(listasMock.getByOwner).toHaveBeenCalled();
    });

    it('should reload lists when favorites$ emits', () => {
      setup();
      listasMock.getByOwner.mockClear();

      favoritesSubject.next(['ley1']);

      expect(listasMock.getByOwner).toHaveBeenCalled();
    });
  });

  describe('loadLists()', () => {
    it('should separate Leyendo section correctly', () => {
      setup();

      expect(component.leyendo).toHaveLength(2);
      expect(component.leyendoId).toBe('ley1');
    });

    it('should separate Leído section correctly', () => {
      setup();

      expect(component.leido).toHaveLength(1);
      expect(component.leidoId).toBe('lei1');
    });

    it('should handle empty Plan para leer section', () => {
      setup();

      expect(component.planParaLeer).toHaveLength(0);
      expect(component.planParaLeerId).toBe('plan1');
    });

    it('should set userLists excluding profile sections', () => {
      setup();

      expect(component.userLists.every((l: any) =>
        !['Leyendo', 'Leído', 'Plan para leer'].includes(l.nombre)
      )).toBe(true);
    });

    it('should reset pages to 1 on reload', () => {
      setup();
      component.leyendoPage = 3;
      component.leidoPage = 2;

      component.loadLists();

      expect(component.leyendoPage).toBe(1);
      expect(component.leidoPage).toBe(1);
    });

    it('should load favoriteLists from other owners', () => {
      setup();
      listasMock.getFavoriteListsForUser.mockReturnValue([
        { id: 'ext1', nombre: 'External List', libros: [], owner: 'otherUser' }
      ]);

      component.loadLists();

      expect(component.favoriteLists).toHaveLength(1);
    });

    it('should exclude self-owned lists from favoriteLists', () => {
      setup();
      listasMock.getFavoriteListsForUser.mockReturnValue([
        { id: '1', nombre: 'My Fav', libros: [], owner: 'testuser' }
      ]);

      component.loadLists();

      expect(component.favoriteLists).toHaveLength(0);
    });

    it('should handle missing sections gracefully', () => {
      setup([]);

      expect(component.leyendo).toHaveLength(0);
      expect(component.leido).toHaveLength(0);
      expect(component.planParaLeer).toHaveLength(0);
    });
  });

  describe('Leyendo pagination', () => {
    it('updatePaginationLeyendo should slice by pageSize', () => {
      setup();
      component.leyendo = Array.from({ length: 10 }, (_, i) => ({ title: `B${i}` }));
      component.leyendoPage = 2;

      component.updatePaginationLeyendo();

      expect(component.pagedLeyendo).toHaveLength(4);
    });

    it('onLeyendoPageChange should update page and refresh', () => {
      setup();

      component.onLeyendoPageChange(2);

      expect(component.leyendoPage).toBe(2);
    });
  });

  describe('Leído pagination', () => {
    it('updatePaginationLeido should slice by pageSize', () => {
      setup();
      component.leido = Array.from({ length: 10 }, (_, i) => ({ title: `B${i}` }));
      component.leidoPage = 2;

      component.updatePaginationLeido();

      expect(component.pagedLeido).toHaveLength(4);
    });

    it('onLeidoPageChange should update page and refresh', () => {
      setup();

      component.onLeidoPageChange(3);

      expect(component.leidoPage).toBe(3);
    });
  });

  describe('Plan para leer pagination', () => {
    it('updatePaginationPlan should slice by pageSize', () => {
      setup();
      component.planParaLeer = Array.from({ length: 10 }, (_, i) => ({ title: `B${i}` }));
      component.planParaLeerPage = 2;

      component.updatePaginationPlan();

      expect(component.pagedPlanParaLeer).toHaveLength(4);
    });

    it('onPlanParaLeerPageChange should update page and refresh', () => {
      setup();

      component.onPlanParaLeerPageChange(2);

      expect(component.planParaLeerPage).toBe(2);
    });
  });

  describe('User lists pagination', () => {
    it('updatePagedUserLists should slice by userListsPageSize', () => {
      setup();
      component.userLists = Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, nombre: `List ${i}`, libros: [] } as any));
      component.userListsPage = 2;

      component.updatePagedUserLists();

      expect(component.pagedUserLists).toHaveLength(4);
    });

    it('onUserListsPageChange should update page', () => {
      setup();

      component.onUserListsPageChange(2);

      expect(component.userListsPage).toBe(2);
    });
  });

  describe('getCoverUrl()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      const book = { title: 'Test', key: '/works/OL1W' };

      const result = component.getCoverUrl(book);

      expect(bookSearchMock.getCoverUrl).toHaveBeenCalledWith(book);
      expect(result).toBe('/assets/cover.jpg');
    });
  });

  describe('navigate()', () => {
    it('should call router.navigateByUrl', () => {
      setup();

      component.navigate('/menu');

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/menu');
    });
  });

  describe('navigateToList()', () => {
    it('should set navigation origin and navigate to list', () => {
      setup();

      component.navigateToList('list1');

      expect(bookSearchMock.setNavigationOrigin).toHaveBeenCalledWith({ type: 'profile', listId: 'list1' });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listas', 'list1']);
    });

    it('should do nothing when id is null', () => {
      setup();

      component.navigateToList(null);

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('toggleFavorite()', () => {
    it('should call listasService.toggleFavorite', () => {
      setup();

      component.toggleFavorite('list1');

      expect(listasMock.toggleFavorite).toHaveBeenCalledWith('list1');
    });

    it('should stop propagation when event is passed', () => {
      setup();
      const event = { stopPropagation: vi.fn() } as any;

      component.toggleFavorite('list1', event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('onAvatarError()', () => {
    it('should call auth.setLocalAvatar(null)', () => {
      setup();

      component.onAvatarError();

      expect(authMock.setLocalAvatar).toHaveBeenCalledWith(null);
    });

    it('should not throw when auth service throws', () => {
      setup();
      authMock.setLocalAvatar.mockImplementation(() => { throw new Error(); });

      expect(() => component.onAvatarError()).not.toThrow();
    });
  });
});
