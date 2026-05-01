import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from '../../../app/domain/services/auth.guard';
import { AuthService } from '../../../app/domain/services/auth.service';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

/**
 * Test para {@link AuthGuard}.
 */
describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: { isLoggedIn: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  /**
   * Configura el entorno de prueba antes de cada test.
   */
  beforeEach(() => {
    authService = { isLoggedIn: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  /**
   * Verifica que se permite la activación cuando el usuario ha iniciado sesión.
   */
  it('should allow activation when user is logged in', () => {
    authService.isLoggedIn.mockReturnValue(true);
    expect(guard.canActivate()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  /**
   * Verifica que se deniega la activación y se redirige a /login cuando el usuario no ha iniciado sesión.
   */
  it('should deny activation and redirect to /login when user is not logged in', () => {
    authService.isLoggedIn.mockReturnValue(false);
    expect(guard.canActivate()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
