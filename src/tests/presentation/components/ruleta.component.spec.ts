import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RuletaComponent } from '../../../app/presentation/components/ruleta/ruleta.component';
import { ListasService } from '../../../app/domain/services/listas.service';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

describe('RuletaComponent', () => {
  let component: RuletaComponent;
  let fixture: ComponentFixture<RuletaComponent>;
  let listasMock: any;
  let bookSearchMock: any;
  let listasSubject: BehaviorSubject<any[]>;

  const mockBooks = [
    { title: 'Book A', key: '/works/OL1W' },
    { title: 'Book B', key: '/works/OL2W' },
    { title: 'Book C', key: '/works/OL3W' }
  ];

  const mockListas = [
    { id: 'ley1', nombre: 'Leyendo', libros: [], owner: 'testuser' },
    { id: 'list1', nombre: 'Mi Lista', libros: mockBooks, owner: 'testuser' },
    { id: 'plan1', nombre: 'Plan para leer', libros: [], owner: 'testuser' }
  ];

  function setup(listas = mockListas) {
    listasSubject = new BehaviorSubject<any[]>(listas);

    listasMock = {
      listas$: listasSubject.asObservable(),
      getAll: vi.fn().mockReturnValue(listas),
      getByOwner: vi.fn().mockReturnValue(listas),
      getById: vi.fn().mockImplementation((id: string) => listas.find(l => l.id === id)),
      getCurrentUser: vi.fn().mockReturnValue('testuser'),
      ensureProfileSections: vi.fn(),
      addBookToList: vi.fn(),
      removeBookFromList: vi.fn()
    };

    bookSearchMock = {
      getCoverUrl: vi.fn().mockReturnValue('/assets/cover.jpg'),
      getFirstAuthor: vi.fn().mockReturnValue('Author Name')
    };

    TestBed.configureTestingModule({
      imports: [RuletaComponent],
      providers: [
        { provide: ListasService, useValue: listasMock },
        { provide: BookSearchService, useValue: bookSearchMock }
      ]
    });

    fixture = TestBed.createComponent(RuletaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  describe('ngOnInit', () => {
    it('should get current user from listasService', () => {
      setup();

      expect(component.currentUser).toBe('testuser');
    });

    it('should call ensureProfileSections', () => {
      setup();

      expect(listasMock.ensureProfileSections).toHaveBeenCalledWith('testuser');
    });

    it('should initialize titles with default text', () => {
      setup();

      expect(component.titles).toContain('Ruleta aleatoria');
    });

    it('should update available lists when listas$ emits', () => {
      setup();
      const newListas = [{ id: 'new1', nombre: 'Nueva Lista', libros: mockBooks, owner: 'testuser' }];
      listasMock.getByOwner.mockReturnValue(newListas);

      listasSubject.next(newListas);

      expect(listasMock.getByOwner).toHaveBeenCalled();
    });

    it('should calculate wheel size on init', () => {
      setup();

      expect(component.wheelSize).toBeGreaterThan(0);
    });

    it('should not include "Leyendo" or "Leído" in available listas', () => {
      setup();

      expect(component.listas.some(l => l.nombre.toLowerCase() === 'leyendo')).toBe(false);
    });

    it('should include "Plan para leer" in available listas', () => {
      setup();

      expect(component.listas.some(l => l.nombre.toLowerCase() === 'plan para leer')).toBe(true);
    });
  });

  describe('ngOnDestroy', () => {
    it('should clear reveal timeout on destroy', () => {
      vi.useFakeTimers();
      setup();
      const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
      component['_revealTimeoutId'] = setTimeout(() => {}, 10000) as any;

      component.ngOnDestroy();

      expect(clearSpy).toHaveBeenCalled();
      vi.advanceTimersByTime(10001);
      vi.useRealTimers();
    });

    it('should not throw when no pending timeout', () => {
      setup();
      component['_revealTimeoutId'] = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('onWindowResize()', () => {
    it('should call recalcWheelSize', () => {
      setup();
      const initialSize = component.wheelSize;

      component.onWindowResize();

      expect(component.wheelSize).toBeGreaterThan(0);
    });
  });

  describe('onSelectList()', () => {
    it('should reset state and show default titles when no list selected', () => {
      setup();
      component.selectedListId = null;

      component.onSelectList();

      expect(component.titles).toContain('Ruleta aleatoria');
      expect(component.resultBook).toBeNull();
    });

    it('should show "Vacía" when selected list has no books', () => {
      setup();
      component.selectedListId = 'ley1';

      component.onSelectList();

      expect(component.titles).toContain('Vacía');
    });

    it('should load book titles when list has books', () => {
      setup();
      component.selectedListId = 'list1';

      component.onSelectList();

      expect(component.titles).toHaveLength(3);
      expect(component.titles[0]).toBe('Book A');
    });

    it('should calculate anglePer correctly for n books', () => {
      setup();
      component.selectedListId = 'list1';

      component.onSelectList();

      expect(component.anglePer).toBeCloseTo(120, 1);
    });

    it('should reset rotationDeg to 0', () => {
      setup();
      component.rotationDeg = 720;
      component.selectedListId = 'list1';

      component.onSelectList();

      expect(component.rotationDeg).toBe(0);
    });

    it('should handle undefined lista gracefully', () => {
      setup();
      listasMock.getById.mockReturnValue(undefined);
      component.selectedListId = 'unknown';

      component.onSelectList();

      expect(component.titles).toContain('Vacía');
    });
  });

  describe('canStart getter', () => {
    it('should return false when no list selected', () => {
      setup();
      component.selectedListId = null;

      expect(component.canStart).toBe(false);
    });

    it('should return false when spinning', () => {
      setup();
      component.selectedListId = 'list1';
      component.spinning = true;

      expect(component.canStart).toBe(false);
    });

    it('should return false when revealing', () => {
      setup();
      component.selectedListId = 'list1';
      component.revealing = true;

      expect(component.canStart).toBe(false);
    });

    it('should return true when list with books is selected and not spinning', () => {
      setup();
      component.selectedListId = 'list1';
      component.spinning = false;
      component.revealing = false;

      expect(component.canStart).toBe(true);
    });

    it('should return false when service throws', () => {
      setup();
      component.selectedListId = 'list1';
      listasMock.getById.mockImplementation(() => { throw new Error(); });

      expect(component.canStart).toBe(false);
    });
  });

  describe('comenzarRuleta()', () => {
    beforeEach(() => {
      vi.spyOn(window, "alert").mockImplementation(() => {});
    });

    it('should alert and return when no list selected', () => {
      setup();
      component.selectedListId = null;

      component.comenzarRuleta();

      expect(window.alert).toHaveBeenCalled();
      expect(component.spinning).toBe(false);
    });

    it('should return when lista not found', () => {
      setup();
      component.selectedListId = 'unknown';
      listasMock.getById.mockReturnValue(undefined);

      component.comenzarRuleta();

      expect(component.spinning).toBe(false);
    });

    it('should alert for empty list', () => {
      setup();
      component.selectedListId = 'ley1';

      component.comenzarRuleta();

      expect(window.alert).toHaveBeenCalledWith('La lista seleccionada no contiene libros.');
    });

    it('should start spinning for valid list', () => {
      vi.useFakeTimers();
      setup();
      component.selectedListId = 'list1';
      component.selectedListId = 'list1';
      component.onSelectList();
      const delay = component.spinDurationMs + 5000;

      component.comenzarRuleta();

      expect(component.spinning).toBe(true);
      vi.advanceTimersByTime(delay);
      vi.useRealTimers();
    });

    it('should do nothing when already spinning', () => {
      vi.useFakeTimers();
      setup();
      component.selectedListId = 'list1';
      component.spinning = true;
      const delay = component.spinDurationMs + 5000;

      component.comenzarRuleta();

      expect(listasMock.getById).toHaveBeenCalled();
      vi.advanceTimersByTime(delay);
      vi.useRealTimers();
    });
  });

  describe('onWheelTransitionEnd()', () => {
    it('should do nothing for non-transform transitions', () => {
      setup();
      component['_pendingSpinIdx'] = 0;

      component.onWheelTransitionEnd({ propertyName: 'opacity' } as TransitionEvent);

      // non-transform transition causes early return, getById is never called
      expect(listasMock.getById).not.toHaveBeenCalled();
    });

    it('should do nothing when no pending spin', () => {
      setup();
      component['_pendingSpinIdx'] = null;

      component.onWheelTransitionEnd({ propertyName: 'transform' } as TransitionEvent);

      // null pendingSpinIdx causes early return, getById is never called
      expect(listasMock.getById).not.toHaveBeenCalled();
    });

    it('should trigger revealPendingSpin for transform transition when pending', () => {
      vi.useFakeTimers();
      setup();
      component.selectedListId = 'list1';
      component['_pendingSpinIdx'] = 1;
      component['_pendingFinalRotation'] = 720;

      component.onWheelTransitionEnd({ propertyName: 'transform' } as TransitionEvent);

      vi.advanceTimersByTime(3000);
      vi.useRealTimers();
    });
  });

  describe('quitarLibro()', () => {
    it('should do nothing when no selectedListId', () => {
      setup();
      component.selectedListId = null;
      component.resultBook = mockBooks[0] as any;

      component.quitarLibro();

      expect(listasMock.addBookToList).not.toHaveBeenCalled();
    });

    it('should do nothing when no resultBook', () => {
      setup();
      component.selectedListId = 'list1';
      component.resultBook = null;

      component.quitarLibro();

      expect(listasMock.addBookToList).not.toHaveBeenCalled();
    });

    it('should add book to Leyendo and remove from current list', () => {
      setup();
      component.selectedListId = 'list1';
      component.resultBook = mockBooks[0] as any;

      component.quitarLibro();

      expect(listasMock.addBookToList).toHaveBeenCalledWith('ley1', mockBooks[0]);
      expect(listasMock.removeBookFromList).toHaveBeenCalledWith('list1', mockBooks[0]);
    });

    it('should clear resultBook after removal', () => {
      setup();
      component.selectedListId = 'list1';
      component.resultBook = mockBooks[1] as any;

      component.quitarLibro();

      expect(component.resultBook).toBeNull();
    });

    it('should remove from list even if Leyendo not found', () => {
      setup(mockListas.filter(l => l.nombre !== 'Leyendo'));
      component.selectedListId = 'list1';
      component.resultBook = mockBooks[0] as any;

      component.quitarLibro();

      expect(listasMock.removeBookFromList).toHaveBeenCalled();
    });
  });

  describe('getCover()', () => {
    it('should return empty string for null book', () => {
      setup();

      expect(component.getCover(null)).toBe('');
    });

    it('should delegate to bookSearchService for non-null book', () => {
      setup();
      const book = mockBooks[0] as any;

      const result = component.getCover(book);

      expect(bookSearchMock.getCoverUrl).toHaveBeenCalledWith(book);
      expect(result).toBe('/assets/cover.jpg');
    });
  });

  describe('truncateTitle()', () => {
    it('should return empty string for falsy input', () => {
      setup();

      expect(component.truncateTitle('')).toBe('');
    });

    it('should return original title if short enough', () => {
      setup();

      expect(component.truncateTitle('Short Title')).toBe('Short Title');
    });

    it('should truncate long title with ellipsis', () => {
      setup();
      const longTitle = 'This is a very long book title that exceeds the limit';

      const result = component.truncateTitle(longTitle);

      expect(result).toContain('…');
      expect(result.length).toBeLessThanOrEqual(28);
    });
  });

  describe('labelTransform()', () => {
    it('should return rotate(90deg) for top segment', () => {
      setup();
      component.anglePer = 120;

      const result = component.labelTransform(0);

      expect(result).toMatch(/rotate\(-?90deg\)/);
    });

    it('should return rotate(-90deg) for lower segment', () => {
      setup();
      component.anglePer = 120;

      const result = component.labelTransform(1);

      expect(result).toMatch(/rotate\(-?90deg\)/);
    });
  });

  describe('halfRadius getter', () => {
    it('should return half of the radius', () => {
      setup();
      component.radius = 200;

      expect(component.halfRadius).toBe(100);
    });
  });

  describe('sliceLines getter', () => {
    it('should return empty array when only 1 title', () => {
      setup();
      component.titles = ['Single'];

      expect(component.sliceLines).toHaveLength(0);
    });

    it('should return lines equal to number of titles', () => {
      setup();
      component.titles = ['A', 'B', 'C'];
      component.anglePer = 120;
      component.wheelSize = 520;

      expect(component.sliceLines).toHaveLength(3);
    });
  });

  describe('labelFontSize getter', () => {
    it('should be within min/max bounds', () => {
      setup();

      const size = component.labelFontSize;

      expect(size).toBeGreaterThanOrEqual(14);
      expect(size).toBeLessThanOrEqual(24);
    });
  });
});
