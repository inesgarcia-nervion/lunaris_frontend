import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OpenLibraryBook } from './book-search.service';

export interface ListaItem {
  id: string;
  nombre: string;
  libros: OpenLibraryBook[];
  // optional owner identifier (e.g. username)
  owner?: string | null;
  // whether the list is private (not shown in public menus)
  isPrivate?: boolean;
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

  addList(nombre: string, isPrivate: boolean = false): ListaItem {
    const nueva: ListaItem = { id: Date.now().toString(), nombre, libros: [], owner: this.getCurrentUser(), isPrivate };
    const listas = [nueva, ...this.getAll()];
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
    return nueva;
  }

  deleteList(id: string) {
    const listas = this.getAll().filter(l => l.id !== id);
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }

  updateListName(id: string, newName: string) {
    const listas = this.getAll().map(l => {
      if (l.id === id) {
        return { ...l, nombre: newName };
      }
      return l;
    });
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }

  /**
   * Assign currentUser as owner to any lists that currently have no owner.
   * This migration is safe to run after login to recover ownership for lists
   * created while the app lacked owner support.
   */
  assignUnownedListsToCurrentUser(username: string) {
    if (!username) return;
    const listas = this.getAll().map(l => {
      if (!l.owner) {
        return { ...l, owner: username };
      }
      return l;
    });
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }

  /**
   * Read the current user identifier from localStorage/sessionStorage.
   * This expects the application to store a key `lunaris_current_user` when the user logs in.
   */
  getCurrentUser(): string | null {
    return localStorage.getItem('lunaris_current_user') || sessionStorage.getItem('lunaris_current_user') || null;
  }

  getById(id: string): ListaItem | undefined {
    return this.getAll().find(l => l.id === id);
  }

  /** Returns true if the given list name is one of the reserved profile lists. */
  isProfileListName(nombre: string | null | undefined): boolean {
    if (!nombre) return false;
    const n = nombre.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return ['leyendo', 'leido', 'leido', 'plan para leer'].includes(n);
  }

  /** Return lists owned by a given username (owner). */
  getByOwner(owner: string | null): ListaItem[] {
    if (!owner) return [];
    return this.getAll().filter(l => l.owner === owner);
  }

  /**
   * Ensure that the three mandatory profile sections exist for the user.
   * If any is missing, create it with the current user as owner.
   */
  ensureProfileSections(username: string | null) {
    if (!username) return;
    const required = ['Leyendo', 'Leído', 'Plan para leer'];
    const listas = this.getAll();
    let changed = false;

    required.forEach(name => {
      const exists = listas.some(l => l.owner === username && l.nombre === name);
      if (!exists) {
        listas.unshift({ id: Date.now().toString() + Math.random().toString(36).slice(2,8), nombre: name, libros: [], owner: username, isPrivate: false });
        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage(listas);
      this.listasSubject.next(listas);
    }
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

  removeBookFromList(listId: string, book: OpenLibraryBook | { key?: string; title?: string }) {
    const listas = this.getAll().map(l => {
      if (l.id === listId) {
        l.libros = (l.libros || []).filter(b => {
          try {
            if ((book as any).key) {
              return (b as any).key !== (book as any).key;
            }
            if ((book as any).title) {
              return b.title !== (book as any).title;
            }
            return true;
          } catch {
            return true;
          }
        });
      }
      return l;
    });
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }
}
