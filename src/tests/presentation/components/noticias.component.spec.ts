import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoticiasComponent } from '../../../app/presentation/components/noticias/noticias.component';
import { NewsService } from '../../../app/domain/services/news.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { Router } from '@angular/router';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { Subject } from 'rxjs';

/**
 * Pruebas para el componente NoticiasComponent.
 */
describe('NoticiasComponent', () => {
  let component: NoticiasComponent;
  let fixture: ComponentFixture<NoticiasComponent>;
  let newsServiceMock: any;
  let authServiceMock: any;
  let routerSpy: any;
  let confirmMock: any;
  let newsSubject: Subject<any[]>;
  let isAdminSubject: Subject<boolean>;

  const sampleNews = [
    { id: '1', title: 'News 1', text: 'text 1', body: 'body 1', date: '2024-01-01' },
    { id: '2', title: 'News 2', text: 'text 2', body: 'body 2', date: '2024-01-02' }
  ];

  /**
   * Configura el entorno de pruebas para el componente, creando mocks para los servicios y estableciendo valores iniciales.
   */
  function setup() {
    newsSubject = new Subject<any[]>();
    isAdminSubject = new Subject<boolean>();
    newsServiceMock = {
      getAll: vi.fn().mockReturnValue(sampleNews),
      addNews: vi.fn(),
      removeNews: vi.fn(),
      news$: newsSubject.asObservable()
    };
    authServiceMock = {
      isAdmin: vi.fn().mockReturnValue(false),
      isAdmin$: isAdminSubject.asObservable()
    };
    routerSpy = { navigate: vi.fn() };
    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [NoticiasComponent],
      providers: [
        { provide: NewsService, useValue: newsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: ConfirmService, useValue: confirmMock }
      ]
    });

    fixture = TestBed.createComponent(NoticiasComponent);
    component = fixture.componentInstance;
  }

  /**
   * Limpia el entorno de pruebas después de cada test, reseteando el módulo de pruebas y limpiando los mocks.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para el método ngOnInit del componente.
   */
  describe('ngOnInit', () => {
    it('should load news and set isAdmin on init', () => {
      setup();
      fixture.detectChanges();

      expect(component.news).toEqual(sampleNews);
      expect(component.isAdmin).toBe(false);
    });

    it('should update news when news$ emits', () => {
      setup();
      fixture.detectChanges();

      const newNews = [{ id: '3', title: 'New', text: '', body: '' }];
      newsSubject.next(newNews);

      expect(component.news).toEqual(newNews);
    });

    it('should update isAdmin when isAdmin$ emits', () => {
      setup();
      fixture.detectChanges();

      isAdminSubject.next(true);

      expect(component.isAdmin).toBe(true);
    });
  });

  /**
   * Pruebas para el método updatePagination del componente.
   */
  describe('updatePagination()', () => {
    it('should set pagedNews correctly for first page', () => {
      setup();
      fixture.detectChanges();

      expect(component.pagedNews).toHaveLength(2);
    });

    it('should adjust currentPage when it exceeds totalPages', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 100;
      component.updatePagination();

      expect(component.currentPage).toBe(1);
    });
  });

  /**
   * Pruebas para el método onPageChange del componente.
   */
  describe('onPageChange()', () => {
    it('should set currentPage and update pagination', () => {
      const news6 = [...sampleNews, ...sampleNews, ...sampleNews];
      setup();
      newsServiceMock.getAll.mockReturnValue(news6);
      component.news = news6;
      component.pageSize = 2;
      fixture.detectChanges();

      component.onPageChange(2);

      expect(component.currentPage).toBe(2);
    });
  });

  /**
   * Pruebas para el método onFileChange del componente.
   */
  describe('openDetail()', () => {
    it('should navigate to noticias/:id', () => {
      setup();
      fixture.detectChanges();
      component.openDetail('42');
      expect(routerSpy.navigate).toHaveBeenCalledWith(['noticias', '42']);
    });
  });

  /**
   * Pruebas para el método hasCreateChanges del componente.
   */
  describe('hasCreateChanges()', () => {
    it('should return false when all fields are empty', () => {
      setup();
      fixture.detectChanges();
      expect(component.hasCreateChanges()).toBe(false);
    });

    it('should return true when title is set', () => {
      setup();
      fixture.detectChanges();
      component.title = 'Hello';
      expect(component.hasCreateChanges()).toBe(true);
    });

    it('should return true when imageData is set', () => {
      setup();
      fixture.detectChanges();
      component.imageData = 'data:image/png;base64,abc';
      expect(component.hasCreateChanges()).toBe(true);
    });

    it('should return true when body is set', () => {
      setup();
      fixture.detectChanges();
      component.body = 'Some body';
      expect(component.hasCreateChanges()).toBe(true);
    });
  });

  /**
   * Pruebas para el método addNews del componente.
   */
  describe('addNews()', () => {
    it('should not add news if user is not admin', () => {
      setup();
      fixture.detectChanges();
      component.title = 'Title';
      component.body = 'Body';

      component.addNews();

      expect(newsServiceMock.addNews).not.toHaveBeenCalled();
    });

    it('should set error if title is empty', () => {
      vi.useFakeTimers();
      setup();
      authServiceMock.isAdmin.mockReturnValue(true);
      component.isAdmin = true;
      fixture.detectChanges();
      component.title = '';
      component.body = 'Body';

      component.addNews();
      expect(component.error).toBeTruthy();

      vi.advanceTimersByTime(3001);
      vi.useRealTimers();
    });

    it('should set error if body is empty', () => {
      vi.useFakeTimers();
      setup();
      authServiceMock.isAdmin.mockReturnValue(true);
      component.isAdmin = true;
      fixture.detectChanges();
      component.title = 'Title';
      component.body = '';

      component.addNews();
      expect(component.error).toBeTruthy();

      vi.advanceTimersByTime(3001);
      vi.useRealTimers();
    });

    it('should call newsService.addNews and reset fields when admin + valid input', () => {
      setup();
      fixture.detectChanges();
      component.isAdmin = true;
      component.title = 'Title';
      component.body = 'Body text';
      component.text = 'Summary';
      component.imageData = 'data:image';

      component.addNews();

      expect(newsServiceMock.addNews).toHaveBeenCalledWith({
        title: 'Title',
        text: 'Summary',
        body: 'Body text',
        image: 'data:image'
      });
      expect(component.title).toBe('');
      expect(component.body).toBe('');
    });
  });

  /**
   * Pruebas para el método clearImage del componente.
   */
  describe('clearImage()', () => {
    it('should clear imageData', () => {
      setup();
      fixture.detectChanges();
      component.imageData = 'data:something';

      component.clearImage();

      expect(component.imageData).toBeNull();
    });
  });

  /**
   * Pruebas para el método onBodyInput del componente.
   */
  describe('onBodyInput()', () => {
    it('should extract text from element and set body', () => {
      setup();
      fixture.detectChanges();
      const el = document.createElement('div');
      el.textContent = 'Test content';

      component.onBodyInput(el);

      expect(component.body).toBe('Test content');
    });
  });

  /**
   * Pruebas para el método onBodyKeydown del componente.
   */
  describe('onBodyKeydown()', () => {
    it('should not throw when called', () => {
      setup();
      fixture.detectChanges();
      const el = document.createElement('div');
      const event = new KeyboardEvent('keydown', { key: 'a' });

      expect(() => component.onBodyKeydown(event, el)).not.toThrow();
    });
  });

  /**
   * Pruebas para el método openCreateModal del componente.
   */
  describe('openCreateModal()', () => {
    it('should set showCreateModal to true', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.showCreateModal = false;

      component.openCreateModal();
      vi.advanceTimersByTime(55);

      expect(component.showCreateModal).toBe(true);
      vi.useRealTimers();
    });
  });

  /**
   * Pruebas para el método closeCreateModal del componente.
   */
  describe('closeCreateModal()', () => {
    it('should reset all fields and close modal', () => {
      setup();
      fixture.detectChanges();
      component.showCreateModal = true;
      component.title = 'T';
      component.text = 'TX';
      component.body = 'B';
      component.imageData = 'img';
      component.error = 'err';

      component.closeCreateModal();

      expect(component.showCreateModal).toBe(false);
      expect(component.title).toBe('');
      expect(component.body).toBe('');
      expect(component.imageData).toBeNull();
      expect(component.error).toBeNull();
    });
  });

  /**
   * Pruebas para el método requestInlineDelete del componente.
   */
  describe('requestInlineDelete()', () => {
    it('should set pendingDeleteId when admin', () => {
      setup();
      fixture.detectChanges();
      component.isAdmin = true;

      component.requestInlineDelete('5');

      expect(component.pendingDeleteId).toBe('5');
    });

    it('should not set pendingDeleteId when not admin', () => {
      setup();
      component.isAdmin = false;
      fixture.detectChanges();

      component.requestInlineDelete('5');

      expect(component.pendingDeleteId).toBeNull();
    });
  });

  /**
   * Pruebas para el método removeConfirmed del componente.
   */
  describe('removeConfirmed()', () => {
    it('should call removeNews and clear pendingDeleteId when admin', async () => {
      setup();
      fixture.detectChanges();
      component.isAdmin = true;
      component.pendingDeleteId = '5';

      await component.removeConfirmed('5');

      expect(newsServiceMock.removeNews).toHaveBeenCalledWith('5');
      expect(component.pendingDeleteId).toBeNull();
    });

    it('should not call removeNews when not admin', async () => {
      setup();
      component.isAdmin = false;
      fixture.detectChanges();

      await component.removeConfirmed('5');

      expect(newsServiceMock.removeNews).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para el método cancelRemove del componente.
   */
  describe('cancelRemove()', () => {
    it('should clear pendingDeleteId', () => {
      setup();
      fixture.detectChanges();
      component.pendingDeleteId = '5';

      component.cancelRemove();

      expect(component.pendingDeleteId).toBeNull();
    });
  });

  /**
   * Pruebas para el método confirmRemove del componente.
   */
  describe('confirmRemove()', () => {
    it('should remove news when admin and confirm returns true', async () => {
      setup();
      fixture.detectChanges();
      component.isAdmin = true;
      confirmMock.confirm.mockResolvedValue(true);

      await component.confirmRemove('1');

      expect(newsServiceMock.removeNews).toHaveBeenCalledWith('1');
    });

    it('should not remove news when confirm returns false', async () => {
      setup();
      component.isAdmin = true;
      fixture.detectChanges();
      confirmMock.confirm.mockResolvedValue(false);

      await component.confirmRemove('1');

      expect(newsServiceMock.removeNews).not.toHaveBeenCalled();
    });

    it('should not remove news when not admin', async () => {
      setup();
      component.isAdmin = false;
      fixture.detectChanges();

      await component.confirmRemove('1');

      expect(newsServiceMock.removeNews).not.toHaveBeenCalled();
    });
  });
});
