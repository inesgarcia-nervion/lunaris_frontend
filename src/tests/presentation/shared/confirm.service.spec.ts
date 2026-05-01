import { TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';

/**
 * Pruebas para el servicio ConfirmService.
 */
describe('ConfirmService', () => {
  let service: ConfirmService;

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConfirmService] });
    service = TestBed.inject(ConfirmService);
  });

  /**
   * Prueba de creación del servicio.
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Prueba de que confirm devuelve una Promesa.
   */
  it('confirm should return a Promise', () => {
    const result = service.confirm('test?');
    expect(result).toBeInstanceOf(Promise);
    service.requests$.subscribe(({ resolve }) => resolve(false));
  });

  /**
   * Prueba de que confirm emite una solicitud con el mensaje correcto.
   */
  it('confirm should emit a request with the correct message', () => {
    let emitted: { message: string; resolve: (v: boolean) => void } | null = null;
    service.requests$.subscribe(req => (emitted = req));
    service.confirm('Are you sure?');
    expect(emitted).not.toBeNull();
    expect(emitted!.message).toBe('Are you sure?');
  });

  /**
   * Prueba de que confirmar true resuelve la Promesa con true.
   */
  it('confirming true resolves the Promise with true', async () => {
    service.requests$.subscribe(({ resolve }) => resolve(true));
    const result = await service.confirm('Proceed?');
    expect(result).toBe(true);
  });

  /**
   * Prueba de que confirmar false resuelve la Promesa con false.
   */
  it('confirming false resolves the Promise with false', async () => {
    service.requests$.subscribe(({ resolve }) => resolve(false));
    const result = await service.confirm('Cancel?');
    expect(result).toBe(false);
  });

  /**
   * Prueba de que requests$ no emite antes de que se llame a confirm.
   */
  it('requests$ should not emit before confirm is called', () => {
    let emitted = false;
    service.requests$.subscribe(() => (emitted = true));
    expect(emitted).toBe(false);
  });

  /**
   * Prueba de que múltiples llamadas emiten independientemente.
   */
  it('multiple calls each emit independently', () => {
    const messages: string[] = [];
    service.requests$.subscribe(({ message, resolve }) => {
      messages.push(message);
      resolve(false);
    });
    service.confirm('First');
    service.confirm('Second');
    expect(messages).toEqual(['First', 'Second']);
  });
});
