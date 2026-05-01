import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BubblePost, BubbleComment } from '../../presentation/components/bubble-post/bubble-post.component';

export interface PostRequestPayload {
  text: string;
  imageUrls: string[];
  userAvatarUrl?: string;
}

export interface CommentRequestPayload {
  text: string;
  userAvatarUrl?: string;
}

/**
 * Servicio para gestionar los posts del feed de burbujas mediante la API REST del backend.
 */
@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los posts del servidor.
   */
  getAll(): Observable<BubblePost[]> {
    return this.http.get<BubblePost[]>(`${this.apiUrl}/posts`);
  }

  /**
   * Obtiene un post por su ID.
   */
  getById(id: number): Observable<BubblePost> {
    return this.http.get<BubblePost>(`${this.apiUrl}/posts/${id}`);
  }

  /**
   * Crea un nuevo post.
   */
  create(payload: PostRequestPayload): Observable<BubblePost> {
    return this.http.post<BubblePost>(`${this.apiUrl}/posts`, payload);
  }

  /**
   * Actualiza un post existente.
   */
  update(id: number, payload: PostRequestPayload): Observable<BubblePost> {
    return this.http.put<BubblePost>(`${this.apiUrl}/posts/${id}`, payload);
  }

  /**
   * Elimina un post.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${id}`);
  }

  /**
   * Alterna el like de un post.
   */
  toggleLike(id: number): Observable<BubblePost> {
    return this.http.post<BubblePost>(`${this.apiUrl}/posts/${id}/like`, {});
  }

  /**
   * Añade un comentario a un post.
   */
  addComment(postId: number, payload: CommentRequestPayload): Observable<BubblePost> {
    return this.http.post<BubblePost>(`${this.apiUrl}/posts/${postId}/comments`, payload);
  }

  /**
   * Elimina un comentario de un post.
   */
  deleteComment(postId: number, commentId: number): Observable<BubblePost> {
    return this.http.delete<BubblePost>(`${this.apiUrl}/posts/${postId}/comments/${commentId}`);
  }
}
