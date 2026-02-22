import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface LoginResponse {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'lunaris_jwt';
  private readonly REMEMBER_KEY = 'lunaris_remember';

  constructor(private http: HttpClient) {}

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
          } else {
            sessionStorage.setItem('lunaris_current_user', username);
          }
        } catch (e) {
          console.error('Unable to save current user', e);
        }
      })
    );
  }

  register(username: string, email: string, password: string) {
    return this.http.post<any>(`${this.backendBase}/users`, { username, email, password });
  }

  saveToken(token: string | null, rememberMe: boolean = false) {
    if (token) {
      if (rememberMe) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.REMEMBER_KEY, 'true');
      } else {
        sessionStorage.setItem(this.TOKEN_KEY, token);
        localStorage.removeItem(this.REMEMBER_KEY);
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
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

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    try {
      localStorage.removeItem('lunaris_current_user');
      sessionStorage.removeItem('lunaris_current_user');
    } catch (e) {
      console.error('Unable to remove current user', e);
    }
  }
}
