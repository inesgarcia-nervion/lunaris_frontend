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

  constructor(private http: HttpClient) {}

  // Use absolute backend URL to avoid proxy issues in dev server
  private readonly backendBase = 'http://localhost:8080';

  login(username: string, password: string): Observable<string> {
    return this.http.post<LoginResponse>(`${this.backendBase}/auth/login`, { username, password }).pipe(
      map(res => res.token),
      tap(token => this.saveToken(token))
    );
  }

  register(username: string, email: string, password: string) {
    return this.http.post<any>(`${this.backendBase}/users`, { username, email, password });
  }

  saveToken(token: string | null) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
