import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../../app/domain/services/auth.service';

const ADMIN_TOKEN = 'hdr.eyJyb2xlcyI6WyJBRE1JTiJdLCJzdWIiOiJhZG1pbiJ9.sig';
const USER_TOKEN = 'hdr.eyJyb2xlcyI6WyJVU0VSIl0sInN1YiI6InVzZXIifQ==.sig';
const INVALID_TOKEN = 'notavalidtoken';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    try { httpMock?.verify(); } catch {}
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── Constructor ────────────────────────────────────────────────────────────

  it('should set isAdmin from localStorage lunaris_is_admin=true', () => {
    localStorage.setItem('lunaris_is_admin', 'true');
    setup();
    expect(service.isAdmin()).toBe(true);
  });

  it('should set isAdmin to false from localStorage lunaris_is_admin=false', () => {
    localStorage.setItem('lunaris_is_admin', 'false');
    setup();
    expect(service.isAdmin()).toBe(false);
  });

  it('should set isAdmin from JWT token when no lunaris_is_admin stored (admin role)', () => {
    localStorage.setItem('lunaris_jwt', ADMIN_TOKEN);
    localStorage.setItem('lunaris_remember', 'true');
    setup();
    expect(service.isAdmin()).toBe(true);
  });

  it('should set isAdmin to false from JWT token with USER role', () => {
    localStorage.setItem('lunaris_jwt', USER_TOKEN);
    setup();
    expect(service.isAdmin()).toBe(false);
  });

  it('should load avatar from localStorage in constructor', () => {
    localStorage.setItem('lunaris_current_user', 'alice');
    localStorage.setItem('lunaris_avatar_alice', 'data:image/png;base64,abc');
    setup();
    let avatar: string | null = null;
    service.avatar$.subscribe(a => (avatar = a));
    expect(avatar).toBe('data:image/png;base64,abc');
  });

  it('should handle constructor errors gracefully (no token, no admin flag)', () => {
    setup();
    expect(service.isAdmin()).toBe(false);
    expect(service.isLoggedIn()).toBe(false);
  });

  // ── login() ───────────────────────────────────────────────────────────────

  it('should login and save token to sessionStorage when rememberMe=false', () => {
    setup();
    service.login('user1', 'pass1').subscribe(token => {
      expect(token).toBe(USER_TOKEN);
    });
    const req = httpMock.expectOne('http://localhost:8080/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ token: USER_TOKEN });
    expect(sessionStorage.getItem('lunaris_jwt')).toBe(USER_TOKEN);
    expect(localStorage.getItem('lunaris_jwt')).toBeNull();
  });

  it('should login and save token to localStorage when rememberMe=true', () => {
    setup();
    service.login('user1', 'pass1', true).subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: USER_TOKEN });
    expect(localStorage.getItem('lunaris_jwt')).toBe(USER_TOKEN);
    expect(localStorage.getItem('lunaris_current_user')).toBe('user1');
    expect(sessionStorage.getItem('lunaris_jwt')).toBeNull();
  });

  it('should detect admin role from token on login', () => {
    setup();
    service.login('admin', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: ADMIN_TOKEN });
    expect(service.isAdmin()).toBe(true);
    expect(localStorage.getItem('lunaris_is_admin')).toBe('true');
  });

  it('should set admin=true when username is admin even without ADMIN role in token', () => {
    setup();
    service.login('admin', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: USER_TOKEN });
    expect(service.isAdmin()).toBe(true);
  });

  it('should save username to sessionStorage when rememberMe=false on login', () => {
    setup();
    service.login('bob', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: USER_TOKEN });
    expect(sessionStorage.getItem('lunaris_current_user')).toBe('bob');
    expect(localStorage.getItem('lunaris_current_user')).toBeNull();
  });

  it('should load avatar for user on login', () => {
    localStorage.setItem('lunaris_avatar_bob', 'avatar-data');
    setup();
    let avatar: string | null = null;
    service.avatar$.subscribe(a => (avatar = a));
    service.login('bob', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: USER_TOKEN });
    expect(avatar).toBe('avatar-data');
  });

  it('should apply dark theme class on login if user has dark theme', () => {
    localStorage.setItem('lunaris_theme_bob', 'dark');
    setup();
    service.login('bob', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: USER_TOKEN });
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    document.body.classList.remove('theme-dark');
    document.documentElement.classList.remove('theme-dark');
  });

  it('should remove dark theme on login when user has light theme', () => {
    document.body.classList.add('theme-dark');
    localStorage.setItem('lunaris_theme_bob', 'light');
    setup();
    service.login('bob', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: USER_TOKEN });
    expect(document.body.classList.contains('theme-dark')).toBe(false);
  });

  // ── devAdminLogin() ───────────────────────────────────────────────────────

  it('devAdminLogin should save token and set admin=true (rememberMe=false)', () => {
    setup();
    let tokenResult = '';
    service.devAdminLogin().subscribe(t => (tokenResult = t));
    expect(tokenResult).toContain('.');
    expect(service.isAdmin()).toBe(true);
    expect(sessionStorage.getItem('lunaris_current_user')).toBe('admin');
  });

  it('devAdminLogin should save to localStorage when rememberMe=true', () => {
    setup();
    service.devAdminLogin(true).subscribe();
    expect(localStorage.getItem('lunaris_current_user')).toBe('admin');
    expect(localStorage.getItem('lunaris_is_admin')).toBe('true');
  });

  // ── register() ────────────────────────────────────────────────────────────

  it('register should POST to /users', () => {
    setup();
    service.register('user', 'email@test.com', 'pass123').subscribe(res => {
      expect(res.id).toBe(1);
    });
    const req = httpMock.expectOne('http://localhost:8080/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'user', email: 'email@test.com', password: 'pass123' });
    req.flush({ id: 1, username: 'user' });
  });

  // ── saveToken() ───────────────────────────────────────────────────────────

  it('saveToken with rememberMe=false should use sessionStorage', () => {
    setup();
    service.saveToken(USER_TOKEN, false);
    expect(sessionStorage.getItem('lunaris_jwt')).toBe(USER_TOKEN);
    expect(localStorage.getItem('lunaris_jwt')).toBeNull();
    expect(localStorage.getItem('lunaris_remember')).toBeNull();
  });

  it('saveToken with rememberMe=true should use localStorage', () => {
    setup();
    service.saveToken(USER_TOKEN, true);
    expect(localStorage.getItem('lunaris_jwt')).toBe(USER_TOKEN);
    expect(localStorage.getItem('lunaris_remember')).toBe('true');
    expect(sessionStorage.getItem('lunaris_jwt')).toBeNull();
  });

  it('saveToken with null should not save anything', () => {
    setup();
    service.saveToken(null);
    expect(localStorage.getItem('lunaris_jwt')).toBeNull();
    expect(sessionStorage.getItem('lunaris_jwt')).toBeNull();
  });

  // ── getToken() ────────────────────────────────────────────────────────────

  it('getToken should return token from localStorage', () => {
    localStorage.setItem('lunaris_jwt', USER_TOKEN);
    setup();
    expect(service.getToken()).toBe(USER_TOKEN);
  });

  it('getToken should return token from sessionStorage', () => {
    setup();
    sessionStorage.setItem('lunaris_jwt', USER_TOKEN);
    expect(service.getToken()).toBe(USER_TOKEN);
  });

  it('getToken should prefer localStorage over sessionStorage', () => {
    localStorage.setItem('lunaris_jwt', ADMIN_TOKEN);
    setup();
    sessionStorage.setItem('lunaris_jwt', USER_TOKEN);
    expect(service.getToken()).toBe(ADMIN_TOKEN);
  });

  it('getToken should return null and remove invalid localStorage token', () => {
    localStorage.setItem('lunaris_jwt', INVALID_TOKEN);
    setup();
    expect(service.getToken()).toBeNull();
    expect(localStorage.getItem('lunaris_jwt')).toBeNull();
  });

  it('getToken should return null and remove invalid sessionStorage token', () => {
    setup();
    sessionStorage.setItem('lunaris_jwt', INVALID_TOKEN);
    expect(service.getToken()).toBeNull();
    expect(sessionStorage.getItem('lunaris_jwt')).toBeNull();
  });

  it('getToken should return null when no token stored', () => {
    setup();
    expect(service.getToken()).toBeNull();
  });

  // ── isAdmin() ─────────────────────────────────────────────────────────────

  it('isAdmin should return true from localStorage flag', () => {
    localStorage.setItem('lunaris_is_admin', 'true');
    setup();
    expect(service.isAdmin()).toBe(true);
  });

  it('isAdmin should return false when flag is false', () => {
    localStorage.setItem('lunaris_is_admin', 'false');
    setup();
    expect(service.isAdmin()).toBe(false);
  });

  it('isAdmin should return BehaviorSubject value when no localStorage flag', () => {
    setup();
    expect(service.isAdmin()).toBe(false);
  });

  // ── isLoggedIn() ──────────────────────────────────────────────────────────

  it('isLoggedIn should return true when token exists', () => {
    sessionStorage.setItem('lunaris_jwt', USER_TOKEN);
    setup();
    expect(service.isLoggedIn()).toBe(true);
  });

  it('isLoggedIn should return false when no token', () => {
    setup();
    expect(service.isLoggedIn()).toBe(false);
  });

  // ── getCurrentUsername() ─────────────────────────────────────────────────

  it('getCurrentUsername returns from localStorage', () => {
    localStorage.setItem('lunaris_current_user', 'alice');
    setup();
    expect(service.getCurrentUsername()).toBe('alice');
  });

  it('getCurrentUsername returns from sessionStorage when not in localStorage', () => {
    setup();
    sessionStorage.setItem('lunaris_current_user', 'bob');
    expect(service.getCurrentUsername()).toBe('bob');
  });

  it('getCurrentUsername returns null when no user stored', () => {
    setup();
    expect(service.getCurrentUsername()).toBeNull();
  });

  // ── getLocalAvatar() / setLocalAvatar() ────────────────────────────────────

  it('setLocalAvatar should save avatar to localStorage and emit', () => {
    localStorage.setItem('lunaris_current_user', 'carol');
    setup();
    let emitted: string | null = null;
    service.avatar$.subscribe(a => (emitted = a));
    service.setLocalAvatar('img-data', 'carol');
    expect(localStorage.getItem('lunaris_avatar_carol')).toBe('img-data');
    expect(emitted).toBe('img-data');
  });

  it('setLocalAvatar with null should remove from localStorage', () => {
    localStorage.setItem('lunaris_avatar_carol', 'old-data');
    localStorage.setItem('lunaris_current_user', 'carol');
    setup();
    service.setLocalAvatar(null, 'carol');
    expect(localStorage.getItem('lunaris_avatar_carol')).toBeNull();
  });

  it('getLocalAvatar returns null when no avatar stored', () => {
    setup();
    expect(service.getLocalAvatar('nobody')).toBeNull();
  });

  it('getLocalAvatar returns stored avatar', () => {
    localStorage.setItem('lunaris_avatar_dave', 'data:test');
    setup();
    expect(service.getLocalAvatar('dave')).toBe('data:test');
  });

  it('getLocalAvatar uses current user key when no username provided', () => {
    setup();
    sessionStorage.setItem('lunaris_current_user', 'eve');
    localStorage.setItem('lunaris_avatar_eve', 'eve-avatar');
    expect(service.getLocalAvatar()).toBe('eve-avatar');
  });

  it('getLocalAvatar uses generic key when no user at all', () => {
    setup();
    localStorage.setItem('lunaris_avatar', 'generic-avatar');
    expect(service.getLocalAvatar()).toBe('generic-avatar');
  });

  // ── getUserTheme() / setUserTheme() ────────────────────────────────────────

  it('getUserTheme returns dark theme from localStorage', () => {
    localStorage.setItem('lunaris_theme_bob', 'dark');
    setup();
    expect(service.getUserTheme('bob')).toBe('dark');
  });

  it('getUserTheme returns light by default', () => {
    setup();
    expect(service.getUserTheme('nobody')).toBe('light');
  });

  it('setUserTheme stores theme in localStorage', () => {
    setup();
    service.setUserTheme('dark', 'frank');
    expect(localStorage.getItem('lunaris_theme_frank')).toBe('dark');
  });

  it('getUserTheme uses current user when no username provided', () => {
    localStorage.setItem('lunaris_current_user', 'grace');
    localStorage.setItem('lunaris_theme_grace', 'dark');
    setup();
    expect(service.getUserTheme()).toBe('dark');
  });

  it('setUserTheme uses generic key when no user', () => {
    setup();
    service.setUserTheme('dark');
    expect(localStorage.getItem('lunaris_theme')).toBe('dark');
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  it('logout should remove tokens and reset admin flag', () => {
    sessionStorage.setItem('lunaris_jwt', USER_TOKEN);
    localStorage.setItem('lunaris_is_admin', 'true');
    setup();
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(service.isAdmin()).toBe(false);
    expect(localStorage.getItem('lunaris_is_admin')).toBeNull();
  });

  it('logout should not remove localStorage user if rememberMe=true', () => {
    localStorage.setItem('lunaris_remember', 'true');
    localStorage.setItem('lunaris_current_user', 'persistent-user');
    setup();
    service.logout();
    expect(localStorage.getItem('lunaris_current_user')).toBe('persistent-user');
  });

  it('logout should remove localStorage user if rememberMe not set', () => {
    localStorage.setItem('lunaris_current_user', 'temp-user');
    setup();
    service.logout();
    expect(localStorage.getItem('lunaris_current_user')).toBeNull();
  });

  it('logout should remove theme-dark class from body', () => {
    document.body.classList.add('theme-dark');
    document.documentElement.classList.add('theme-dark');
    setup();
    service.logout();
    expect(document.body.classList.contains('theme-dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
  });

  it('logout should emit null avatar', () => {
    setup();
    let avatar: string | null = 'old';
    service.avatar$.subscribe(a => (avatar = a));
    service.setLocalAvatar('some-avatar', 'u');
    service.logout();
    expect(avatar).toBeNull();
  });

  // ── updateUser() ──────────────────────────────────────────────────────────

  it('updateUser should PUT to backend with correct URL', () => {
    localStorage.setItem('lunaris_jwt', USER_TOKEN);
    setup();
    service.updateUser('alice', { username: 'alice2' }).subscribe();
    const req = httpMock.expectOne(
      'http://localhost:8080/users/username/alice'
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ username: 'alice2' });
    req.flush({});
  });

  it('updateUser should work without token (no Authorization header)', () => {
    setup();
    service.updateUser('user1', { email: 'new@test.com' }).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/users/username/user1');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('updateUser encodes special characters in username', () => {
    setup();
    service.updateUser('user name', { username: 'username' }).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/users/username/user%20name');
    req.flush({});
  });

  // ── isAdmin$ observable ──────────────────────────────────────────────────

  it('isAdmin$ should emit updated value after login', () => {
    setup();
    const emitted: boolean[] = [];
    service.isAdmin$.subscribe(v => emitted.push(v));
    service.login('admin', 'pass').subscribe();
    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: ADMIN_TOKEN });
    expect(emitted).toContain(true);
  });
});
