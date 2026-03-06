import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


export interface NewsItem {
  id: string;
  title: string;
  text: string;
  image?: string; // data URL or external URL
  date: string; // ISO
}


@Injectable({ providedIn: 'root' })
export class NewsService {
  private readonly STORAGE_KEY = 'lunaris_news';
  private newsSubject = new BehaviorSubject<NewsItem[]>(this.loadFromStorage());
  public news$ = this.newsSubject.asObservable();


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


  private saveToStorage(items: NewsItem[]) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items)); } catch (e) { console.warn(e); }
    this.newsSubject.next(items);
  }


  getAll(): NewsItem[] {
    return this.newsSubject.value.slice();
  }


  addNews(n: Omit<NewsItem, 'id' | 'date'>) {
    const items = this.getAll();
    const item: NewsItem = { id: Date.now().toString(36), date: new Date().toISOString(), ...n } as NewsItem;
    items.unshift(item);
    this.saveToStorage(items);
    return item;
  }


  removeNews(id: string) {
    const items = this.getAll().filter(i => i.id !== id);
    this.saveToStorage(items);
  }
}
