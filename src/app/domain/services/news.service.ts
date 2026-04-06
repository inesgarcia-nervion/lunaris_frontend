import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


/**
 * Este servicio gestiona las noticias de la aplicación, almacenándolas en el localStorage del navegador.
 * 
 * Cada noticia tiene un ID único, título, texto, fecha de creación y opcionalmente un cuerpo y una imagen.
 * El servicio proporciona métodos para obtener todas las noticias, agregar una nueva noticia y eliminar una 
 * noticia por su ID.
 */
export interface NewsItem {
  id: string;
  title: string;
  text: string; 
  body?: string; 
  image?: string;
  date: string; 
}


/**
 * El servicio NewsService utiliza un BehaviorSubject para mantener el estado de las noticias en memoria y 
 * sincronizarlo con el localStorage.
 * Al agregar o eliminar noticias, el servicio actualiza tanto el BehaviorSubject como el localStorage para 
 * asegurar que los datos estén persistentes y disponibles en toda la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly STORAGE_KEY = 'lunaris_news';
  private newsSubject = new BehaviorSubject<NewsItem[]>(this.loadFromStorage());
  public news$ = this.newsSubject.asObservable();

  /**
   * Carga las noticias desde el localStorage. Si no hay datos o si ocurre un error durante la carga,
   * se devuelve un array vacío.
   * @returns Un array de objetos NewsItem cargados desde el localStorage.
   */
  private loadFromStorage(): NewsItem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as NewsItem[];
    } catch (e) {
      console.warn('Failed to load news from storage', e);
      return [];
    }
  }
 
  /**
   * Guarda el array de noticias en el localStorage y actualiza el BehaviorSubject para reflejar los cambios en la aplicación.
   * @param items Un array de objetos NewsItem que se desea guardar en el localStorage y actualizar en el BehaviorSubject.
   * @returns void
   */
  private saveToStorage(items: NewsItem[]) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items)); } catch (e) { console.warn(e); }
    this.newsSubject.next(items);
  }


  /**
   * Obtiene una copia del array de noticias actual almacenado en el BehaviorSubject. Esto asegura que el array devuelto
   * no pueda ser modificado directamente, manteniendo la integridad de los datos en el servicio.
   * @returns Un array de objetos NewsItem que representa las noticias actuales almacenadas en el servicio.
   */
  getAll(): NewsItem[] {
    return this.newsSubject.value.slice();
  }


  /**
   * Agrega una nueva noticia al servicio. Se genera un ID único utilizando la función Date.now() y se asigna 
   * la fecha actual.
   * La nueva noticia se agrega al inicio del array de noticias y se guarda en el localStorage. El método devuelve 
   * la noticia recién creada.
   * @param n Un objeto NewsItem sin los campos 'id' y 'date' que se desea agregar.
   * @returns La noticia recién creada con los campos 'id' y 'date' asignados.
   */
  addNews(n: Omit<NewsItem, 'id' | 'date'>) {
    const items = this.getAll();
    const item: NewsItem = { id: Date.now().toString(36), date: new Date().toISOString(), ...n } as NewsItem;
    items.unshift(item);
    this.saveToStorage(items);
    return item;
  }


  /**
   * Elimina una noticia del servicio utilizando su ID. Se filtra el array de noticias para excluir la noticia 
   * con el ID especificado,
   * y luego se guarda el array resultante en el localStorage. Esto asegura que la noticia eliminada ya no esté 
   * disponible en la aplicación.
   * @param id El ID de la noticia que se desea eliminar.
   */
  removeNews(id: string) {
    const items = this.getAll().filter(i => i.id !== id);
    this.saveToStorage(items);
  }
}
