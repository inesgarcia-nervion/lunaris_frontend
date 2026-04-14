import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NoticiasDetailComponent } from '../../../app/presentation/components/noticias/noticias-detail.component';
import { ActivatedRoute } from '@angular/router';
import { NewsService } from '../../../app/domain/services/news.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

/**
 * Pruebas para el componente NoticiasDetailComponent.
 */
describe('NoticiasDetailComponent', () => {
  let component: NoticiasDetailComponent;
  let fixture: ComponentFixture<NoticiasDetailComponent>;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };
  let newsServiceMock: { getAll: ReturnType<typeof vi.fn> };
  let locationMock: { back: ReturnType<typeof vi.fn> };
  let paramMapGet: ReturnType<typeof vi.fn>;

  /**
   * Configura el entorno de pruebas para el componente, permitiendo simular diferentes escenarios de ID y noticias.
   * @param id El ID de la noticia a buscar, o null para simular ausencia de ID.
   * @param newsItems Un array de noticias para simular la respuesta del servicio, por defecto vacío.
   */
  function setup(id: string | null, newsItems: any[] = []) {
    paramMapGet = vi.fn().mockReturnValue(id);
    newsServiceMock = { getAll: vi.fn().mockReturnValue(newsItems) };
    routerSpy = { navigate: vi.fn() };
    locationMock = { back: vi.fn() };

    TestBed.configureTestingModule({
      imports: [NoticiasDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: paramMapGet } } } },
        { provide: NewsService, useValue: newsServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationMock }
      ]
    });

    fixture = TestBed.createComponent(NoticiasDetailComponent);
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
    it('should set noticia when id matches a news item', () => {
      const news = [{ id: '1', title: 'Test', text: '', body: '' }];
      setup('1', news);
      fixture.detectChanges();

      expect(component.noticia).toEqual(news[0]);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to /noticias when id is null', () => {
      setup(null, []);
      fixture.detectChanges();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/noticias']);
      expect(component.noticia).toBeNull();
    });

    it('should navigate to /noticias when news item not found', () => {
      const news = [{ id: '2', title: 'Other', text: '', body: '' }];
      setup('99', news);
      fixture.detectChanges();

      expect(component.noticia).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/noticias']);
    });
  });

  /**
   * Pruebas para el método back del componente.
   */
  describe('back()', () => {
    it('should call location.back()', () => {
      setup('1', [{ id: '1', title: 'Test', text: '', body: '' }]);
      fixture.detectChanges();

      component.back();

      expect(locationMock.back).toHaveBeenCalled();
    });
  });
});
