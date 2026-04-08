import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthInterceptor } from '../../../app/domain/services/auth.interceptor';
import { AuthService } from '../../../app/domain/services/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AuthInterceptor', () => {
  let interceptor: AuthInterceptor;
  let authService: { getToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { getToken: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AuthInterceptor,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });
    interceptor = TestBed.inject(AuthInterceptor);
  });

  it('should add Authorization header when token exists', () => {
    authService.getToken.mockReturnValue('a.b.c');
    const req = new HttpRequest('GET', '/api/data');
    const next: HttpHandler = {
      handle: vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 }))) as any,
    };

    interceptor.intercept(req, next).subscribe();

    const calledWith = (next.handle as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpRequest<any>;
    expect(calledWith.headers.get('Authorization')).toBe('Bearer a.b.c');
  });

  it('should NOT add Authorization header when no token', () => {
    authService.getToken.mockReturnValue(null);
    const req = new HttpRequest('GET', '/api/data');
    const next: HttpHandler = {
      handle: vi.fn().mockReturnValue(of(new HttpResponse({ status: 200 }))) as any,
    };

    interceptor.intercept(req, next).subscribe();

    const calledWith = (next.handle as ReturnType<typeof vi.fn>).mock.calls[0][0] as HttpRequest<any>;
    expect(calledWith.headers.has('Authorization')).toBe(false);
    expect(calledWith).toBe(req);
  });

  it('should pass the original request unchanged when no token', () => {
    authService.getToken.mockReturnValue(null);
    const req = new HttpRequest('POST', '/api/data', { data: 1 });
    let handledReq: HttpRequest<any> | null = null;
    const next: HttpHandler = {
      handle: (r: HttpRequest<any>) => {
        handledReq = r;
        return of(new HttpResponse({ status: 200 }));
      },
    };

    interceptor.intercept(req, next).subscribe();
    expect(handledReq).toBe(req);
  });

  it('should return observable from next.handle', () => {
    authService.getToken.mockReturnValue('x.y.z');
    const expectedResponse = new HttpResponse({ status: 201 });
    const req = new HttpRequest('GET', '/api/test');
    const next: HttpHandler = {
      handle: () => of(expectedResponse),
    };

    let result: HttpEvent<any> | null = null;
    interceptor.intercept(req, next).subscribe(r => (result = r));
    expect(result).toBe(expectedResponse);
  });
});
