import { TestBed, ComponentFixture } from '@angular/core/testing';
import { MenuComponent } from '../../../app/presentation/components/menu/menu.component';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { PeticionesService } from '../../../app/domain/services/peticiones.service';
import { ListasService } from '../../../app/domain/services/listas.service';
import { ReviewService } from '../../../app/domain/services/review.service';
import { NewsService } from '../../../app/domain/services/news.service';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

/**
 * Pruebas unitarias para el componente MenuComponent.
 */
describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;
  let bookSearchMock: any;
  let authMock: any;
  let peticionesMock: any;
  let listasMock: any;
  let reviewMock: any;
  let newsMock: any;
  let routerSpy: any;
  let isAdminSubject: BehaviorSubject<boolean>;
  let responseSubject: BehaviorSubject<any>;
  let listasSubject: BehaviorSubject<any[]>;
  let selectedBookSubject: BehaviorSubject<any>;
  let loadingSubject: BehaviorSubject<boolean>;
  let errorSubject: BehaviorSubject<string | null>;
  let successSubject: BehaviorSubject<string | null>;
  let currentPageSubject: BehaviorSubject<number>;
  let newsSubject: BehaviorSubject<any[]>;
  let reviewsSubject: BehaviorSubject<any[]>;

  /**
   * Función de configuración común para las pruebas, que inicializa los mocks y el componente.
   */
  function setup() {
    isAdminSubject = new BehaviorSubject(false);
    responseSubject = new BehaviorSubject<any>(null);
    listasSubject = new BehaviorSubject<any[]>([]);
    selectedBookSubject = new BehaviorSubject<any>(null);
    loadingSubject = new BehaviorSubject(false);
    errorSubject = new BehaviorSubject<string | null>(null);
    successSubject = new BehaviorSubject<string | null>(null);
    currentPageSubject = new BehaviorSubject(1);
    newsSubject = new BehaviorSubject<any[]>([]);
    reviewsSubject = new BehaviorSubject<any[]>([]);

    bookSearchMock = {
      response$: responseSubject.asObservable(),
      selectedBook$: selectedBookSubject.asObservable(),
      loading$: loadingSubject.asObservable(),
      error$: errorSubject.asObservable(),
      success$: successSubject.asObservable(),
      currentPage$: currentPageSubject.asObservable(),
      getCoverUrl: vi.fn().mockReturnValue('assets/default-book-cover.svg'),
      getFirstAuthor: vi.fn().mockReturnValue('Author'),
      getSagaName: vi.fn().mockReturnValue(null),
      isSaga: vi.fn().mockReturnValue(false),
      getEditionCount: vi.fn().mockReturnValue('3'),
      getCategories: vi.fn().mockReturnValue(['Fiction']),
      generateRatingArray: vi.fn().mockReturnValue(['full', 'full', 'full', 'empty', 'empty']),
      getSearchQuery: vi.fn().mockReturnValue(''),
      getNavigationOrigin: vi.fn().mockReturnValue(null),
      setCurrentPage: vi.fn(),
      setSelectedBook: vi.fn(),
      setNavigationOrigin: vi.fn(),
      setSuccess: vi.fn(),
      searchCurrent: vi.fn(),
      getBookByApiId: vi.fn().mockReturnValue(of(null))
    };

    authMock = {
      isAdmin: vi.fn().mockReturnValue(false),
      isAdmin$: isAdminSubject.asObservable(),
      getLocalAvatar: vi.fn().mockReturnValue(null)
    };

    peticionesMock = {
      getAll: vi.fn().mockReturnValue(of([]))
    };

    listasMock = {
      listas$: listasSubject.asObservable(),
      isProfileListName: vi.fn().mockReturnValue(false)
    };

    reviewMock = {
      reviews$: reviewsSubject.asObservable(),
      refreshAll: vi.fn()
    };

    newsMock = {
      news$: newsSubject.asObservable()
    };

    routerSpy = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [
        { provide: BookSearchService, useValue: bookSearchMock },
        { provide: AuthService, useValue: authMock },
        { provide: PeticionesService, useValue: peticionesMock },
        { provide: ListasService, useValue: listasMock },
        { provide: ReviewService, useValue: reviewMock },
        { provide: NewsService, useValue: newsMock },
        { provide: Router, useValue: routerSpy }
      ]
    });

    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /**
   * Función de limpieza después de cada prueba, que resetea el módulo de pruebas y limpia los mocks.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para el constructor del componente.
   */
  describe('constructor', () => {
    it('should set isAdmin from auth service', () => {
      setup();
      authMock.isAdmin.mockReturnValue(true);

      expect(component.isAdmin).toBe(false);
    });
  });

  /**
   * Pruebas para el método ngOnInit del componente.
   */
  describe('ngOnInit', () => {
    it('should subscribe to isAdmin$ and update isAdmin', () => {
      setup();

      isAdminSubject.next(true);

      expect(component.isAdmin).toBe(true);
    });

    it('should update searchResults when response$ emits', () => {
      setup();

      responseSubject.next({ docs: [{ title: 'Book1' }], numFound: 1 });

      expect(component.searchResults).toHaveLength(1);
      expect(component.totalResults).toBe(1);
    });

    it('should handle null response', () => {
      setup();

      responseSubject.next(null);

      expect(component.searchResults).toHaveLength(0);
      expect(component.totalResults).toBe(0);
    });

    it('should update selectedBook when selectedBook$ emits', () => {
      setup();
      const book = { title: 'Test', key: '/works/OL1W' } as any;

      selectedBookSubject.next(book);

      expect(component.selectedBook).toEqual(book);
    });

    it('should call reviewService.refreshAll when selectedBook becomes null', () => {
      setup();

      selectedBookSubject.next(null);

      expect(reviewMock.refreshAll).toHaveBeenCalled();
    });

    it('should update loading from loading$', () => {
      setup();

      loadingSubject.next(true);

      expect(component.loading).toBe(true);
    });

    it('should update error from error$', () => {
      setup();

      errorSubject.next('some error');

      expect(component.error).toBe('some error');
    });

    it('should update latestNews from news$ (max 3)', () => {
      setup();
      const news = Array.from({ length: 5 }, (_, i) => ({ id: i, title: `News ${i}` }));

      newsSubject.next(news);

      expect(component.latestNews).toHaveLength(3);
    });

    it('should update allReviews from reviews$', () => {
      setup();
      const reviews = [{ id: 1 }, { id: 2 }];

      reviewsSubject.next(reviews as any);

      expect(component.allReviews).toHaveLength(2);
    });

    it('should filter out profile lists from listas$', () => {
      setup();
      listasMock.isProfileListName.mockImplementation((name: string) => name === 'Leyendo');
      listasSubject.next([
        { id: '1', nombre: 'Leyendo', libros: [], isPrivate: false },
        { id: '2', nombre: 'Mi Lista', libros: [], isPrivate: false }
      ]);

      expect(component.userLists.some((l: any) => l.nombre === 'Leyendo')).toBe(false);
    });

    it('should load admin requests when isAdmin becomes true', () => {
      setup();

      isAdminSubject.next(true);

      expect(peticionesMock.getAll).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método ngOnDestroy del componente.
   */
  describe('ngOnDestroy', () => {
    it('should unsubscribe all subscriptions', () => {
      setup();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  /**
   * Pruebas para el método previousPage del componente.
   */
  describe('previousPage()', () => {
    it('should decrement page when above 1', () => {
      setup();
      component.currentPage = 3;
      component.totalResults = 100;

      component.previousPage();

      expect(bookSearchMock.setCurrentPage).toHaveBeenCalledWith(2);
      expect(bookSearchMock.searchCurrent).toHaveBeenCalled();
    });

    it('should do nothing on page 1', () => {
      setup();
      component.currentPage = 1;

      component.previousPage();

      expect(bookSearchMock.setCurrentPage).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método nextPage del componente.
   */
  describe('nextPage()', () => {
    it('should increment page when not on last page', () => {
      setup();
      component.currentPage = 1;
      component.totalResults = 100;

      component.nextPage();

      expect(bookSearchMock.setCurrentPage).toHaveBeenCalledWith(2);
    });

    it('should not go beyond last page', () => {
      setup();
      component.currentPage = 9;
      component.totalResults = 100;

      component.nextPage();

      expect(bookSearchMock.setCurrentPage).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método getTotalPages del componente.
   */
  describe('getTotalPages()', () => {
    it('should calculate correct total pages', () => {
      setup();
      component.totalResults = 36;

      expect(component.getTotalPages()).toBe(3);
    });

    it('should return 1 when no results', () => {
      setup();
      component.totalResults = 0;

      expect(component.getTotalPages()).toBe(1);
    });
  });

  /**
   * Pruebas para los métodos hasNextPage y hasPreviousPage del componente.
   */
  describe('hasNextPage() / hasPreviousPage()', () => {
    it('should return true for hasNextPage when not on last page', () => {
      setup();
      component.currentPage = 1;
      component.totalResults = 50;

      expect(component.hasNextPage()).toBe(true);
    });

    it('should return false for hasNextPage on last page', () => {
      setup();
      component.currentPage = 5;
      component.totalResults = 48;

      expect(component.hasNextPage()).toBe(false);
    });

    it('should return true for hasPreviousPage when not on first page', () => {
      setup();
      component.currentPage = 3;

      expect(component.hasPreviousPage()).toBe(true);
    });

    it('should return false for hasPreviousPage on first page', () => {
      setup();
      component.currentPage = 1;

      expect(component.hasPreviousPage()).toBe(false);
    });
  });

  /**
   * Pruebas para el método selectBook del componente.
   */
  describe('selectBook()', () => {
    it('should set navigation origin and selected book', () => {
      setup();
      const book = { title: 'Dune', key: '/works/OL1W' } as any;

      component.selectBook(book);

      expect(bookSearchMock.setNavigationOrigin).toHaveBeenCalledWith({ type: 'search' });
      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para el método backToSearch del componente.
   */
  describe('backToSearch()', () => {
    it('should clear selected book when no origin', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue(null);

      component.backToSearch();

      expect(bookSearchMock.setSelectedBook).toHaveBeenCalledWith(null);
    });

    it('should navigate to list when origin is "list"', () => {
      setup();
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'list', listId: 'abc' });

      component.backToSearch();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listas', 'abc']);
    });
  });

  /**
   * Pruebas para el método submitReview del componente.
   */
  describe('submitReview()', () => {
    it('should set success message when review is not empty', () => {
      setup();
      component.userReview = 'Great book!';

      component.submitReview();

      expect(bookSearchMock.setSuccess).toHaveBeenCalledWith('Review enviado correctamente');
    });

    it('should not set success when review is empty', () => {
      setup();
      component.userReview = '  ';

      component.submitReview();

      expect(bookSearchMock.setSuccess).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método addToList del componente.
   */
  describe('addToList()', () => {
    it('should set success message with selectedList name', () => {
      setup();
      component.selectedList = 'Mi Saga';

      component.addToList();

      expect(bookSearchMock.setSuccess).toHaveBeenCalledWith(expect.stringContaining('Mi Saga'));
    });
  });


  /**
   * Pruebas para el método getCoverUrl del componente.
   */
  describe('getCoverUrl()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      const book = { title: 'Test' } as any;

      component.getCoverUrl(book);

      expect(bookSearchMock.getCoverUrl).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para el método getFirstAuthor del componente.
   */
  describe('getFirstAuthor()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      const book = { authorNames: ['Tolkien'] } as any;

      component.getFirstAuthor(book);

      expect(bookSearchMock.getFirstAuthor).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para el método getSagaName del componente.
   */
  describe('getSagaName()', () => {
    it('should delegate to bookSearchService', () => {
      setup();

      component.getSagaName({ title: 'HP1' });

      expect(bookSearchMock.getSagaName).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método isSaga del componente.
   */
  describe('isSaga()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      const book = { title: 'Dune' } as any;

      component.isSaga(book);

      expect(bookSearchMock.isSaga).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para el método getEditionCount del componente.
   */
  describe('getEditionCount()', () => {
    it('should delegate to bookSearchService', () => {
      setup();
      const book = { editionCount: 5 } as any;

      component.getEditionCount(book);

      expect(bookSearchMock.getEditionCount).toHaveBeenCalledWith(book);
    });
  });

  /**
   * Pruebas para el método getCategories del componente.
   */
  describe('getCategories()', () => {
    it('should delegate to bookSearchService', () => {
      setup();

      component.getCategories({ subject: ['Fiction'] });

      expect(bookSearchMock.getCategories).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método generateRatingArray del componente.
   */
  describe('generateRatingArray()', () => {
    it('should delegate to bookSearchService', () => {
      setup();

      component.generateRatingArray(4);

      expect(bookSearchMock.generateRatingArray).toHaveBeenCalledWith(4);
    });
  });

  /**
   * Pruebas para el getter searchQuery del componente.
   */
  describe('searchQuery getter', () => {
    it('should return value from bookSearchService.getSearchQuery', () => {
      setup();
      bookSearchMock.getSearchQuery.mockReturnValue('tolkien');

      expect(component.searchQuery).toBe('tolkien');
    });
  });

  /**
   * Pruebas para el método showHero del componente.
   */
  describe('showHero()', () => {
    it('should return true when no query and no results', () => {
      setup();
      bookSearchMock.getSearchQuery.mockReturnValue('');
      bookSearchMock.getNavigationOrigin.mockReturnValue(null);
      component.searchResults = [];

      expect(component.showHero()).toBe(true);
    });

    it('should return false when there are search results', () => {
      setup();
      bookSearchMock.getSearchQuery.mockReturnValue('test');
      component.searchResults = [{ title: 'Book' } as any];

      expect(component.showHero()).toBe(false);
    });

    it('should return false when showing book from a list', () => {
      setup();
      component.selectedBook = { title: 'Book' } as any;
      bookSearchMock.getNavigationOrigin.mockReturnValue({ type: 'list', listId: '1' });

      expect(component.showHero()).toBe(false);
    });
  });

  /**
   * Pruebas para el método navigate del componente.
   */
  describe('navigate()', () => {
    it('should call router.navigateByUrl with path', () => {
      setup();

      component.navigate('/perfil');

      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/perfil');
    });
  });

  /**
   * Pruebas para el método openListFromMenu del componente.
   */
  describe('openListFromMenu()', () => {
    it('should set navigation origin and navigate to list', () => {
      setup();

      component.openListFromMenu('list1');

      expect(bookSearchMock.setNavigationOrigin).toHaveBeenCalledWith({ type: 'menu' });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/listas', 'list1']);
    });
  });

  /**
   * Pruebas para la paginación de listas del componente.
   */
  describe('List pagination', () => {
    it('pagedLists should return correct slice', () => {
      setup();
      component.userLists = Array.from({ length: 9 }, (_, i) => ({ id: `${i}`, nombre: `Lista ${i}`, libros: [] } as any));
      component.listPageIndex = 1;

      expect(component.pagedLists).toHaveLength(3);
    });

    it('listTotalPages should calculate correctly', () => {
      setup();
      component.userLists = Array.from({ length: 7 }, (_, i) => ({ id: `${i}`, nombre: `Lista ${i}`, libros: [] } as any));

      expect(component.listTotalPages).toBe(3);
    });

    it('listPageNext should increment index', () => {
      setup();
      component.userLists = Array.from({ length: 7 }, (_, i) => ({ id: `${i}`, nombre: `Lista ${i}`, libros: [] } as any));
      component.listPageIndex = 0;

      component.listPageNext();

      expect(component.listPageIndex).toBe(1);
    });

    it('listPagePrev should decrement index', () => {
      setup();
      component.listPageIndex = 2;

      component.listPagePrev();

      expect(component.listPageIndex).toBe(1);
    });

    it('listPagePrev should not go below 0', () => {
      setup();
      component.listPageIndex = 0;

      component.listPagePrev();

      expect(component.listPageIndex).toBe(0);
    });

    it('onListPageChange should set listPageIndex', () => {
      setup();

      component.onListPageChange(3);

      expect(component.listPageIndex).toBe(2);
    });
  });

  /**
   * Pruebas para la paginación de reseñas del componente.
   */
  describe('Review pagination', () => {
    it('pagedReviews should return correct slice', () => {
      setup();
      component.allReviews = Array.from({ length: 9 }, (_, i) => ({ id: i } as any));
      component.reviewPageIndex = 1;

      expect(component.pagedReviews).toHaveLength(3);
    });

    it('reviewTotalPages should calculate correctly', () => {
      setup();
      component.allReviews = Array.from({ length: 7 }, (_, i) => ({ id: i } as any));

      expect(component.reviewTotalPages).toBe(3);
    });

    it('reviewPageNext should increment index', () => {
      setup();
      component.allReviews = Array.from({ length: 7 }, (_, i) => ({ id: i } as any));
      component.reviewPageIndex = 0;

      component.reviewPageNext();

      expect(component.reviewPageIndex).toBe(1);
    });

    it('reviewPagePrev should decrement index', () => {
      setup();
      component.reviewPageIndex = 2;

      component.reviewPagePrev();

      expect(component.reviewPageIndex).toBe(1);
    });

    it('reviewPagePrev should not go below 0', () => {
      setup();
      component.reviewPageIndex = 0;

      component.reviewPagePrev();

      expect(component.reviewPageIndex).toBe(0);
    });

    it('onReviewPageChange should set reviewPageIndex', () => {
      setup();

      component.onReviewPageChange(2);

      expect(component.reviewPageIndex).toBe(1);
    });
  });

  /**
   * Pruebas para el método getListCover del componente.
   */
  describe('getListCover()', () => {
    it('should return empty string when no book at index', () => {
      setup();
      const lista = { id: '1', nombre: 'Test', libros: [], owner: 'u' } as any;

      expect(component.getListCover(lista, 0)).toBe('');
    });

    it('should return cover URL for book in list', () => {
      setup();
      bookSearchMock.getCoverUrl.mockReturnValue('https://covers.url/1-M.jpg');
      const lista = { id: '1', nombre: 'test', libros: [{ title: 'Book', key: '/works/OL1W' }] } as any;

      const result = component.getListCover(lista, 0);

      expect(bookSearchMock.getCoverUrl).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método getReviewCoverUrl del componente.
   */
  describe('getReviewCoverUrl()', () => {
    it('should return coverUrl if present on review', () => {
      setup();

      const result = component.getReviewCoverUrl({ coverUrl: 'https://img.url/cover.jpg' } as any);

      expect(result).toBe('https://img.url/cover.jpg');
    });

    it('should return default cover for custom books', () => {
      setup();

      const result = component.getReviewCoverUrl({ bookApiId: 'custom-123' } as any);

      expect(result).toBe('assets/default-book-cover.svg');
    });

    it('should return openlibrary URL for regular books', () => {
      setup();

      const result = component.getReviewCoverUrl({ bookApiId: '/works/OL12345W' } as any);

      expect(result).toContain('openlibrary.org');
    });
  });

  /**
   * Pruebas para el método getReviewAvatarUrl del componente.
   */
  describe('getReviewAvatarUrl()', () => {
    it('should return local avatar for user', () => {
      setup();
      authMock.getLocalAvatar.mockReturnValue('https://avatar.url/me.jpg');

      const result = component.getReviewAvatarUrl('testuser');

      expect(result).toBe('https://avatar.url/me.jpg');
    });

    it('should return null if no avatar', () => {
      setup();

      const result = component.getReviewAvatarUrl('noavatar');

      expect(result).toBeNull();
    });
  });

  /**
   * Pruebas para el método getReviewStars del componente.
   */
  describe('getReviewStars()', () => {
    it('should delegate to bookSearchService.generateRatingArray', () => {
      setup();

      component.getReviewStars(4);

      expect(bookSearchMock.generateRatingArray).toHaveBeenCalledWith(4);
    });
  });
});
