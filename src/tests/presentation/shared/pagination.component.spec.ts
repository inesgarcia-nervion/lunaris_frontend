import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PaginationComponent } from '../../../app/presentation/shared/pagination/pagination.component';

/**
 * Pruebas para el PaginationComponent.
 */
describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  /**
   * Función auxiliar para crear el componente con entradas personalizadas.
   * @param inputs Opcionalmente, un objeto con propiedades para configurar las entradas del componente.
   */
  function create(inputs?: Partial<{ totalItems: number; pageSize: number; currentPage: number; maxPages: number; leadingPages: number }>): void {
    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    if (inputs) {
      Object.assign(component, inputs);
    }
    fixture.detectChanges();
  }

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();
  });

  /**
   * Prueba de que el componente se crea correctamente.
   */
  it('should be created', () => {
    create();
    expect(component).toBeTruthy();
  });

  /**
   * Prueba de que totalPages devuelve 1 cuando totalItems es 0.
   */
  it('totalPages should be 1 when totalItems is 0', () => {
    create({ totalItems: 0, pageSize: 10 });
    expect(component.totalPages).toBe(1);
  });

  /**
   * Prueba de que totalPages se calcula correctamente.
   */
  it('totalPages should compute correctly', () => {
    create({ totalItems: 25, pageSize: 10 });
    expect(component.totalPages).toBe(3);
  });

  /**
   * Prueba de que totalPages redondea correctamente hacia arriba.
   */
  it('totalPages rounds up correctly', () => {
    create({ totalItems: 11, pageSize: 10 });
    expect(component.totalPages).toBe(2);
  });

  /**
   * Prueba de que pagesToShow devuelve [1] para una sola página.
   */
  it('pagesToShow returns [1] for single page', () => {
    create({ totalItems: 5, pageSize: 10 });
    expect(component.pagesToShow).toEqual([1]);
  });

  /**
   * Prueba de que pagesToShow incluye la primera y la última página.
   */
  it('pagesToShow includes first and last page', () => {
    create({ totalItems: 100, pageSize: 10, currentPage: 5, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(10);
  });

  /**
   * Prueba de que pagesToShow incluye elipsis (-1) antes de la ventana cuando hay un espacio a la izquierda.
   */
  it('pagesToShow includes ellipsis (-1) before window when gap on left', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 10, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages).toContain(-1);
  });

  /**
   * Prueba de que pagesToShow incluye elipsis (-2) después de la ventana cuando hay un espacio a la derecha.
   */
  it('pagesToShow includes ellipsis (-2) after window when gap on right', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 1, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages).toContain(-2);
  });

  /**
   * Prueba de que pagesToShow no duplica la página 1 cuando no hay espacio.
   */
  it('pagesToShow without gap does not duplicate page 1', () => {
    create({ totalItems: 20, pageSize: 10, currentPage: 1, leadingPages: 5 });
    const count1 = component.pagesToShow.filter(p => p === 1).length;
    expect(count1).toBe(1);
  });

  /**
   * Prueba de que pagesToShow no agrega páginas innecesarias al final de la ventana.
   */
  it('pagesToShow: window at end does not add unnecessary pages', () => {
    create({ totalItems: 30, pageSize: 10, currentPage: 3, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages).not.toContain(0);
  });

  /**
   * Prueba de que selectPage emite el evento pageChange.
   */
  it('selectPage emits pageChange event', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 1 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(3);
    expect(emitted).toContain(3);
  });

  /**
   * Prueba de que selectPage no emite el evento pageChange cuando se selecciona la misma página.
   */
  it('selectPage does not emit when same page selected', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 2 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(2);
    expect(emitted).toHaveLength(0);
  });

  /**
   * Prueba de que selectPage ajusta al valor mínimo de página 1.
   */
  it('selectPage clamps to min page 1', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 2 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(-5);
    expect(emitted).toContain(1);
    expect(component.currentPage).toBe(1);
  });

  /**
   * Prueba de que selectPage ajusta al valor máximo de totalPages.
   */
  it('selectPage clamps to max totalPages', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 1 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(999);
    expect(emitted).toContain(5);
    expect(component.currentPage).toBe(5);
  });

  /**
   * Prueba de que selectPage actualiza currentPage.
   */
  it('selectPage updates currentPage', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 1 });
    component.selectPage(4);
    expect(component.currentPage).toBe(4);
  });

  /**
   * Prueba de que onClick con un número de página regular llama a selectPage.
   */
  it('onClick with regular page number calls selectPage', () => {
    create({ totalItems: 100, pageSize: 10, currentPage: 1, leadingPages: 3 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.onClick(5);
    expect(emitted).toContain(5);
  });

  /**
   * Prueba de que onClick con -1 (elipsis izquierda) navega hacia atrás.
   */
  it('onClick with -1 (left ellipsis) navigates backward', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 10, leadingPages: 3 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.onClick(-1);
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[0]).toBeLessThan(10);
  });

  /**
   * Prueba de que onClick con -2 (elipsis derecha) navega hacia adelante.
   */
  it('onClick with -2 (right ellipsis) navigates forward', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 1, leadingPages: 3 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.onClick(-2);
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[0]).toBeGreaterThan(1);
  });
});
