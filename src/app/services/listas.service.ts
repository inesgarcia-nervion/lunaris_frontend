import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OpenLibraryBook } from './book-search.service';

export interface ListaItem {
  id: string;
  nombre: string;
  libros: OpenLibraryBook[];
}

@Injectable({ providedIn: 'root' })
export class ListasService {
  private storageKey = 'lunaris_lists';
  private listasSubject = new BehaviorSubject<ListaItem[]>(this.loadFromStorage());
  listas$ = this.listasSubject.asObservable();

  constructor() {}

  private loadFromStorage(): ListaItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as ListaItem[];
    } catch (e) {
      console.error('Error loading listas from storage', e);
      return [];
    }
  }

  private saveToStorage(listas: ListaItem[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(listas));
    } catch (e) {
      console.error('Error saving listas to storage', e);
    }
  }

  getAll(): ListaItem[] {
    return this.listasSubject.getValue();
  }

  addList(nombre: string): ListaItem {
    const nueva: ListaItem = { id: Date.now().toString(), nombre, libros: [] };
    const listas = [nueva, ...this.getAll()];
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
    return nueva;
  }

  getById(id: string): ListaItem | undefined {
    return this.getAll().find(l => l.id === id);
  }

  addBookToList(listId: string, book: OpenLibraryBook) {
    const listas = this.getAll().map(l => {
      if (l.id === listId) {
        // Avoid duplicates by key (e.g., key or title)
        const exists = l.libros.some(b => (b as any).key === (book as any).key || b.title === book.title);
        if (!exists) l.libros = [...l.libros, book];
      }
      return l;
    });
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }
}
