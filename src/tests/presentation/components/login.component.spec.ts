import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LoginComponent } from '../../../app/presentation/components/login/login.component';
import { AuthService } from '../../../app/domain/services/auth.service';
import { ListasService } from '../../../app/domain/services/listas.service';
import { of, throwError } from 'rxjs';

/**
 * Pruebas para LoginComponent.
 */
describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: { login: ReturnType<typeof vi.fn> };
  let listasSpySvc: { assignUnownedListsToCurrentUser: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    authSpy = { login: vi.fn().mockReturnValue(of('fake.jwt.token')) };
    listasSpySvc = { assignUnownedListsToCurrentUser: vi.fn() };
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: ListasService, useValue: listasSpySvc },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Limpieza después de cada prueba.
   */
  afterEach(() => {
    fixture.destroy();
    localStorage.clear();
    sessionStorage.clear();
  });

  /**
   * Prueba de creación del componente.
   */
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Prueba de ngOnInit para ocultar el scroll del body.
   */
  it('ngOnInit hides body scroll', () => {
    expect(document.body.style.overflow).toBe('hidden');
  });

  /**
   * Prueba de ngOnInit para restaurar credenciales recordadas desde localStorage.
   */
  it('ngOnInit restores remembered credentials from localStorage', async () => {
    fixture.destroy();
    localStorage.setItem('lunaris_remember', 'true');
    localStorage.setItem('lunaris_current_user', 'alice');
    localStorage.setItem('lunaris_remember_pass', btoa('mypassword'));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: ListasService, useValue: listasSpySvc },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.rememberMe).toBe(true);
    expect(component.username).toBe('alice');
    expect(component.password).toBe('mypassword');
  });

  /**
   * Prueba de ngOnInit para cargar el nombre de usuario desde sessionStorage cuando no se recuerda.
   */
  it('ngOnInit loads username from sessionStorage when not remembered', async () => {
    fixture.destroy();
    sessionStorage.setItem('lunaris_current_user', 'bob');

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: ListasService, useValue: listasSpySvc },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.username).toBe('bob');
  });

  /**
   * Prueba de ngOnDestroy para restaurar el scroll del body.
   */
  it('ngOnDestroy restores body scroll', () => {
    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });

  /**
   * Prueba de submit con nombre de usuario vacío.
   */
  it('submit with empty username sets error', () => {
    component.username = '';
    component.password = 'pass';
    component.submit();
    expect(component.error).toContain('usuario y contraseña');
    expect(authSpy.login).not.toHaveBeenCalled();
  });

  /**
   * Prueba de submit con contraseña vacía.
   */
  it('submit with empty password sets error', () => {
    component.username = 'user';
    component.password = '';
    component.submit();
    expect(component.error).toContain('usuario y contraseña');
  });

  /**
   * Prueba de submit con entradas válidas.
   */
  it('submit with valid inputs calls auth.login', () => {
    component.username = 'user';
    component.password = 'pass';
    component.submit();
    expect(authSpy.login).toHaveBeenCalledWith('user', 'pass', false);
  });

  /**
   * Prueba de submit con rememberMe activado.
   */
  it('submit with rememberMe calls auth.login with rememberMe=true', () => {
    component.username = 'user';
    component.password = 'pass';
    component.rememberMe = true;
    component.submit();
    expect(authSpy.login).toHaveBeenCalledWith('user', 'pass', true);
  });

  /**
   * Prueba de submit con éxito, asignando propiedad de listas, guardando remember-me y navegando.
   */
  it('submit on success assigns list ownership, saves remember-me and navigates', () => {
    component.username = 'user';
    component.password = 'pass';
    component.rememberMe = true;
    component.submit();
    expect(listasSpySvc.assignUnownedListsToCurrentUser).toHaveBeenCalledWith('user');
    expect(localStorage.getItem('lunaris_remember')).toBe('true');
    expect(localStorage.getItem('lunaris_current_user')).toBe('user');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de submit con éxito sin rememberMe, guardando en sessionStorage.
   */
  it('submit on success without rememberMe saves to session', () => {
    component.username = 'ann';
    component.password = 'pass1';
    component.rememberMe = false;
    component.submit();
    expect(sessionStorage.getItem('lunaris_current_user')).toBe('ann');
  });

  /**
   * Prueba de submit manejando error 401.
   */
  it('submit handles login error 401', () => {
    authSpy.login.mockReturnValue(throwError(() => ({ status: 401 })));
    component.username = 'user';
    component.password = 'wrong';
    component.submit();
    expect(component.error).toContain('incorrectos');
    expect(component.loading).toBe(false);
  });

  /**
   * Prueba de submit manejando error de conexión (status 0).
   */
  it('submit handles connection error (status 0)', () => {
    authSpy.login.mockReturnValue(throwError(() => ({ status: 0 })));
    component.username = 'user';
    component.password = 'pass';
    component.submit();
    expect(component.error).toContain('conectar');
  });

  /**
   * Prueba de submit manejando error genérico.
   */
  it('submit handles generic error', () => {
    authSpy.login.mockReturnValue(throwError(() => ({ status: 500 })));
    component.username = 'user';
    component.password = 'pass';
    component.submit();
    expect(component.error).toContain('Error');
  });

  /**
   * Prueba de submit manejando error de listasService.
   */
  it('submit handles listasService error gracefully', () => {
    listasSpySvc.assignUnownedListsToCurrentUser.mockImplementation(() => { throw new Error('fail'); });
    component.username = 'user';
    component.password = 'pass';
    component.submit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
  });

  /**
   * Prueba de togglePassword.
   */
  it('togglePassword toggles showPassword', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });

  /**
   * Prueba de ngOnInit manejando codificación btoa inválida.
   */
  it('ngOnInit handles invalid btoa encoding gracefully', async () => {
    fixture.destroy();
    localStorage.setItem('lunaris_remember', 'true');
    localStorage.setItem('lunaris_current_user', 'grace');
    localStorage.setItem('lunaris_remember_pass', 'NOT_VALID_BASE64!!!@');

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authSpy },
        { provide: ListasService, useValue: listasSpySvc },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.username).toBe('grace');
  });
});
