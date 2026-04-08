import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { RegisterComponent } from '../../../app/presentation/components/register/register.component';
import { AuthService } from '../../../app/domain/services/auth.service';
import { of, throwError } from 'rxjs';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authSpy: { register: ReturnType<typeof vi.fn> };
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

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

  afterEach(() => {
    fixture.destroy();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit hides body scroll', () => {
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('ngOnDestroy restores body scroll', () => {
    fixture.destroy();
    expect(document.body.style.overflow).toBe('');
  });

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

  it('submit with missing fields sets error', () => {
    component.username = '';
    component.email = 'email@test.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('rellena');
    expect(authSpy.register).not.toHaveBeenCalled();
  });

  it('submit with short password sets error', () => {
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = '12345';
    component.submit();
    expect(component.error).toContain('6 caracteres');
  });

  it('submit with valid inputs calls register', () => {
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = 'password123';
    component.submit();
    expect(authSpy.register).toHaveBeenCalledWith('user', 'email@test.com', 'password123');
  });

  it('submit success shows message and redirects to /login', () => {
    vi.useFakeTimers();
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = 'password123';
    component.submit();
    // clearForm() is called after success, which resets success to null and clears form fields
    expect(component.loading).toBe(false);
    expect(component.username).toBe('');
    vi.advanceTimersByTime(2000);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });

  it('submit handles 409 error', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 409 })));
    component.username = 'user';
    component.email = 'email@test.com';
    component.password = 'password123';
    component.submit();
    expect(component.error).toContain('ya existe');
    expect(component.loading).toBe(false);
  });

  it('submit handles 400 error', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 400 })));
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('ya existe');
  });

  it('submit handles connection error (status 0)', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 0 })));
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('conectar');
  });

  it('submit handles generic error', () => {
    authSpy.register.mockReturnValue(throwError(() => ({ status: 500 })));
    component.username = 'u';
    component.email = 'e@e.com';
    component.password = 'pass123';
    component.submit();
    expect(component.error).toContain('Error');
  });

  it('togglePassword toggles showPassword', () => {
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });
});
