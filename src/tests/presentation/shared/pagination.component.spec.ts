import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PaginationComponent } from '../../../app/presentation/shared/pagination/pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;
  let component: PaginationComponent;

  function create(inputs?: Partial<{ totalItems: number; pageSize: number; currentPage: number; maxPages: number; leadingPages: number }>): void {
    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    if (inputs) {
      Object.assign(component, inputs);
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();
  });

  it('should be created', () => {
    create();
    expect(component).toBeTruthy();
  });

  // ── totalPages getter ─────────────────────────────────────────────────

  it('totalPages should be 1 when totalItems is 0', () => {
    create({ totalItems: 0, pageSize: 10 });
    expect(component.totalPages).toBe(1);
  });

  it('totalPages should compute correctly', () => {
    create({ totalItems: 25, pageSize: 10 });
    expect(component.totalPages).toBe(3);
  });

  it('totalPages rounds up correctly', () => {
    create({ totalItems: 11, pageSize: 10 });
    expect(component.totalPages).toBe(2);
  });

  // ── pagesToShow getter ────────────────────────────────────────────────

  it('pagesToShow returns [1] for single page', () => {
    create({ totalItems: 5, pageSize: 10 });
    expect(component.pagesToShow).toEqual([1]);
  });

  it('pagesToShow includes first and last page', () => {
    create({ totalItems: 100, pageSize: 10, currentPage: 5, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(10);
  });

  it('pagesToShow includes ellipsis (-1) before window when gap on left', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 10, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages).toContain(-1);
  });

  it('pagesToShow includes ellipsis (-2) after window when gap on right', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 1, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages).toContain(-2);
  });

  it('pagesToShow without gap does not duplicate page 1', () => {
    create({ totalItems: 20, pageSize: 10, currentPage: 1, leadingPages: 5 });
    const count1 = component.pagesToShow.filter(p => p === 1).length;
    expect(count1).toBe(1);
  });

  it('pagesToShow: window at end does not add unnecessary pages', () => {
    create({ totalItems: 30, pageSize: 10, currentPage: 3, leadingPages: 3 });
    const pages = component.pagesToShow;
    expect(pages).not.toContain(0);
  });

  // ── selectPage() ──────────────────────────────────────────────────────

  it('selectPage emits pageChange event', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 1 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(3);
    expect(emitted).toContain(3);
  });

  it('selectPage does not emit when same page selected', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 2 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(2);
    expect(emitted).toHaveLength(0);
  });

  it('selectPage clamps to min page 1', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 2 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(-5);
    expect(emitted).toContain(1);
    expect(component.currentPage).toBe(1);
  });

  it('selectPage clamps to max totalPages', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 1 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.selectPage(999);
    expect(emitted).toContain(5);
    expect(component.currentPage).toBe(5);
  });

  it('selectPage updates currentPage', () => {
    create({ totalItems: 50, pageSize: 10, currentPage: 1 });
    component.selectPage(4);
    expect(component.currentPage).toBe(4);
  });

  // ── onClick() ─────────────────────────────────────────────────────────

  it('onClick with regular page number calls selectPage', () => {
    create({ totalItems: 100, pageSize: 10, currentPage: 1, leadingPages: 3 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.onClick(5);
    expect(emitted).toContain(5);
  });

  it('onClick with -1 (left ellipsis) navigates backward', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 10, leadingPages: 3 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.onClick(-1);
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[0]).toBeLessThan(10);
  });

  it('onClick with -2 (right ellipsis) navigates forward', () => {
    create({ totalItems: 200, pageSize: 10, currentPage: 1, leadingPages: 3 });
    const emitted: number[] = [];
    component.pageChange.subscribe((p: number) => emitted.push(p));
    component.onClick(-2);
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted[0]).toBeGreaterThan(1);
  });
});
