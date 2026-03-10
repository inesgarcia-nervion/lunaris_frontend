import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReviewDto {
  id?: number;
  comment?: string;
  rating?: number;
  date?: string;
  bookApiId?: string;
  username?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private apiUrl = 'http://localhost:8080';
  constructor(private http: HttpClient) {}

  getByBookApiId(apiId: string): Observable<ReviewDto[]> {
    return this.http.get<ReviewDto[]>(`${this.apiUrl}/reviews/book`, { params: { apiId } });
  }

  create(review: ReviewDto) {
    return this.http.post<ReviewDto>(`${this.apiUrl}/reviews`, review);
  }

  update(id: number, review: ReviewDto) {
    return this.http.put<ReviewDto>(`${this.apiUrl}/reviews/${id}`, review);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${id}`);
  }
}
