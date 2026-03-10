import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BookRequestDto {
  id?: number;
  title: string;
  author: string;
}

@Injectable({ providedIn: 'root' })
export class PeticionesService {
  private base = '/requests';

  constructor(private http: HttpClient) {}

  create(request: { title: string; author: string }): Observable<BookRequestDto> {
    return this.http.post<BookRequestDto>(this.base, request);
  }

  getAll(): Observable<BookRequestDto[]> {
    return this.http.get<BookRequestDto[]>(this.base);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
