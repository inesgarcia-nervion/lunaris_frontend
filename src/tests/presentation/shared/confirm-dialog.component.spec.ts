import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ConfirmDialogComponent } from '../../../app/presentation/shared/confirm-dialog/confirm-dialog.component';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { Subject } from 'rxjs';

/**
 * Pruebas para el componente ConfirmDialogComponent.
 */
describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let component: ConfirmDialogComponent;
  let requestsSubject: Subject<{ message: string; resolve: (v: boolean) => void }>;
  let confirmServiceMock: { requests$: any };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    requestsSubject = new Subject();
    confirmServiceMock = { requests$: requestsSubject.asObservable() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [{ provide: ConfirmService, useValue: confirmServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Prueba de creación del componente.
   */
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Prueba de visibilidad por defecto del componente.
   */
  it('should be hidden by default', () => {
    expect(component.show).toBe(false);
    expect(component.message).toBe('');
  });

  /**
   * Prueba de visualización del diálogo y establecimiento del mensaje cuando se recibe una solicitud.
   */
  it('should show dialog and set message when request is received', () => {
    requestsSubject.next({ message: 'Delete item?', resolve: () => {} });
    expect(component.show).toBe(true);
    expect(component.message).toBe('Delete item?');
  });

  /**
   * Prueba de uso del mensaje por defecto cuando la solicitud tiene un mensaje vacío.
   */
  it('should use default message when request has empty message', () => {
    requestsSubject.next({ message: '', resolve: () => {} });
    expect(component.message).toBe('¿Estás seguro?');
  });

  /**
   * Prueba de confirmación afirmativa.
   */
  it('confirmYes should resolve with true and close dialog', () => {
    let resolved: boolean | null = null;
    requestsSubject.next({ message: 'Sure?', resolve: (v) => (resolved = v) });
    component.confirmYes();
    expect(resolved).toBe(true);
    expect(component.show).toBe(false);
    expect(component.message).toBe('');
  });

  /**
   * Prueba de confirmación negativa.
   */
  it('confirmNo should resolve with false and close dialog', () => {
    let resolved: boolean | null = null;
    requestsSubject.next({ message: 'Sure?', resolve: (v) => (resolved = v) });
    component.confirmNo();
    expect(resolved).toBe(false);
    expect(component.show).toBe(false);
  });

  /**
   * Prueba de confirmación afirmativa sin solicitud pendiente.
   */
  it('confirmYes without a pending request does not throw', () => {
    expect(() => component.confirmYes()).not.toThrow();
  });

  /**
   * Prueba de confirmación negativa sin solicitud pendiente.
   */
  it('confirmNo without a pending request does not throw', () => {
    expect(() => component.confirmNo()).not.toThrow();
  });

  /**
   * Prueba de actualización del mensaje en una nueva solicitud después de que la anterior fue resuelta.
   */
  it('should update message on new request after previous was resolved', () => {
    requestsSubject.next({ message: 'First', resolve: () => {} });
    component.confirmYes();
    requestsSubject.next({ message: 'Second', resolve: () => {} });
    expect(component.message).toBe('Second');
    expect(component.show).toBe(true);
  });
});
