import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Observable, BehaviorSubject, of } from 'rxjs';


interface LoginResponse {
  token: string;
}


@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  public isAdmin$ = this.isAdminSubject.asObservable();
  private readonly TOKEN_KEY = 'lunaris_jwt';
  private readonly REMEMBER_KEY = 'lunaris_remember';
  private readonly REMEMBER_PASS_KEY = 'lunaris_remember_pass';


  constructor(private http: HttpClient) {
    // Initialize admin flag from either stored value or token
    try {
      const stored = localStorage.getItem('lunaris_is_admin');
      if (stored) {
        this.isAdminSubject.next(stored === 'true');
      } else {
        const token = this.getToken();
        if (token) {
          const payload = this.parseJwt(token);
          const roles = payload?.roles || payload?.authorities || payload?.role || null;
          let admin = false;
          if (roles) {
            if (Array.isArray(roles)) admin = roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
            else if (typeof roles === 'string') admin = roles.toUpperCase().includes('ADMIN');
          }
          this.isAdminSubject.next(admin);
        }
      }
    } catch (e) {
      // ignore initialization errors
    }
    // Load the stored avatar for the current user (if any)
    try {
      this.avatarSubject.next(localStorage.getItem(this.getAvatarKey()) || null);
    } catch (e) {
      // ignore
    }
  }

  // Use absolute backend URL to avoid proxy issues in dev server
  private readonly backendBase = 'http://localhost:8080';


  login(username: string, password: string, rememberMe: boolean = false): Observable<string> {
    return this.http.post<LoginResponse>(`${this.backendBase}/auth/login`, { username, password }).pipe(
      map(res => res.token),
      tap(token => {
        this.saveToken(token, rememberMe);
        try {
          if (rememberMe) {
            localStorage.setItem('lunaris_current_user', username);
            localStorage.setItem(this.REMEMBER_PASS_KEY, btoa(password));
          } else {
            sessionStorage.setItem('lunaris_current_user', username);
            localStorage.removeItem(this.REMEMBER_PASS_KEY);
          }
        } catch (e) {
          console.error('Unable to save current user', e);
        }
        // Determine admin role: prefer token roles, fallback to username 'admin'
        try {
          let admin = false;
          if (token) {
            const payload = this.parseJwt(token);
            const roles = payload?.roles || payload?.authorities || payload?.role || null;
            if (roles) {
              if (Array.isArray(roles)) admin = roles.includes('ADMIN') || roles.includes('ROLE_ADMIN');
              else if (typeof roles === 'string') admin = roles.toUpperCase().includes('ADMIN');
            }
          }
          if (!admin && username === 'admin') admin = true;
          this.isAdminSubject.next(admin);
          try { localStorage.setItem('lunaris_is_admin', admin ? 'true' : 'false'); } catch {}
        } catch (e) {
          console.warn('Unable to determine admin role', e);
        }
        // Load user-specific avatar on login
        try {
          const savedAvatar = localStorage.getItem(this.getAvatarKey(username)) || null;
          this.avatarSubject.next(savedAvatar);
        } catch (e) {
          console.warn('Unable to load user avatar on login', e);
        }
      })
    );
  }


  /** Development shortcut: create a local admin session without contacting backend */
  devAdminLogin(rememberMe: boolean = false): Observable<string> {
    const token = 'dev-admin-token';
    this.saveToken(token, rememberMe);
    try {
      if (rememberMe) localStorage.setItem('lunaris_current_user', 'admin');
      else sessionStorage.setItem('lunaris_current_user', 'admin');
    } catch (e) {
      console.warn('Unable to store current user for dev admin', e);
    }
    this.isAdminSubject.next(true);
    try { localStorage.setItem('lunaris_is_admin', 'true'); } catch {}
    return of(token);
  }


  register(username: string, email: string, password: string) {
    return this.http.post<any>(`${this.backendBase}/users`, { username, email, password });
  }


  saveToken(token: string | null, rememberMe: boolean = false) {
    if (token) {
      if (rememberMe) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.REMEMBER_KEY, 'true');
        sessionStorage.removeItem(this.TOKEN_KEY);
      } else {
        sessionStorage.setItem(this.TOKEN_KEY, token);
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REMEMBER_KEY);
      }
    }
  }


  getToken(): string | null {
    const isJwt = (t: string | null) => t != null && t.split('.').length === 3;
    const local = localStorage.getItem(this.TOKEN_KEY);
    const session = sessionStorage.getItem(this.TOKEN_KEY);
    // Discard stale non-JWT values (e.g. old dev-admin-token)
    if (local && !isJwt(local)) { localStorage.removeItem(this.TOKEN_KEY); }
    if (session && !isJwt(session)) { sessionStorage.removeItem(this.TOKEN_KEY); }
    return (isJwt(local) ? local : null) || (isJwt(session) ? session : null);
  }


  /** Decode JWT payload without validation (frontend convenience) */
  private parseJwt(token: string | null): any {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch (e) {
      return null;
    }
  }


  isAdmin(): boolean {
    const stored = localStorage.getItem('lunaris_is_admin');
    if (stored) return stored === 'true';
    return this.isAdminSubject.value;
  }


  isLoggedIn(): boolean {
    return !!this.getToken();
  }


  /**
   * Returns the username of the currently logged in user (if any).
   * The app stores this value on login under the key `lunaris_current_user`.
   */
  getCurrentUsername(): string | null {
    return localStorage.getItem('lunaris_current_user') || sessionStorage.getItem('lunaris_current_user') || null;
  }


  // Avatar observable: emits current avatar data (data URL or URL) and updates when changed
  private avatarSubject = new BehaviorSubject<string | null>(null);
  public avatar$ = this.avatarSubject.asObservable();


  private getAvatarKey(username?: string | null): string {
    const u = username ?? this.getCurrentUsername();
    return u ? `lunaris_avatar_${u}` : 'lunaris_avatar';
  }

  getLocalAvatar(username?: string | null): string | null {
    try { return localStorage.getItem(this.getAvatarKey(username)); } catch { return null; }
  }

  setLocalAvatar(avatar: string | null, username?: string | null) {
    const key = this.getAvatarKey(username);
    try {
      if (avatar) localStorage.setItem(key, avatar);
      else localStorage.removeItem(key);
    } catch (e) {
      console.error('Unable to set local avatar', e);
    }
    this.avatarSubject.next(avatar);
  }


  logout(): void {
    // Read remember-me preference BEFORE removing anything
    const remembered = localStorage.getItem(this.REMEMBER_KEY) === 'true';

    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('lunaris_is_admin');
    this.isAdminSubject.next(false);
    this.avatarSubject.next(null);

    if (!remembered) {
      // No "recuérdame": limpiar todo
      localStorage.removeItem(this.REMEMBER_KEY);
      localStorage.removeItem('lunaris_current_user');
      localStorage.removeItem(this.REMEMBER_PASS_KEY);
    }
    // Siempre limpiar la sesión
    sessionStorage.removeItem('lunaris_current_user');
  }


  /** Update user profile (username, avatar). Returns observable. */
  updateUser(currentUsername: string, payload: any) {
    const token = this.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.backendBase}/users/username/${encodeURIComponent(currentUsername)}`, payload, { headers });
  }
}
