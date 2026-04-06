import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Observable, BehaviorSubject, of } from 'rxjs';

/**
 * Servicio de autenticación.
 * 
 * Este servicio se encarga de manejar la autenticación del usuario, incluyendo 
 * el inicio de sesión, cierre de sesión, almacenamiento del token JWT, y 
 * gestión de roles (admin).
 * También proporciona un observable para el avatar del usuario y métodos para 
 * actualizarlo.
 */
interface LoginResponse {
  token: string;
}

/**
 * Servicio de autenticación.
 * 
 * Este servicio se encarga de manejar la autenticación del usuario, incluyendo 
 * el inicio de sesión, cierre de sesión, almacenamiento del token JWT, y 
 * gestión de roles (admin).
 * También proporciona un observable para el avatar del usuario y métodos para 
 * actualizarlo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private isAdminSubject = new BehaviorSubject<boolean>(false);
  public isAdmin$ = this.isAdminSubject.asObservable();
  private readonly TOKEN_KEY = 'lunaris_jwt';
  private readonly REMEMBER_KEY = 'lunaris_remember';
  private readonly REMEMBER_PASS_KEY = 'lunaris_remember_pass';


  /**
   * Constructor del servicio de autenticación.
   * @param http Cliente HTTP para realizar solicitudes al backend.
   */
  constructor(private http: HttpClient) {
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
      // 
    }
    try {
      this.avatarSubject.next(localStorage.getItem(this.getAvatarKey()) || null);
    } catch (e) {
      // 
    }
  }

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
          try { 
            localStorage.setItem('lunaris_is_admin', admin ? 'true' : 'false'); 
          } catch {
            // 
          }
        } catch (e) {
          console.warn('Unable to determine admin role', e);
        }
        try {
          const savedAvatar = localStorage.getItem(this.getAvatarKey(username)) || null;
          this.avatarSubject.next(savedAvatar);
        } catch (e) {
          console.warn('Unable to load user avatar on login', e);
        }
        // 
        try {
          const theme = this.getUserTheme(username);
          if (theme === 'dark') {
            document.body.classList.add('theme-dark');
            document.documentElement.classList.add('theme-dark');
          } else {
            document.body.classList.remove('theme-dark');
            document.documentElement.classList.remove('theme-dark');
          }
        } catch (e) {
          console.warn('Unable to apply theme on login', e);
        }
      })
    );
  }


  /**
   * Método de inicio de sesión para desarrollo: simula el inicio de sesión 
   * como admin sin necesidad de backend.
   * @param rememberMe Indica si se debe recordar la sesión (persistir en 
   * localStorage) o no (sessionStorage). Por defecto es false (no recordar).
   * @returns Observable que emite el token simulado.
   */
  devAdminLogin(rememberMe: boolean = false): Observable<string> {
    const token = 'eyJhbGciOiJub25lIn0.eyJyb2xlcyI6WyJBRE1JTiJdLCJzdWIiOiJhZG1pbiJ9.';
    this.saveToken(token, rememberMe);
    try {
      if (rememberMe) localStorage.setItem('lunaris_current_user', 'admin');
      else sessionStorage.setItem('lunaris_current_user', 'admin');
    } catch (e) {
      console.warn('Unable to store current user for dev admin', e);
    }
    this.isAdminSubject.next(true);
    try { 
      localStorage.setItem('lunaris_is_admin', 'true'); 
    } catch {
      //
    }
    return of(token);
  }

  /**
   * Registro de nuevo usuario. Envía una solicitud POST al backend para crear un nuevo usuario.
   * @param username Nombre de usuario del nuevo usuario.
   * @param email Correo electrónico del nuevo usuario.
   * @param password Contraseña del nuevo usuario.
   * @returns Observable que emite la respuesta del backend (puede ser el nuevo usuario creado o un mensaje de éxito).
   */
  register(username: string, email: string, password: string) {
    return this.http.post<any>(`${this.backendBase}/users`, { username, email, password });
  }


  /**
   * Guarda el token JWT en el almacenamiento local o de sesión según la preferencia de "recuérdame".
   * @param token Token JWT a guardar.
   * @param rememberMe Indica si se debe recordar la sesión (persistir en localStorage) o no (sessionStorage). 
   * Por defecto es false (no recordar).
   */
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


  /**
   * Obtiene el token JWT almacenado, validando que tenga formato de JWT (tres partes separadas por puntos).
   * Si el token no es válido, se elimina del almacenamiento.
   * @returns El token JWT si es válido, o null si no hay token o el token no es válido.
   */
  getToken(): string | null {
    const isJwt = (t: string | null) => t != null && t.split('.').length === 3;
    const local = localStorage.getItem(this.TOKEN_KEY);
    const session = sessionStorage.getItem(this.TOKEN_KEY);
    if (local && !isJwt(local)) { localStorage.removeItem(this.TOKEN_KEY); }
    if (session && !isJwt(session)) { sessionStorage.removeItem(this.TOKEN_KEY); }
    return (isJwt(local) ? local : null) || (isJwt(session) ? session : null);
  }


  /**
   * Obtenemos el payload de un token JWT decodificándolo. Si el token no es válido, se devuelve null.
   * @param token Token JWT a decodificar.
   * @returns El payload del token JWT como objeto, o null si el token no es válido o no se proporcionó.
   */
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

  /**
   * Verifica si el usuario actual tiene rol de admin. Primero intenta obtener esta 
   * información del almacenamiento local (localStorage) bajo la clave `lunaris_is_admin`. 
   * Si no se encuentra esta clave, utiliza el valor actual del BehaviorSubject `isAdminSubject`, 
   * que se actualiza al iniciar sesión.
   * @returns true si el usuario tiene rol de admin, false en caso contrario.
   */
  isAdmin(): boolean {
    const stored = localStorage.getItem('lunaris_is_admin');
    if (stored) return stored === 'true';
    return this.isAdminSubject.value;
  }


  /**
   * Verifica si el usuario está actualmente autenticado comprobando si hay un token JWT válido almacenado.
   * @returns true si el usuario tiene un token JWT válido (es decir, está autenticado), false en caso contrario.
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }


  /**
   * Obtiene el nombre de usuario del usuario actualmente autenticado.
   * @returns El nombre de usuario si el usuario está autenticado, o null si no hay usuario autenticado.
   */
  getCurrentUsername(): string | null {
    return localStorage.getItem('lunaris_current_user') || sessionStorage.getItem('lunaris_current_user') || null;
  }


  private avatarSubject = new BehaviorSubject<string | null>(null);
  public avatar$ = this.avatarSubject.asObservable();


  /**
   * Genera la clave para almacenar el avatar en localStorage, basada en el nombre de usuario. 
   * Si no se proporciona un nombre de usuario, se intenta obtener el nombre de usuario actual. 
   * Si no hay un usuario actual, se devuelve una clave genérica.
   * @param username Nombre de usuario opcional.
   * @returns La clave para almacenar el avatar en localStorage.
   */
  private getAvatarKey(username?: string | null): string {
    const u = username ?? this.getCurrentUsername();
    return u ? `lunaris_avatar_${u}` : 'lunaris_avatar';
  }

  /**
   * Obtiene el avatar del usuario desde localStorage utilizando la clave generada por `getAvatarKey()`.
   * Si no se encuentra el avatar o ocurre un error al acceder a localStorage, se devuelve null.
   * @param username Nombre de usuario opcional para obtener el avatar específico de ese usuario. 
   * Si no se proporciona, se intentará obtener el avatar del usuario actual.
   * @returns El avatar del usuario como cadena, o null si no se encuentra.
   */
  getLocalAvatar(username?: string | null): string | null {
    try { return localStorage.getItem(this.getAvatarKey(username)); } catch { return null; }
  }

  /**
   * Establece el avatar del usuario en localStorage utilizando la clave generada por `getAvatarKey()`.
   * Si se proporciona un avatar, se guarda en localStorage; si se proporciona null, se elimina la entrada de localStorage.
   * Después de actualizar localStorage, se emite el nuevo valor del avatar a través del BehaviorSubject `avatarSubject`.
   * @param avatar El nuevo avatar del usuario como cadena, o null para eliminar el avatar.
   * @param username Nombre de usuario opcional para establecer el avatar específico de ese usuario. 
   * Si no se proporciona, se intentará establecer el avatar del usuario actual.
   */
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

  /**
   * Genera la clave para almacenar el tema del usuario en localStorage, basada en el nombre de usuario. 
   * Si no se proporciona un nombre de usuario, se intenta obtener el nombre de usuario actual. 
   * Si no hay un usuario actual, se devuelve una clave genérica.
   * @param username Nombre de usuario opcional para generar la clave específica de ese usuario. 
   * Si no se proporciona, se intentará generar la clave para el usuario actual.
   * @returns La clave para almacenar el tema del usuario en localStorage.
   */
  private getUserThemeKey(username?: string | null): string {
    const u = username ?? this.getCurrentUsername();
    return u ? `lunaris_theme_${u}` : 'lunaris_theme';
  }

  /**
   * Obtiene el tema del usuario desde localStorage utilizando la clave generada por `getUserThemeKey()`.
   * Si no se encuentra el tema o ocurre un error al acceder a localStorage, se devuelve 'light' por defecto.
   * @param username Nombre de usuario opcional para obtener el tema específico de ese usuario. 
   * Si no se proporciona, se intentará obtener el tema del usuario actual.
   * @returns El tema del usuario ('light' o 'dark'), o 'light' si no se encuentra o ocurre un error.
   */
  getUserTheme(username?: string | null): 'light' | 'dark' {
    try {
      return (localStorage.getItem(this.getUserThemeKey(username)) as 'light' | 'dark') || 'light';
    } catch { return 'light'; }
  }

  /**
   * Establece el tema del usuario en localStorage utilizando la clave generada por `getUserThemeKey()`.
   * El tema debe ser 'light' o 'dark'. Si se proporciona un tema válido, se guarda en localStorage; 
   * si se proporciona un valor no válido, se elimina la entrada de localStorage.
   * @param theme El nuevo tema del usuario ('light' o 'dark').
   * @param username Nombre de usuario opcional para establecer el tema específico de ese usuario. 
   * Si no se proporciona, se intentará establecer el tema del usuario actual.
   */
  setUserTheme(theme: 'light' | 'dark', username?: string | null): void {
    try { localStorage.setItem(this.getUserThemeKey(username), theme); } catch {}
  }

  /**
   * Cierra la sesión del usuario actual eliminando el token JWT del almacenamiento local y de sesión,
   * y limpiando cualquier información relacionada con el usuario (como el rol de admin y el avatar) del almacenamiento local.
   * Si la opción "recuérdame" no está activada, también se eliminan los datos de usuario almacenados en localStorage.
   * Además, se elimina el modo oscuro aplicado al cerrar sesión.
   */
  logout(): void {
    const remembered = localStorage.getItem(this.REMEMBER_KEY) === 'true';

    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('lunaris_is_admin');
    this.isAdminSubject.next(false);
    this.avatarSubject.next(null);

    if (!remembered) {
      localStorage.removeItem(this.REMEMBER_KEY);
      localStorage.removeItem('lunaris_current_user');
      localStorage.removeItem(this.REMEMBER_PASS_KEY);
    }
    sessionStorage.removeItem('lunaris_current_user');
    try {
      document.body.classList.remove('theme-dark');
      document.documentElement.classList.remove('theme-dark');
    } catch {}
  }

  /**
   * Actualiza la información del usuario actual enviando una solicitud PUT al 
   * backend con el payload proporcionado.
   * @param currentUsername El nombre de usuario actual del usuario que se desea 
   * actualizar. Se utiliza para construir la URL de la solicitud.
   * @param payload El objeto que contiene los datos que se desean actualizar del usuario.
   * @returns Un observable que emite la respuesta del servidor.
   */
  updateUser(currentUsername: string, payload: any) {
    const token = this.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return this.http.put(`${this.backendBase}/users/username/${encodeURIComponent(currentUsername)}`, payload, { headers });
  }
}
