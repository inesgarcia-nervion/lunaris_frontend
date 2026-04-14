import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HeaderComponent } from '../../../app/presentation/components/header/header.component';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { ListasService } from '../../../app/domain/services/listas.service';
import { ReviewService } from '../../../app/domain/services/review.service';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { Router, NavigationEnd } from '@angular/router';
import { ElementRef } from '@angular/core';
import { Subject, BehaviorSubject, of, throwError } from 'rxjs';

/**
 * Pruebas para HeaderComponent.
 */
describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let bookSearchMock: any;
  let authMock: any;
  let listasMock: any;
  let reviewMock: any;
  let confirmMock: any;
  let routerSpy: any;
  let routerEvents$: Subject<any>;
  let loadingSubject: BehaviorSubject<boolean>;
  let errorSubject: BehaviorSubject<string | null>;
  let successSubject: BehaviorSubject<string | null>;
  let responseSubject: BehaviorSubject<any>;
  let currentPageSubject: BehaviorSubject<number>;
  let selectedBookSubject: BehaviorSubject<any>;
  let isAdminSubject: BehaviorSubject<boolean>;
  let avatarSubject: BehaviorSubject<string | null>;
  let listasSubject: BehaviorSubject<any[]>;

  /**
   * Función de configuración común para las pruebas, que inicializa los mocks y el componente.
   */
  function setup() {
    loadingSubject = new BehaviorSubject(false);
    errorSubject = new BehaviorSubject<string | null>(null);
    successSubject = new BehaviorSubject<string | null>(null);
    responseSubject = new BehaviorSubject<any>(null);
    currentPageSubject = new BehaviorSubject(1);
    selectedBookSubject = new BehaviorSubject<any>(null);
    isAdminSubject = new BehaviorSubject(false);
    avatarSubject = new BehaviorSubject<string | null>(null);
    listasSubject = new BehaviorSubject<any[]>([]);
    routerEvents$ = new Subject();

    bookSearchMock = {
      loading$: loadingSubject.asObservable(),
      error$: errorSubject.asObservable(),
      success$: successSubject.asObservable(),
      response$: responseSubject.asObservable(),
      currentPage$: currentPageSubject.asObservable(),
      selectedBook$: selectedBookSubject.asObservable(),
      getSearchQuery: vi.fn().mockReturnValue(''),
      getNavigationOrigin: vi.fn().mockReturnValue(null),
      setSearchQuery: vi.fn(),
      setSelectedBook: vi.fn(),
      publishResults: vi.fn(),
      setCurrentPage: vi.fn(),
      setError: vi.fn(),
      setSuccess: vi.fn(),
      setNavigationOrigin: vi.fn(),
      searchCurrent: vi.fn(),
      searchByAuthorCurrent: vi.fn(),
      importBook: vi.fn().mockReturnValue(of({})),
      getCoverUrl: vi.fn().mockReturnValue('http://cover.url/img.jpg'),
      getFirstAuthor: vi.fn().mockReturnValue('Test Author'),
      getCategories: vi.fn().mockReturnValue([]),
      generateRatingArray: vi.fn().mockReturnValue(['full', 'full', 'empty', 'empty', 'empty']),
      getEditionCount: vi.fn().mockReturnValue('5'),
      getSagaName: vi.fn().mockReturnValue(null),
      isSaga: vi.fn().mockReturnValue(false),
      scrapeSaga: vi.fn().mockReturnValue(of(null)),
      searchBooks: vi.fn().mockReturnValue(of({ docs: [], numFound: 0 }))
    };

    authMock = {
      isAdmin: vi.fn().mockReturnValue(false),
      isAdmin$: isAdminSubject.asObservable(),
      getCurrentUsername: vi.fn().mockReturnValue('testuser'),
      avatar$: avatarSubject.asObservable(),
      getLocalAvatar: vi.fn().mockReturnValue(null),
      setLocalAvatar: vi.fn(),
      logout: vi.fn()
    };

    listasMock = {
      listas$: listasSubject.asObservable(),
      getAll: vi.fn().mockReturnValue([]),
      getById: vi.fn().mockReturnValue(null),
      isProfileListName: vi.fn().mockReturnValue(false),
      getCurrentUser: vi.fn().mockReturnValue('testuser'),
      ensureProfileSections: vi.fn(),
      addBookToList: vi.fn(),
      removeBookFromList: vi.fn()
    };

    reviewMock = {
      getByBookApiId: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of({ id: 1 })),
      update: vi.fn().mockReturnValue(of({ id: 1 })),
      delete: vi.fn().mockReturnValue(of({})),
      refreshAll: vi.fn()
    };

    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };

    routerSpy = {
      navigate: vi.fn(),
      events: routerEvents$.asObservable(),
      url: '/menu'
    };

    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: BookSearchService, useValue: bookSearchMock },
        { provide: AuthService, useValue: authMock },
        { provide: ListasService, useValue: listasMock },
        { provide: ReviewService, useValue: reviewMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: Router, useValue: routerSpy },
        { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } }
      ]
    });

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  }

  /**
   * Limpia los mocks y el módulo de prueba después de cada prueba.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para ngOnInit.
   */
  describe('ngOnInit', () => {
    it('should initialize with isAdmin and username from auth service', () => {
      setup();
      authMock.isAdmin.mockReturnValue(true);
      fixture.detectChanges();

      expect(component.isAdmin).toBe(false); 
      isAdminSubject.next(true);
      expect(component.isAdmin).toBe(true);
    });

    it('should update loading from bookSearchService.loading$', () => {
      setup();
      fixture.detectChanges();

      loadingSubject.next(true);

      expect(component.loading).toBe(true);
    });

    it('should update searchResults when response$ emits', () => {
      setup();
      fixture.detectChanges();

      responseSubject.next({ docs: [{ title: 'Book 1' }], numFound: 1 });

      expect(component.searchResults).toHaveLength(1);
    });

    it('should update avatar from auth.avatar$', () => {
      setup();
      fixture.detectChanges();

      avatarSubject.next('https://avatar.url/me.jpg');

      expect(component.avatar).toBe('https://avatar.url/me.jpg');
    });
  });

  /**
   * Pruebas para ngOnDestroy.
   */
  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions', () => {
      setup();
      fixture.detectChanges();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  /**
   * Pruebas para toggleMenu.
   */
  describe('toggleMenu()', () => {
    it('should toggle isMenuOpen', () => {
      setup();
      fixture.detectChanges();
      component.isMenuOpen = false;

      component.toggleMenu();
      expect(component.isMenuOpen).toBe(true);

      component.toggleMenu();
      expect(component.isMenuOpen).toBe(false);
    });
  });

  /**
   * Pruebas para toggleUserMenu.
   */
  describe('toggleUserMenu()', () => {
    it('should toggle showUserMenu', () => {
      setup();
      fixture.detectChanges();

      component.toggleUserMenu();
      expect(component.showUserMenu).toBe(true);

      component.toggleUserMenu();
      expect(component.showUserMenu).toBe(false);
    });
  });

  /**
   * Pruebas para onUserButtonClick.
   */
  describe('onUserButtonClick()', () => {
    it('should stop propagation and toggle user menu', () => {
      setup();
      fixture.detectChanges();
      const event = { stopPropagation: vi.fn() } as any;

      component.onUserButtonClick(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showUserMenu).toBe(true);
    });
  });

  /**
   * Pruebas para navigate.
   */
  describe('navigate()', () => {
    it('should call router.navigate with the path', () => {
      setup();
      fixture.detectChanges();

      component.navigate('/perfil');

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/perfil']);
    });

    it('should reset search state when navigating to /menu', () => {
      setup();
      fixture.detectChanges();

      component.navigate('/menu');

      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(null);
      expect(bookSearchMock.publishResults).toHaveBeenCalledWith(null);
    });
  });

  /**
   * Pruebas para navigateAndClose.
   */
  describe('navigateAndClose()', () => {
    it('should close user menu and navigate', () => {
      setup();
      fixture.detectChanges();
      component.showUserMenu = true;

      component.navigateAndClose('/configuracion');

      expect(component.showUserMenu).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/configuracion']);
    });
  });

  /**
   * Pruebas para logout.
   */
  describe('logout()', () => {
    it('should call auth.logout and navigate to /login', () => {
      setup();
      fixture.detectChanges();

      component.logout();

      expect(authMock.logout).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  /**
   * Pruebas para search.
   */
  describe('search()', () => {
    it('should call searchCurrent when query is not empty', () => {
      setup();
      fixture.detectChanges();
      component.searchQuery = 'Harry Potter';

      component.search();

      expect(bookSearchMock.searchCurrent).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
    });

    it('should set error when search query is empty', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.searchQuery = '';

      component.search();

      expect(component.error).toBeTruthy();
      expect(bookSearchMock.searchCurrent).not.toHaveBeenCalled();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para searchByAuthor.
   */
  describe('searchByAuthor()', () => {
    it('should call searchByAuthorCurrent when query is not empty', () => {
      setup();
      fixture.detectChanges();
      component.searchQuery = 'Tolkien';

      component.searchByAuthor();

      expect(bookSearchMock.searchByAuthorCurrent).toHaveBeenCalled();
    });

    it('should set error when query is empty', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.searchQuery = '';

      component.searchByAuthor();

      expect(component.error).toBeTruthy();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para getCoverUrl.
   */
  describe('getCoverUrl()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      fixture.detectChanges();
      const book = { title: 'Dune' } as any;

      const result = component.getCoverUrl(book);

      expect(bookSearchMock.getCoverUrl).toHaveBeenCalledWith(book);
      expect(result).toBe('http://cover.url/img.jpg');
    });
  });

  /**
   * Pruebas para getFirstAuthor.
   */
  describe('getFirstAuthor()', () => {
    it('should return first author name from authorNames', () => {
      setup();
      fixture.detectChanges();
      const book = { authorNames: ['Alice', 'Bob'] } as any;

      const result = component.getFirstAuthor(book);

      expect(result).toBe('Alice');
    });

    it('should return "Autor desconocido" when no authors', () => {
      setup();
      fixture.detectChanges();
      const book = { authorNames: [] } as any;

      const result = component.getFirstAuthor(book);

      expect(result).toBe('Autor desconocido');
    });
  });

  /**
   * Pruebas para importBook.
   */
  describe('importBook()', () => {
    it('should call bookSearchService.importBook', () => {
      setup();
      fixture.detectChanges();
      const book = { title: 'Test Book', key: '/works/OL1W' } as any;

      component.importBook(book);

      expect(bookSearchMock.importBook).toHaveBeenCalledWith(book);
    });

    it('should set error on import failure', () => {
      vi.useFakeTimers();
      setup();
      bookSearchMock.importBook.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();
      const book = { title: 'Test Book', key: '/works/OL1W' } as any;

      component.importBook(book);

      expect(component.error).toBeTruthy();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para previousPage() / nextPage().
   */
  describe('previousPage() / nextPage()', () => {
    it('should decrement currentPage on previousPage', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 3;
      component.totalResults = 100;

      component.previousPage();

      expect(bookSearchMock.setCurrentPage).toHaveBeenCalledWith(2);
    });

    it('should not go below page 1 on previousPage', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 1;

      component.previousPage();

      expect(bookSearchMock.setCurrentPage).not.toHaveBeenCalled();
    });

    it('should increment currentPage on nextPage', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 1;
      component.totalResults = 100;

      component.nextPage();

      expect(bookSearchMock.setCurrentPage).toHaveBeenCalledWith(2);
    });
  });

  /**
   * Pruebas para onPageChange.
   */
  describe('onPageChange()', () => {
    it('should change page and search', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 1;
      component.totalResults = 60;

      component.onPageChange(3);

      expect(bookSearchMock.setCurrentPage).toHaveBeenCalledWith(3);
      expect(bookSearchMock.searchCurrent).toHaveBeenCalled();
    });

    it('should do nothing if same page', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 2;

      component.onPageChange(2);

      expect(bookSearchMock.setCurrentPage).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para getTotalPages() / hasNextPage() / hasPreviousPage().
   */
  describe('getTotalPages() / hasNextPage() / hasPreviousPage()', () => {
    it('should calculate totalPages correctly', () => {
      setup();
      fixture.detectChanges();
      component.totalResults = 50;
      component.limit = 12;

      expect(component.getTotalPages()).toBe(5);
    });

    it('hasNextPage should return true when not on last page', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 1;
      component.totalResults = 50;

      expect(component.hasNextPage()).toBe(true);
    });

    it('hasPreviousPage should return true when not on first page', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 3;

      expect(component.hasPreviousPage()).toBe(true);
    });

    it('hasPreviousPage should return false on page 1', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 1;

      expect(component.hasPreviousPage()).toBe(false);
    });
  });

  /**
   * Pruebas para backToSearch.
   */
  describe('backToSearch()', () => {
    it('should clear selected book when origin is null', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue(null);
      fixture.detectChanges();

      component.backToSearch();

      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(null);
    });

    it('should navigate to list origin when type is "list"', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'list', listId: 'abc' });
      fixture.detectChanges();

      component.backToSearch();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listas', 'abc']);
    });

    it('should navigate to /perfil when origin is "profile"', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'profile' });
      fixture.detectChanges();

      component.backToSearch();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/perfil']);
    });
  });

  /**
   * Pruebas para backButtonLabel getter.
   */
  describe('backButtonLabel getter', () => {
    it('should return back to list label', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'list', listId: '1' });
      fixture.detectChanges();

      expect(component.backButtonLabel).toBe('← Volver a la lista');
    });

    it('should return back to search label otherwise', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue(null);
      fixture.detectChanges();

      expect(component.backButtonLabel).toBe('← Volver a la búsqueda');
    });
  });

  /**
   * Pruebas para generateRatingArray.
   */
  describe('generateRatingArray()', () => {
    it('should return star array based on rating', () => {
      setup();
      fixture.detectChanges();

      const result = component.generateRatingArray(4);

      expect(result).toHaveLength(5);
      expect(result.filter(s => s === 'full')).toHaveLength(4);
      expect(result.filter(s => s === 'empty')).toHaveLength(1);
    });
  });

  /**
   * Pruebas para getCategories.
   */
  describe('getCategories()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      fixture.detectChanges();
      const book = { subject: ['Fiction'] } as any;

      component.getCategories(book);

      expect(bookSearchMock.getCategories).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para getEditionCount.
   */
  describe('getEditionCount()', () => {
    it('should return editionCount as string', () => {
      setup();
      fixture.detectChanges();

      const result = component.getEditionCount({ editionCount: 10 } as any);

      expect(result).toBe('10');
    });

    it('should return 0 when no edition count', () => {
      setup();
      fixture.detectChanges();

      const result = component.getEditionCount({} as any);

      expect(result).toBe('0');
    });
  });

  /**
   * Pruebas para isSaga.
   */
  describe('isSaga()', () => {
    it('should delegate to getSagaName', () => {
      setup();
      fixture.detectChanges();
      vi.spyOn(component, 'getSagaName').mockReturnValue('HP Series');

      expect(component.isSaga({} as any)).toBe(true);
    });

    it('should return false when not a saga', () => {
      setup();
      fixture.detectChanges();
      vi.spyOn(component, 'getSagaName').mockReturnValue(null);

      expect(component.isSaga({} as any)).toBe(false);
    });
  });

  /**
   * Pruebas para onAvatarError.
   */
  describe('onAvatarError()', () => {
    it('should call auth.setLocalAvatar(null)', () => {
      setup();
      fixture.detectChanges();

      component.onAvatarError();

      expect(authMock.setLocalAvatar).toHaveBeenCalledWith(null);
    });
  });

  /**
   * Pruebas para selectBook.
   */
  describe('selectBook()', () => {
    it('should call bookSearchService.setSelectedBook with the book', () => {
      setup();
      fixture.detectChanges();
      const book = { title: 'Test', key: '/works/OL1W' } as any;

      component.selectBook(book);

      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para addToList.
   */
  describe('addToList()', () => {
    it('should set error when no list or status selected', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.selectedBook = { title: 'Book', key: '/works/OL1W' } as any;
      component.selectedList = '';
      component.selectedStatus = '';

      component.addToList();

      expect(component.error).toBeTruthy();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });

    it('should do nothing when no book selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedBook = null;

      component.addToList();

      expect(listasMock.addBookToList).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para submitReview.
   */
  describe('submitReview()', () => {
    it('should set error when no book selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedBook = null;

      component.submitReview();

      expect(component.error).toBeTruthy();
    });

    it('should call reviewService.create for new review', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.selectedBook = { title: 'Book', key: '/works/OL1W' } as any;
      component.currentUserReview = null;
      component.userReview = 'Great book!';
      component.userRating = 4;

      component.submitReview();

      expect(reviewMock.create).toHaveBeenCalled();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });

    it('should call reviewService.update for existing review', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.selectedBook = { title: 'Book', key: '/works/OL1W' } as any;
      component.currentUserReview = { id: 1, comment: 'Old', rating: 3 };
      component.userReview = 'Updated!';
      component.userRating = 5;

      component.submitReview();

      expect(reviewMock.update).toHaveBeenCalledWith(1, expect.any(Object));
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para deleteReview.
   */
  describe('deleteReview()', () => {
    it('should do nothing when no current review', async () => {
      setup();
      fixture.detectChanges();
      component.currentUserReview = null;

      await component.deleteReview();

      expect(reviewMock.delete).not.toHaveBeenCalled();
    });

    it('should call reviewService.delete when confirmed', async () => {
      setup();
      fixture.detectChanges();
      component.currentUserReview = { id: 5 };
      confirmMock.confirm.mockResolvedValue(true);

      await component.deleteReview();

      expect(reviewMock.delete).toHaveBeenCalledWith(5);
    });

    it('should not delete when user cancels', async () => {
      setup();
      fixture.detectChanges();
      component.currentUserReview = { id: 5 };
      confirmMock.confirm.mockResolvedValue(false);

      await component.deleteReview();

      expect(reviewMock.delete).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para deleteReviewById.
   */
  describe('deleteReviewById()', () => {
    it('should do nothing when id is undefined', async () => {
      setup();
      fixture.detectChanges();

      await component.deleteReviewById(undefined);

      expect(reviewMock.delete).not.toHaveBeenCalled();
    });

    it('should delete review by id when confirmed', async () => {
      setup();
      fixture.detectChanges();
      component.reviews = [{ id: 3 }];
      confirmMock.confirm.mockResolvedValue(true);

      await component.deleteReviewById(3);

      expect(reviewMock.delete).toHaveBeenCalledWith(3);
    });
  });

  /**
   * Pruebas para getSagaName.
   */
  describe('getSagaName()', () => {
    it('should extract saga from series field', () => {
      setup();
      fixture.detectChanges();
      const book = { series: ['series:Harry Potter Series'], title: '' } as any;

      const result = component.getSagaName(book);

      expect(result).toBeTruthy();
    });

    it('should return null when no saga detected', () => {
      setup();
      fixture.detectChanges();
      const book = { title: 'A standalone book', series: [], subject: [] } as any;

      const result = component.getSagaName(book);

      expect(result).toBeNull();
    });

    it('should extract saga from title pattern (#1)', () => {
      setup();
      fixture.detectChanges();
      const book = { title: 'the fellowship of the ring (Middle Earth #1)', series: [], subject: [] } as any;

      const result = component.getSagaName(book);

      expect(result).toBeTruthy();
    });
  });

  /**
   * Pruebas para onReviewEditorInput.
   */
  describe('onReviewEditorInput()', () => {
    it('should set userReview from element innerText', () => {
      setup();
      fixture.detectChanges();
      const el = document.createElement('div');
      el.innerText = 'My review text';

      component.onReviewEditorInput(el);

      expect(component.userReview).toBe('My review text');
    });

    it('should set userReview to empty string when el is null', () => {
      setup();
      fixture.detectChanges();

      component.onReviewEditorInput(null);

      expect(component.userReview).toBe('');
    });
  });

  /**
   * Pruebas para openSagaBook.
   */
  describe('openSagaBook()', () => {
    it('should do nothing when sagaBook has no title', () => {
      setup();
      fixture.detectChanges();

      component.openSagaBook({ title: '' } as any);

      expect(bookSearchMock.searchBooks).not.toHaveBeenCalled();
    });

    it('should search and select first result', () => {
      setup();
      const mockBook = { title: 'HP1', key: '/works/OL1W' };
      bookSearchMock.searchBooks.mockReturnValue(of({ docs: [mockBook], numFound: 1 }));
      fixture.detectChanges();

      component.openSagaBook({ title: 'Harry Potter' } as any);

      expect(bookSearchMock.searchBooks).toHaveBeenCalled();
    });

    it('should set sagaNavigationError when no results found', () => {
      vi.useFakeTimers();
      setup();
      bookSearchMock.searchBooks.mockReturnValue(of({ docs: [], numFound: 0 }));
      fixture.detectChanges();

      component.openSagaBook({ title: 'Unknown Book' } as any);

      expect(component.sagaNavigationError).toBeTruthy();
      vi.advanceTimersByTime(2001);
      vi.useRealTimers();
    });

    it('should set sagaNavigationError on search error', () => {
      vi.useFakeTimers();
      setup();
      bookSearchMock.searchBooks.mockReturnValue(throwError(() => new Error('network error')));
      fixture.detectChanges();

      component.openSagaBook({ title: 'Error Book' } as any);

      expect(component.sagaNavigationError).toBeTruthy();
      vi.advanceTimersByTime(2001);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para serviceQuery getter.
   */
  describe('serviceQuery getter', () => {
    it('should return the current search query', () => {
      setup();
      bookSearchMock.getSearchQuery.mockReturnValue('some query');
      fixture.detectChanges();

      expect(component.serviceQuery).toBe('some query');
    });
  });

  /**
   * Pruebas para skeletonArray getter.
   */
  describe('skeletonArray getter', () => {
    it('should have length equal to limit', () => {
      setup();
      fixture.detectChanges();
      component.limit = 8;

      expect(component.skeletonArray).toHaveLength(8);
    });
  });

  /**
   * Pruebas para customLists getter.
   */
  describe('customLists getter', () => {
    it('should filter out profile lists', () => {
      setup();
      listasMock.getAll.mockReturnValue([
        { id: '1', nombre: 'My List', owner: 'testuser', libros: [] },
        { id: '2', nombre: 'Leyendo', owner: 'testuser', libros: [] }
      ]);
      listasSubject.next([
        { id: '1', nombre: 'My List', owner: 'testuser', libros: [] },
        { id: '2', nombre: 'Leyendo', owner: 'testuser', libros: [] }
      ]);
      listasMock.isProfileListName.mockImplementation((name: string) => name === 'Leyendo');
      fixture.detectChanges();

      const result = component.customLists;

      expect(result.every((l: any) => !listasMock.isProfileListName(l.nombre))).toBe(true);
    });
  });

  /**
   * Pruebas para addBookFromCard.
   */
  describe('addBookFromCard()', () => {
    it('should set error when no listId', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      const book = { title: 'Book', key: '/works/OL1W' } as any;

      component.addBookFromCard(book, '');

      expect(component.error).toBeTruthy();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });

    it('should add book to list when listId is valid', () => {
      vi.useFakeTimers();
      setup();
      listasMock.getAll.mockReturnValue([{ id: 'list1', nombre: 'My List', owner: 'testuser', libros: [] }]);
      listasMock.getById.mockReturnValue({ id: 'list1', nombre: 'My List', owner: 'testuser' });
      listasMock.isProfileListName.mockReturnValue(false);
      fixture.detectChanges();
      const book = { title: 'Book', key: '/works/OL1W' } as any;

      component.addBookFromCard(book, 'list1');

      expect(listasMock.addBookToList).toHaveBeenCalledWith('list1', book);
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });
  });
});
