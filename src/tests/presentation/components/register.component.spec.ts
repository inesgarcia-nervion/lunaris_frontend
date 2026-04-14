import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from '../../../app/presentation/components/register/register.component';
import { AuthService } from '../../../app/domain/services/auth.service';
import { of, throwError } from 'rxjs';

/**
 * Pruebas para el componente RegisterComponent.
 */
describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authSpy: { register: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    authSpy = { register: vi.fn().mockReturnValue(of({})) };
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Limpieza después de cada prueba.
   */
  afterEach(() => {
    fixture.destroy();
  });

  /**
   * Pruebas para la creación del componente.
   */
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Pruebas para el método ngOnInit del componente.
   */
  it('ngOnInit hides body scroll', () => {
    expect(document.body.style.overflow).toBe('hidden');
  });

  /**
   * Pruebas para el método ngOnDestroy del componente.
   */
  it('ngOnDestroy restores body scroll', () => {
    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });

  /**
   * Pruebas para el método clearForm del componente.
   */
  it('clearForm resets all fields and messages', () => {
    component.username = 'testuser';
    component.email = 'test@test.com';
    component.password = 'pass123';
    component.error = 'err';
    component.success = 'ok';
    component.clearForm();
    expect(component.username).toBe('');
    expect(component.email).toBe('');
    expect(component.password).toBe('');
    expect(component.error).toBeNull();
    expect(component.success).toBeNull();
  });

  /**
   * Pruebas para el método submit del componente con campos faltantes.
   */
  it('submit with missing fields sets error', () => {
    component.username = '';
    component.email = 'email@test.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('rellena');
    expect(authSpy.register).not.toHaveBeenCalled();
  });

  /**
   * Pruebas para el método submit del componente con contraseña corta.
   */
  it('submit with short password sets error', () => {
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = '12345';
    component.submit();
    expect(component.error).toContain('6 caracteres');
  });

  /**
   * Pruebas para el método submit del componente con entradas válidas.
   */
  it('submit with valid inputs calls register', () => {
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = 'password123';
    component.submit();
    expect(authSpy.register).toHaveBeenCalledWith('user', 'email@test.com', 'password123');
  });

  /**
   * Pruebas para el método submit del componente en caso de éxito.
   */
  it('submit success shows message and redirects to /login', () => {
    vi.useFakeTimers();
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = 'password123';
    component.submit();
    expect(component.loading).toBe(false);
    expect(component.username).toBe('');
    vi.advanceTimersByTime(2000);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });

  /**
   * Pruebas para el método submit del componente manejando error 409.
   */
  it('submit handles 409 error', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 409 })));
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = 'password123';
    component.submit();
    expect(component.error).toContain('ya existe');
    expect(component.loading).toBe(false);
  });

  /**
   * Pruebas para el método submit del componente manejando error 400.
   */
  it('submit handles 400 error', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 400 })));
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('ya existe');
  });

  /**
   * Pruebas para el método submit del componente manejando error de conexión.
   */
  it('submit handles connection error (status 0)', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 0 })));
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('conectar');
  });

  /**
   * Pruebas para el método submit del componente manejando error genérico.
   */
  it('submit handles generic error', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 500 })));
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('Error');
  });

  /**
   * Pruebas para el método togglePassword del componente.
   */
  it('togglePassword toggles showPassword', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });
});
