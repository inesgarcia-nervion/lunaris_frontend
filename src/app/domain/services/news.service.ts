import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';

/**
 * El servicio NewsService es responsable de gestionar las noticias en la aplicación.
 * Proporciona métodos para obtener todas las noticias, obtener una noticia por ID,
 * agregar una nueva noticia y eliminar una noticia existente.
 */
export interface NewsItem {
  id: string;
  title: string;
  text: string;
  body?: string;
  image?: string;
  date: string;
}

interface NewsBackendItem {
  id: number;
  title: string;
  text: string;
  body?: string;
  image?: string;
  date: string;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
  private base = '/news';
  private newsSubject = new BehaviorSubject<NewsItem[]>([]);
  public news$ = this.newsSubject.asObservable();
  private refreshTrigger = new Subject<void>();

  constructor(private http: HttpClient) {
    this.refreshTrigger.pipe(
      switchMap(() => this.http.get<NewsBackendItem[]>(this.base))
    ).subscribe({
      next: items => this.newsSubject.next(items.map(n => this.mapItem(n))),
      error: () => { /* keep existing data on error */ }
    });
    this.refresh();
  }

  private mapItem(n: NewsBackendItem): NewsItem {
    return { ...n, id: n.id.toString() };
  }

  refresh(): void {
    this.refreshTrigger.next();
  }

  getAll(): NewsItem[] {
    return this.newsSubject.value.slice();
  }

  getById(id: string): Observable<NewsItem> {
    const cached = this.newsSubject.value.find(n => n.id === id);
    if (cached) return of(cached);
    return this.http.get<NewsBackendItem>(`${this.base}/${id}`).pipe(
      map(n => this.mapItem(n))
    );
  }

  addNews(n: Omit<NewsItem, 'id' | 'date'>): Observable<NewsItem> {
    return this.http.post<NewsBackendItem>(this.base, n).pipe(
      map(item => this.mapItem(item)),
      tap(item => this.newsSubject.next([item, ...this.newsSubject.value]))
    );
  }

  removeNews(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}


