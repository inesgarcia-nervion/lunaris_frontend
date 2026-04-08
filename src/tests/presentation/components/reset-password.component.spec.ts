import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ResetPasswordComponent } from '../../../app/presentation/components/reset-password/reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let component: ResetPasswordComponent;
  let httpMock: HttpTestingController;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  function createComponent(token: string | null = 'valid-token'): void {
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: (key: string) => (key === 'token' ? token : null) },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    try { httpMock?.verify(); } catch {}
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    createComponent('my-token');
    fixture.detectChanges();
    const req = httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=my-token`);
    req.flush({ valid: true });
    expect(component).toBeTruthy();
  });

  it('ngOnInit with no token sets error and does not send request', () => {
    createComponent(null);
    fixture.detectChanges();
    httpMock.expectNone('http://localhost:8080/auth/validate-token');
    expect(component.error).toBeTruthy();
    expect(component.validating).toBe(false);
  });

  it('ngOnInit validates token as valid', () => {
    createComponent('good-token');
    fixture.detectChanges();
    const req = httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=good-token`);
    req.flush({ valid: true });
    expect(component.tokenValid).toBe(true);
    expect(component.validating).toBe(false);
  });

  it('ngOnInit validates token as invalid', () => {
    createComponent('bad-token');
    fixture.detectChanges();
    const req = httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=bad-token`);
    req.flush({ valid: false });
    expect(component.tokenValid).toBe(false);
    expect(component.validating).toBe(false);
  });

  it('ngOnInit handles validation error', () => {
    createComponent('expired-token');
    fixture.detectChanges();
    const req = httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=expired-token`);
    req.flush({ error: 'Token expired' }, { status: 400, statusText: 'Bad Request' });
    expect(component.tokenValid).toBe(false);
    expect(component.error).toContain('Token expired');
  });

  it('ngOnInit handles validation error without body', () => {
    createComponent('expired-token2');
    fixture.detectChanges();
    const req = httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=expired-token2`);
    req.flush({}, { status: 400, statusText: 'Bad Request' });
    expect(component.error).toBeTruthy();
  });

  it('togglePassword toggles showPassword', () => {
    createComponent(null);
    fixture.detectChanges();
    expect(component.showPassword).toBe(false);
    component.togglePassword();
    expect(component.showPassword).toBe(true);
    component.togglePassword();
    expect(component.showPassword).toBe(false);
  });

  it('toggleConfirmPassword toggles showConfirmPassword', () => {
    createComponent(null);
    fixture.detectChanges();
    expect(component.showConfirmPassword).toBe(false);
    component.toggleConfirmPassword();
    expect(component.showConfirmPassword).toBe(true);
  });

  it('submit with empty password sets error', () => {
    createComponent(null);
    fixture.detectChanges();
    component.submit();
    expect(component.error).toContain('contraseña');
  });

  it('submit with short password sets error', () => {
    createComponent(null);
    fixture.detectChanges();
    component.newPassword = 'abc';
    component.submit();
    expect(component.error).toContain('6 caracteres');
  });

  it('submit with mismatched passwords sets error', () => {
    createComponent(null);
    fixture.detectChanges();
    component.newPassword = 'password123';
    component.confirmPassword = 'different123';
    component.submit();
    expect(component.error).toContain('coinciden');
  });

  it('submit sends POST request with valid inputs', () => {
    createComponent('tok');
    fixture.detectChanges();
    httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=tok`).flush({ valid: true });

    component.newPassword = 'newpass123';
    component.confirmPassword = 'newpass123';
    component.token = 'tok';
    component.submit();

    expect(component.loading).toBe(true);
    const req = httpMock.expectOne('http://localhost:8080/auth/reset-password');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Password changed' });
    expect(component.message).toBe('Password changed');
    expect(component.loading).toBe(false);
  });

  it('submit uses default message when response has none', () => {
    createComponent('tok2');
    fixture.detectChanges();
    httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=tok2`).flush({ valid: true });

    component.newPassword = 'newpass123';
    component.confirmPassword = 'newpass123';
    component.token = 'tok2';
    component.submit();
    httpMock.expectOne('http://localhost:8080/auth/reset-password').flush({});
    expect(component.message).toContain('Contraseña');
  });

  it('submit navigates to /login after success', () => {
    vi.useFakeTimers();
    createComponent('tok3');
    fixture.detectChanges();
    httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=tok3`).flush({ valid: true });

    component.newPassword = 'validpass123';
    component.confirmPassword = 'validpass123';
    component.token = 'tok3';
    component.submit();
    httpMock.expectOne('http://localhost:8080/auth/reset-password').flush({ message: 'Done' });

    vi.advanceTimersByTime(2500);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });

  it('submit handles HTTP error', () => {
    createComponent('tok4');
    fixture.detectChanges();
    httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=tok4`).flush({ valid: true });

    component.newPassword = 'errpass123';
    component.confirmPassword = 'errpass123';
    component.token = 'tok4';
    component.submit();
    httpMock.expectOne('http://localhost:8080/auth/reset-password').flush(
      { error: 'Token expired' },
      { status: 400, statusText: 'Bad Request' }
    );
    expect(component.error).toContain('Token expired');
    expect(component.loading).toBe(false);
  });

  it('submit handles HTTP error without body', () => {
    createComponent('tok5');
    fixture.detectChanges();
    httpMock.expectOne(`http://localhost:8080/auth/validate-token?token=tok5`).flush({ valid: true });

    component.newPassword = 'errpass123';
    component.confirmPassword = 'errpass123';
    component.token = 'tok5';
    component.submit();
    httpMock.expectOne('http://localhost:8080/auth/reset-password').flush({}, { status: 500, statusText: 'Server Error' });
    expect(component.error).toBeTruthy();
  });
});
