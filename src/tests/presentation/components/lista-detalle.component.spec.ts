import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ListaDetalleComponent } from '../../../app/presentation/components/lista-detalle/lista-detalle.component';
import { ListasService } from '../../../app/domain/services/listas.service';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

describe('ListaDetalleComponent', () => {
  let component: ListaDetalleComponent;
  let fixture: ComponentFixture<ListaDetalleComponent>;
  let listasMock: any;
  let bookSearchMock: any;
  let confirmMock: any;
  let routerSpy: any;
  let locationSpy: any;
  let listasSubject: BehaviorSubject<any[]>;
  let routeStub: any;

  function setup(listId = 'list1', currentLista: any = { id: 'list1', nombre: 'Mi Lista', libros: [], owner: 'testuser', isPrivate: false }) {
    listasSubject = new BehaviorSubject<any[]>([currentLista]);

    listasMock = {
      listas$: listasSubject.asObservable(),
      getById: vi.fn().mockReturnValue(currentLista),
      getCurrentUser: vi.fn().mockReturnValue('testuser'),
      isProfileListName: vi.fn().mockReturnValue(false),
      removeBookFromList: vi.fn(),
      deleteList: vi.fn(),
      updateListName: vi.fn(),
      updateListPrivacy: vi.fn(),
      toggleFavorite: vi.fn(),
      isFavorited: vi.fn().mockReturnValue(false)
    };

    bookSearchMock = {
      getNavigationOrigin: vi.fn().mockReturnValue(null),
      setNavigationOrigin: vi.fn(),
      setSelectedBook: vi.fn(),
      getCoverUrl: vi.fn().mockReturnValue('/assets/cover.jpg'),
      getFirstAuthor: vi.fn().mockReturnValue('Author Name')
    };

    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };

    routerSpy = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };

    locationSpy = { back: vi.fn() };

    routeStub = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(listId)
        }
      }
    };

    TestBed.configureTestingModule({
      imports: [ListaDetalleComponent],
      providers: [
        { provide: ListasService, useValue: listasMock },
        { provide: BookSearchService, useValue: bookSearchMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationSpy },
        { provide: ActivatedRoute, useValue: routeStub }
      ]
    });

    fixture = TestBed.createComponent(ListaDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  describe('ngOnInit', () => {
    it('should load lista by id from route', () => {
      setup('list1', { id: 'list1', nombre: 'Mi Lista', libros: [], owner: 'testuser' });

      expect(listasMock.getById).toHaveBeenCalledWith('list1');
      expect(component.lista).toBeDefined();
    });

    it('should set currentUser from listasService', () => {
      setup();

      expect(component.currentUser).toBe('testuser');
    });

    it('should update pagination when listas$ emits', () => {
      setup('list1', { id: 'list1', nombre: 'Mi Lista', libros: [{ title: 'A' }, { title: 'B' }], owner: 'testuser' });

      listasSubject.next([{ id: 'list1', nombre: 'Mi Lista', libros: [{ title: 'C' }], owner: 'testuser' }]);

      // BehaviorSubject emits immediately on subscribe (1 call) + explicit next (1 call) + initial direct call = 3
      expect(listasMock.getById).toHaveBeenCalledTimes(3);
    });

    it('should start at page 1 on fresh load', () => {
      setup();

      expect(component.currentPage).toBe(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should not throw when destroyed', () => {
      setup();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('updatePagination()', () => {
    it('should slice libros according to pageSize', () => {
      const books = Array.from({ length: 20 }, (_, i) => ({ title: `Book ${i}` }));
      setup('list1', { id: 'list1', nombre: 'Mi Lista', libros: books, owner: 'testuser' });
      component.currentPage = 2;

      component.updatePagination();

      expect(component.pagedLibros).toHaveLength(8);
    });

    it('should handle empty libros list', () => {
      setup('list1', { id: 'list1', nombre: 'Mi Lista', libros: [], owner: 'testuser' });

      expect(component.pagedLibros).toHaveLength(0);
    });
  });

  describe('onPageChange()', () => {
    it('should update currentPage and refresh pagination', () => {
      const books = Array.from({ length: 20 }, (_, i) => ({ title: `Book ${i}` }));
      setup('list1', { id: 'list1', nombre: 'Mi Lista', libros: books, owner: 'testuser' });

      component.onPageChange(2);

      expect(component.currentPage).toBe(2);
    });
  });

  describe('openFromDetail()', () => {
    it('should set navigation origin and selected book then navigate to /menu', () => {
      setup();
      const book = { title: 'Dune', key: '/works/OL1W' } as any;

      component.openFromDetail(book);

      expect(bookSearchMock.setNavigationOrigin).toHaveBeenCalledWith(expect.objectContaining({ type: 'list' }));
      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(book);
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/menu');
    });

    it('should carry parentType when origin is profile', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'profile' });
      const book = { title: 'Book', key: '/works/OL2W' } as any;

      component.openFromDetail(book);

      expect(bookSearchMock.setNavigationOrigin).toHaveBeenCalledWith(expect.objectContaining({ parentType: 'profile' }));
    });

    it('should do nothing when book is null', () => {
      setup();

      component.openFromDetail(null as any);

      expect(bookSearchMock.setSelectedBook).not.toHaveBeenCalled();
    });
  });

  describe('back()', () => {
    it('should navigate to /listas-usuarios when origin is null', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue(null);

      component.back();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/listas-usuarios');
    });

    it('should call location.back() when origin is menu', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'menu' });

      component.back();

      expect(locationSpy.back).toHaveBeenCalled();
    });

    it('should navigate to /listas-usuarios when origin is listas', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'listas' });

      component.back();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/listas-usuarios');
    });

    it('should navigate to /perfil when origin is profile', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'profile' });

      component.back();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/perfil');
    });

    it('should navigate to /perfil when origin parentType is profile', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'list', parentType: 'profile' });

      component.back();

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/perfil');
    });
  });

  describe('backButtonLabel getter', () => {
    it('should return "← Volver" when no origin', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue(null);

      expect(component.backButtonLabel).toBe('← Volver');
    });

    it('should return "← Volver al menú" for menu origin', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'menu' });

      expect(component.backButtonLabel).toBe('← Volver al menú');
    });

    it('should return "← Volver a listas" for listas origin', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'listas' });

      expect(component.backButtonLabel).toBe('← Volver a listas');
    });

    it('should return "← Volver al perfil" for profile origin', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'profile' });

      expect(component.backButtonLabel).toBe('← Volver al perfil');
    });
  });

  describe('isProfileList()', () => {
    it('should delegate to listasService', () => {
      setup();
      listasMock.isProfileListName.mockReturnValue(true);

      expect(component.isProfileList('Leyendo')).toBe(true);
    });

    it('should return false when name is falsy', () => {
      setup();
      listasMock.isProfileListName.mockReturnValue(false);

      expect(component.isProfileList(null)).toBe(false);
    });
  });

  describe('getCover()', () => {
    it('should return cover from bookSearch service', () => {
      setup();
      const book = { title: 'Test', key: '/works/OL1W' };

      const result = component.getCover(book);

      expect(result).toBe('/assets/cover.jpg');
    });

    it('should fall back to cover_i URL when service throws', () => {
      setup();
      bookSearchMock.getCoverUrl.mockImplementation(() => { throw new Error(); });
      const book = { cover_i: 12345 };

      const result = component.getCover(book);

      expect(result).toContain('12345');
    });

    it('should fall back to /assets/placeholder.png when no cover', () => {
      setup();
      bookSearchMock.getCoverUrl.mockImplementation(() => { throw new Error(); });
      const book = {};

      const result = component.getCover(book);

      expect(result).toBe('/assets/placeholder.png');
    });
  });

  describe('getAuthor()', () => {
    it('should return author from bookSearch service', () => {
      setup();
      bookSearchMock.getFirstAuthor.mockReturnValue('Isaac Asimov');

      const result = component.getAuthor({ title: 'Foundation' });

      expect(result).toBe('Isaac Asimov');
    });

    it('should fall back to author_name array when service returns unknown', () => {
      setup();
      bookSearchMock.getFirstAuthor.mockReturnValue('Autor desconocido');
      const book = { author_name: ['Tolkien'] };

      const result = component.getAuthor(book);

      expect(result).toBe('Tolkien');
    });

    it('should return author field as last fallback', () => {
      setup();
      bookSearchMock.getFirstAuthor.mockImplementation(() => { throw new Error(); });
      const book = { author: 'Fallback Author' };

      const result = component.getAuthor(book);

      expect(result).toBe('Fallback Author');
    });

    it('should return empty string when no author info', () => {
      setup();
      bookSearchMock.getFirstAuthor.mockImplementation(() => { throw new Error(); });
      const book = {};

      const result = component.getAuthor(book);

      expect(result).toBe('');
    });
  });

  describe('removeFromList()', () => {
    it('should remove book from list when confirmed', async () => {
      setup();
      confirmMock.confirm.mockResolvedValue(true);
      const book = { title: 'Test' };

      await component.removeFromList('list1', book);

      expect(listasMock.removeBookFromList).toHaveBeenCalledWith('list1', book);
    });

    it('should not remove book when cancelled', async () => {
      setup();
      confirmMock.confirm.mockResolvedValue(false);

      await component.removeFromList('list1', { title: 'Test' });

      expect(listasMock.removeBookFromList).not.toHaveBeenCalled();
    });

    it('should stop event propagation when event passed', async () => {
      setup();
      const event = { stopPropagation: vi.fn() } as any;

      await component.removeFromList('list1', {}, event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('confirmAndDeleteList()', () => {
    it('should delete list and navigate when confirmed', async () => {
      setup();
      confirmMock.confirm.mockResolvedValue(true);

      await component.confirmAndDeleteList();

      expect(listasMock.deleteList).toHaveBeenCalledWith('list1');
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/listas-usuarios');
    });

    it('should not delete when user cancels', async () => {
      setup();
      confirmMock.confirm.mockResolvedValue(false);

      await component.confirmAndDeleteList();

      expect(listasMock.deleteList).not.toHaveBeenCalled();
    });

    it('should do nothing when lista is undefined', async () => {
      setup();
      component.lista = undefined;

      await component.confirmAndDeleteList();

      expect(listasMock.deleteList).not.toHaveBeenCalled();
    });

    it('should alert and return when lista is a profile list', async () => {
      setup();
      listasMock.isProfileListName.mockReturnValue(true);
      vi.spyOn(window, "alert").mockImplementation(() => {});

      await component.confirmAndDeleteList();

      expect(window.alert).toHaveBeenCalled();
      expect(listasMock.deleteList).not.toHaveBeenCalled();
    });
  });

  describe('editListName()', () => {
    it('should update list name when user enters a new name', () => {
      setup('list1', { id: 'list1', nombre: 'Old Name', libros: [], owner: 'testuser' });
      vi.spyOn(window, "prompt").mockReturnValue('New Name');

      component.editListName();

      expect(listasMock.updateListName).toHaveBeenCalledWith('list1', 'New Name');
    });

    it('should do nothing when prompt returns null', () => {
      setup();
      vi.spyOn(window, "prompt").mockReturnValue(null);

      component.editListName();

      expect(listasMock.updateListName).not.toHaveBeenCalled();
    });

    it('should do nothing when not the list owner', () => {
      setup('list1', { id: 'list1', nombre: 'Name', libros: [], owner: 'otherUser' });

      component.editListName();

      expect(listasMock.updateListName).not.toHaveBeenCalled();
    });

    it('should alert when lista is profile list', () => {
      setup();
      listasMock.isProfileListName.mockReturnValue(true);
      vi.spyOn(window, "alert").mockImplementation(() => {});

      component.editListName();

      expect(window.alert).toHaveBeenCalled();
    });
  });

  describe('openEditModal()', () => {
    it('should open edit modal with current list values', () => {
      setup('list1', { id: 'list1', nombre: 'Test List', libros: [], owner: 'testuser', isPrivate: false });

      component.openEditModal();

      expect(component.editingList).toBe(true);
      expect(component.editNombre).toBe('Test List');
    });

    it('should not open modal when not owner', () => {
      setup('list1', { id: 'list1', nombre: 'Test List', libros: [], owner: 'other', isPrivate: false });

      component.openEditModal();

      expect(component.editingList).toBe(false);
    });

    it('should not open modal for profile lists', () => {
      setup();
      listasMock.isProfileListName.mockReturnValue(true);
      vi.spyOn(window, "alert").mockImplementation(() => {});

      component.openEditModal();

      expect(component.editingList).toBe(false);
    });
  });

  describe('saveEdit()', () => {
    it('should save the edited list name and privacy', () => {
      setup();
      component.editingList = true;
      component.editNombre = 'New Name';
      component.editIsPrivate = true;

      component.saveEdit();

      expect(listasMock.updateListName).toHaveBeenCalledWith('list1', 'New Name');
      expect(listasMock.updateListPrivacy).toHaveBeenCalledWith('list1', true);
      expect(component.editingList).toBe(false);
    });

    it('should not save when editNombre is empty', () => {
      setup();
      component.editNombre = '   ';

      component.saveEdit();

      expect(listasMock.updateListName).not.toHaveBeenCalled();
    });
  });

  describe('cancelEdit()', () => {
    it('should set editingList to false', () => {
      setup();
      component.editingList = true;

      component.cancelEdit();

      expect(component.editingList).toBe(false);
    });
  });

  describe('hasChanges()', () => {
    it('should return true when name changed', () => {
      setup();
      component.editOriginalNombre = 'Original';
      component.editNombre = 'Changed';

      expect(component.hasChanges()).toBe(true);
    });

    it('should return true when privacy changed', () => {
      setup();
      component.editOriginalNombre = 'Same';
      component.editNombre = 'Same';
      component.editOriginalIsPrivate = false;
      component.editIsPrivate = true;

      expect(component.hasChanges()).toBe(true);
    });

    it('should return false when nothing changed', () => {
      setup();
      component.editOriginalNombre = 'Same';
      component.editNombre = 'Same';
      component.editOriginalIsPrivate = false;
      component.editIsPrivate = false;

      expect(component.hasChanges()).toBe(false);
    });
  });

  describe('isFavorited()', () => {
    it('should delegate to listasService', () => {
      setup();
      listasMock.isFavorited.mockReturnValue(true);

      expect(component.isFavorited()).toBe(true);
    });

    it('should return false when service throws', () => {
      setup();
      listasMock.isFavorited.mockImplementation(() => { throw new Error(); });

      expect(component.isFavorited()).toBe(false);
    });
  });

  describe('confirmAndRemoveFavorite()', () => {
    it('should toggle favorite when confirmed', async () => {
      setup();
      confirmMock.confirm.mockResolvedValue(true);

      await component.confirmAndRemoveFavorite();

      expect(listasMock.toggleFavorite).toHaveBeenCalledWith('list1');
    });

    it('should not toggle when cancelled', async () => {
      setup();
      confirmMock.confirm.mockResolvedValue(false);

      await component.confirmAndRemoveFavorite();

      expect(listasMock.toggleFavorite).not.toHaveBeenCalled();
    });

    it('should do nothing when lista is undefined', async () => {
      setup();
      component.lista = undefined;

      await component.confirmAndRemoveFavorite();

      expect(listasMock.toggleFavorite).not.toHaveBeenCalled();
    });
  });
});
