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

/**
 * El servicio NewsService se encarga de interactuar con el backend para gestionar las noticias.
 * Utiliza HttpClient para realizar las solicitudes HTTP y BehaviorSubject para mantener el 
 * estado de las noticias.
 * Proporciona métodos para obtener todas las noticias, obtener una noticia por ID, agregar 
 * una nueva noticia y eliminar una noticia existente.
 */
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
      error: () => { /* */ }
    });
    this.refresh();
  }

  private mapItem(n: NewsBackendItem): NewsItem {
    return { ...n, id: n.id.toString() };
  }

  /**
   * Refresca la lista de noticias desde el servidor. Este método se llama automáticamente
   * al inicializar el servicio, pero también se puede llamar manualmente para actualizar la lista
   * de noticias después de agregar o eliminar una noticia.
   */
  refresh(): void {
    this.refreshTrigger.next();
  }

  /**
   * Obtiene todas las noticias disponibles. Este método devuelve una copia de la lista de noticias
   * almacenada en el BehaviorSubject para evitar modificaciones directas a la lista interna.
   * @returns Una matriz de objetos NewsItem que representan todas las noticias disponibles.
   */
  getAll(): NewsItem[] {
    return this.newsSubject.value.slice();
  }

  /**
   * Obtiene una noticia por su ID. Primero verifica si la noticia está en la caché (BehaviorSubject).
   * Si la noticia está en la caché, devuelve un Observable que emite esa noticia. Si no está en la caché,
   * realiza una solicitud HTTP al backend para obtener la noticia por su ID y luego la mapea a un objeto NewsItem.
   * @param id El ID de la noticia que se desea obtener.
   * @returns Un Observable que emite el objeto NewsItem correspondiente al ID proporcionado. Si la noticia no se encuentra, el Observable emitirá un error.
   */
  getById(id: string): Observable<NewsItem> {
    const cached = this.newsSubject.value.find(n => n.id === id);
    if (cached) return of(cached);
    return this.http.get<NewsBackendItem>(`${this.base}/${id}`).pipe(
      map(n => this.mapItem(n))
    );
  }

  /**
   * Agrega una nueva noticia. Este método toma un objeto que contiene los campos 
   * necesarios para crear una noticia (excepto el ID y la fecha, que se generan 
   * automáticamente en el backend).
   * @param n Un objeto que contiene los campos necesarios para crear una noticia.
   * @returns Un Observable que emite el objeto NewsItem recién creado.
   */
  addNews(n: Omit<NewsItem, 'id' | 'date'>): Observable<NewsItem> {
    return this.http.post<NewsBackendItem>(this.base, n).pipe(
      map(item => this.mapItem(item)),
      tap(item => this.newsSubject.next([item, ...this.newsSubject.value]))
    );
  }

  /**
   * Elimina una noticia por su ID. Este método realiza una solicitud 
   * HTTP DELETE al backend para eliminar la noticia con el ID especificado.
   * Después de eliminar la noticia, se actualiza la lista de noticias 
   * en el BehaviorSubject para reflejar el cambio.
   * @param id El ID de la noticia que se desea eliminar.
   * @returns Un Observable que se completa cuando la noticia ha sido eliminada.
   */
  removeNews(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}


