import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { RecuperarContrasenaComponent } from '../../../app/presentation/components/recuperar-contrasena/recuperar-contrasena.component';

/**
 * Pruebas para el componente RecuperarContrasenaComponent.
 */
describe('RecuperarContrasenaComponent', () => {
  let fixture: ComponentFixture<RecuperarContrasenaComponent>;
  let component: RecuperarContrasenaComponent;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RecuperarContrasenaComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarContrasenaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  /**
   * Verificación después de cada prueba.
   */
  afterEach(() => httpMock.verify());

  /**
   * Prueba de creación del componente.
   */
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Prueba de envío con correo vacío.
   */
  it('submit with empty email sets error', () => {
    component.email = '';
    component.submit();
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de envío con correo válido.
   */
  it('submit with valid email sends POST request', () => {
    component.email = 'test@test.com';
    component.submit();
    expect(component.loading).toBe(true);
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Email sent' });
    expect(component.message).toBe('Email sent');
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de envío cuando la respuesta no tiene el campo message.
   */
  it('submit uses default message when response has no message field', () => {
    component.email = 'a@b.com';
    component.submit();
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    req.flush({});
    expect(component.message).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de manejo de error de conexión (estado 0).
   */
  it('submit handles connection error (status 0)', () => {
    component.email = 'a@b.com';
    component.submit();
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    req.flush('connection refused', { status: 0, statusText: '' });
    expect(component.error).toContain('conectar');
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de manejo de error 404.
   */
  it('submit handles 404 error', () => {
    component.email = 'a@b.com';
    component.submit();
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    req.flush({ error: 'No account' }, { status: 404, statusText: 'Not Found' });
    expect(component.error).toContain('No account');
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de manejo de error 404 sin cuerpo de error.
   */
  it('submit handles 404 without error body', () => {
    component.email = 'a@b.com';
    component.submit();
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    req.flush({}, { status: 404, statusText: 'Not Found' });
    expect(component.error).toBeTruthy();
  });

  /**
   * Prueba de manejo de error genérico del servidor.
   */
  it('submit handles generic server error', () => {
    component.email = 'a@b.com';
    component.submit();
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    req.flush({ error: 'Server issue' }, { status: 500, statusText: 'Internal Server Error' });
    expect(component.error).toContain('Server issue');
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de manejo de error genérico sin cuerpo de respuesta.
   */
  it('submit handles generic error without body', () => {
    component.email = 'a@b.com';
    component.submit();
    const req = httpMock.expectOne('http://localhost:8080/auth/forgot-password');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    expect(component.error).toBeTruthy();
  });

  /**
   * Prueba de limpieza de errores previos al reenvío.
   */
  it('submit clears previous error on re-submit', () => {
    component.error = 'old error';
    component.email = 'a@b.com';
    component.submit();
    expect(component.error).toBeNull();
    httpMock.expectOne('http://localhost:8080/auth/forgot-password').flush({});
  });
});
