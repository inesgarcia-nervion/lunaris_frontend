import { Injectable } from '@angular/core';
import { BehaviorSubject, of, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { catchError } from 'rxjs/operators';
import { OpenLibraryBook } from './book-search.service';

/**
 * Representación de una lista de libros creada por el usuario, con un nombre, 
 * un identificador único, y una colección de libros (OpenLibraryBook). 
 * Opcionalmente puede tener un propietario (owner) y un flag de privacidad 
 * (isPrivate) para distinguir entre listas públicas y privadas.
 */
export interface ListaItem {
  id: string;
  nombre: string;
  libros: OpenLibraryBook[];
  owner?: string | null;
  isPrivate?: boolean;
}

/**
 * Servicio para gestionar las listas de libros del usuario, incluyendo creación, 
 * eliminación, actualización, y almacenamiento en localStorage. También maneja 
 * la asignación de listas a usuarios, 
 * la gestión de favoritos por usuario, y la migración de listas sin propietario 
 * a un propietario actual.
 * 
 * Las listas se almacenan en localStorage bajo la clave 'lunaris_lists' como un 
 * array de ListaItem serializado.
 * Los favoritos se almacenan en localStorage bajo la clave 'lunaris_favorites' 
 * como un objeto que mapea nombres de usuario a arrays de IDs de listas favoritas.
 */
@Injectable({ providedIn: 'root' })
export class ListasService {
  private storageKey = 'lunaris_lists';
  private favoritesKey = 'lunaris_favorites';
  private listasSubject = new BehaviorSubject<ListaItem[]>([]);
  listas$ = this.listasSubject.asObservable();
  private favoritesSubject = new BehaviorSubject<Record<string, string[]>>(this.loadFavoritesMap());
  favorites$ = this.favoritesSubject.asObservable();

  private backendBase = 'http://localhost:8080';

  constructor(private http: HttpClient, private auth: AuthService) {
    // Initialize lists: prefer server-backed lists for authenticated users
    const current = this.getCurrentUser();
    if (current) {
      this.http.get<any[]>(`${this.backendBase}/user_list/owner/${encodeURIComponent(current)}`).pipe(
        catchError(_ => of([]))
      ).subscribe(serverLists => {
        const customLists = (serverLists || [])
          .filter((l: any) => !this.isProfileListName(l.name))
          .map((l: any) => ({
            id: l.id?.toString() || Date.now().toString(),
            nombre: l.name || '',
            libros: l.booksJson ? JSON.parse(l.booksJson) : [],
            owner: l.owner || current,
            isPrivate: !!l.isPrivate
          } as ListaItem));
        this.http.get<any>(`${this.backendBase}/users/username/${encodeURIComponent(current)}/book-status`).pipe(
          catchError(_ => of(null))
        ).subscribe(statusData => {
          const profileLists = this.buildProfileListsFromStatus(current, statusData);
          const all = [...profileLists, ...customLists];
          this.listasSubject.next(all);
          try { localStorage.setItem(this.storageKey, JSON.stringify(all)); } catch {}
        });
      });
    } else {
      this.listasSubject.next(this.loadFromStorage());
    }
  }

  /**
   * Fuerza la recarga de listas desde el backend (si hay usuario conectado),
   * o desde localStorage como fallback.
   */
  refreshFromServer(): void {
    const current = this.getCurrentUser();
    if (current) {
      this.http.get<any[]>(`${this.backendBase}/user_list/owner/${encodeURIComponent(current)}`).pipe(
        catchError(_ => of([]))
      ).subscribe(serverLists => {
        const customLists = (serverLists || [])
          .filter((l: any) => !this.isProfileListName(l.name))
          .map((l: any) => ({
            id: l.id?.toString() || Date.now().toString(),
            nombre: l.name || '',
            libros: l.booksJson ? JSON.parse(l.booksJson) : [],
            owner: l.owner || current,
            isPrivate: !!l.isPrivate
          } as ListaItem));
        this.http.get<any>(`${this.backendBase}/users/username/${encodeURIComponent(current)}/book-status`).pipe(
          catchError(_ => of(null))
        ).subscribe(statusData => {
          const profileLists = this.buildProfileListsFromStatus(current, statusData);
          const all = [...profileLists, ...customLists];
          this.listasSubject.next(all);
          try { localStorage.setItem(this.storageKey, JSON.stringify(all)); } catch {}
        });
      });
    } else {
      this.listasSubject.next(this.loadFromStorage());
    }
  }

  /**
   * Construye las 3 listas de estado de lectura (Leyendo, Leído, Plan para leer) 
   * a partir de los datos devueltos por el endpoint de estado del usuario.
   * Usa IDs deterministas para evitar duplicados.
   */
  private buildProfileListsFromStatus(username: string, statusData: any): ListaItem[] {
    return [
      {
        id: `profile-leyendo-${username}`,
        nombre: 'Leyendo',
        libros: statusData?.leyendo || [],
        owner: username,
        isPrivate: false
      },
      {
        id: `profile-leido-${username}`,
        nombre: 'Leído',
        libros: statusData?.leido || [],
        owner: username,
        isPrivate: false
      },
      {
        id: `profile-plan-${username}`,
        nombre: 'Plan para leer',
        libros: statusData?.planParaLeer || [],
        owner: username,
        isPrivate: false
      }
    ];
  }

  /**
   * Carga las listas desde localStorage, parseando el JSON almacenado. Si no hay datos o 
   * ocurre un error, devuelve un array vacío.
   * @returns Array de listas cargadas desde localStorage
   */
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

  /**
   * Guarda el array de listas en localStorage, serializándolo como JSON. Si ocurre un error, 
   * lo registra en la consola.
   * @param listas Array de listas a guardar en localStorage
   */
  private saveToStorage(listas: ListaItem[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(listas));
    } catch (e) {
      console.error('Error saving listas to storage', e);
    }
  }

  /**
   * Devuelve todas las listas actualmente almacenadas en el servicio, obteniéndolas del BehaviorSubject.
   * @returns Array de todas las listas gestionadas por el servicio
   */
  getAll(): ListaItem[] {
    return this.listasSubject.getValue();
  }

  /**
   * Crea una nueva lista con un nombre dado y un flag de privacidad opcional, asignándole un ID único 
   * basado en la marca de tiempo actual. La nueva lista se asigna al usuario actual como propietario. 
   * Luego, la lista se agrega al array de listas, se guarda en localStorage, y se emite el nuevo array 
   * a través del BehaviorSubject.
   * @param nombre Nombre de la nueva lista
   * @param isPrivate Flag opcional que indica si la lista es privada
   * @returns La nueva lista creada
   */
  async addList(nombre: string, isPrivate: boolean = false): Promise<ListaItem> {
    const owner = this.getCurrentUser();
    const payload: any = { name: nombre, owner, isPrivate, booksJson: JSON.stringify([]) };
    if (owner) {
      try {
        const res = await firstValueFrom(this.http.post<any>(`${this.backendBase}/user_list`, payload).pipe(catchError(_ => of(null))));
        const nueva: ListaItem = { id: res?.id?.toString() || Date.now().toString(), nombre, libros: [], owner, isPrivate };
        const listas = [nueva, ...this.getAll()];
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
        return nueva;
      } catch (e) {
        const fallback: ListaItem = { id: Date.now().toString(), nombre, libros: [], owner, isPrivate };
        const listas = [fallback, ...this.getAll()];
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
        return fallback;
      }
    }
    const nuevaOffline: ListaItem = { id: Date.now().toString(), nombre, libros: [], owner, isPrivate };
    const listas = [nuevaOffline, ...this.getAll()];
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
    return nuevaOffline;
  }

  /**
   * Elimina una lista por su ID, actualizando el array de listas y emitiendo el nuevo estado.
   * @param id ID de la lista a eliminar
   */
  deleteList(id: string) {
    const owner = this.getCurrentUser();
    const numericId = Number(id);
    if (owner && !isNaN(numericId)) {
      this.http.delete(`${this.backendBase}/user_list/${numericId}`).pipe(catchError(_ => of(null))).subscribe(() => {
        const listas = this.getAll().filter(l => l.id !== id);
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
      });
      return;
    }
    const listas = this.getAll().filter(l => l.id !== id);
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }

  /**
   * Actualiza el nombre de una lista dada su ID, modificando el array de listas y emitiendo el nuevo estado.
   * @param id ID de la lista a actualizar
   * @param newName Nuevo nombre para la lista
   */
  updateListName(id: string, newName: string) {
    const owner = this.getCurrentUser();
    const numericId = Number(id);
    const listas = this.getAll().map(l => l.id === id ? { ...l, nombre: newName } : l);
    if (owner && !isNaN(numericId)) {
      const toSave = listas.find(l => l.id === id);
      const payload = { name: newName, owner, isPrivate: toSave?.isPrivate || false, booksJson: JSON.stringify(toSave?.libros || []) };
      this.http.put<any>(`${this.backendBase}/user_list/${numericId}`, payload).pipe(catchError(_ => of(null))).subscribe(() => {
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
      });
      return;
    }
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }

  updateListPrivacy(id: string, isPrivate: boolean) {
    const owner = this.getCurrentUser();
    const numericId = Number(id);
    const listas = this.getAll().map(l => l.id === id ? { ...l, isPrivate } : l);
    if (owner && !isNaN(numericId)) {
      const toSave = listas.find(l => l.id === id);
      const payload = { name: toSave?.nombre || '', owner, isPrivate, booksJson: JSON.stringify(toSave?.libros || []) };
      this.http.put<any>(`${this.backendBase}/user_list/${numericId}`, payload).pipe(catchError(_ => of(null))).subscribe(() => {
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
      });
      return;
    }
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }


  /**
   * Asigna todas las listas sin propietario (owner) al usuario actual, actualizando el 
   * array de listas y emitiendo el nuevo estado.
   * @param username Nombre del usuario actual
   * @returns void
   */
  assignUnownedListsToCurrentUser(username: string) {
    if (!username) return;
    const listas = this.getAll().map(l => l.owner ? l : { ...l, owner: username });
    // persist changed lists to server if logged in
    listas.forEach(l => {
      const numericId = Number(l.id);
      if (numericId && l.owner) {
        const payload = { name: l.nombre, owner: l.owner, isPrivate: l.isPrivate, booksJson: JSON.stringify(l.libros || []) };
        this.http.put<any>(`${this.backendBase}/user_list/${numericId}`, payload).pipe(catchError(_ => of(null))).subscribe();
      }
    });
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }


  /**
   * Devuelve el nombre del usuario actual almacenado en localStorage o sessionStorage bajo
   * la clave 'lunaris_current_user'. Si no se encuentra ningún usuario, devuelve null.
   * @returns Nombre del usuario actual o null si no hay usuario
   */
  getCurrentUser(): string | null {
    return localStorage.getItem('lunaris_current_user') || sessionStorage.getItem('lunaris_current_user') || null;
  }

  /**
   * Devuelve una lista por su ID, buscando en el array de listas gestionado por el servicio. 
   * Si no se encuentra la lista, devuelve undefined.
   * @param id ID de la lista a buscar
   * @returns La lista encontrada o undefined si no existe
   */
  getById(id: string): ListaItem | undefined {
    return this.getAll().find(l => l.id === id);
  }

  /**
   * Verifica si un nombre dado corresponde a una de las listas de perfil estándar ("Leyendo", "Leído", "Plan para leer"), 
   * normalizando el nombre para ignorar mayúsculas, acentos y espacios. Devuelve true si el nombre coincide con alguna de 
   * las listas de perfil, o false en caso contrario.
   * @param nombre Nombre de la lista a verificar
   * @returns true si el nombre corresponde a una lista de perfil, false en caso contrario
   */
  isProfileListName(nombre: string | null | undefined): boolean {
    if (!nombre) return false;
    const n = nombre.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return ['leyendo', 'leido', 'leido', 'plan para leer'].includes(n);
  }

  /**
   * Devuelve un array de listas que pertenecen al propietario especificado, filtrando el array de listas gestionado 
   * por el servicio. 
   * Si el propietario es null o no se encuentra ninguna lista, devuelve un array vacío.
   * @param owner Nombre del propietario de las listas
   * @returns Array de listas pertenecientes al propietario especificado
   */
  getByOwner(owner: string | null): ListaItem[] {
    if (!owner) return [];
    return this.getAll().filter(l => l.owner === owner);
  }

  /**
   * Carga el mapa de favoritos desde el localStorage.
   * @returns Mapa de favoritos por usuario
   */
  private loadFavoritesMap(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem(this.favoritesKey);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, string[]>;
    } catch (e) {
      console.error('Error loading favorites map', e);
      return {};
    }
  }

  /**
   * Guarda el mapa de favoritos en el localStorage y emite el nuevo mapa a través del BehaviorSubject.
   * @param map Mapa de favoritos por usuario a guardar en localStorage
   */
  private saveFavoritesMap(map: Record<string, string[]>) {
    try {
      localStorage.setItem(this.favoritesKey, JSON.stringify(map));
      this.favoritesSubject.next(map);
    } catch (e) {
      console.error('Error saving favorites map', e);
    }
  }

  /**
   * Devuelve un array de IDs de listas favoritas para el usuario especificado, obteniéndolo del mapa de favoritos. 
   * Si el usuario es null o no tiene favoritos, devuelve un array vacío.
   * @param username Nombre del usuario para el cual obtener las listas favoritas
   * @returns Array de IDs de listas favoritas para el usuario especificado
   */
  getFavoritesForUser(username: string | null): string[] {
    if (!username) return [];
    const map = this.loadFavoritesMap();
    return map[username] || [];
  }

  /**
   * Devuelve un array de listas que son favoritas para el usuario especificado, filtrando el array de todas las listas 
   * para incluir solo aquellas cuyo ID está presente en el array de IDs de favoritos del usuario. 
   * Si el usuario es null o no tiene favoritos, devuelve un array vacío.
   * @param username Nombre del usuario para el cual obtener las listas favoritas
   * @returns Array de listas favoritas para el usuario especificado
   */
  getFavoriteListsForUser(username: string | null): ListaItem[] {
    if (!username) return [];
    const ids = this.getFavoritesForUser(username);
    return this.getAll().filter(l => ids.includes(l.id));
  }

  /**
   * Alterna el estado de favorito de una lista para un usuario dado. Si la lista ya es favorita, se 
   * elimina de los favoritos; 
   * si no es favorita, se agrega a los favoritos. El cambio se guarda en el mapa de favoritos y se 
   * emite el nuevo estado.
   * @param listId ID de la lista para la cual alternar el estado de favorito
   * @param forUser Nombre del usuario para el cual alternar el estado de favorito (opcional, si no 
   * se proporciona se usa el usuario actual)
   * @returns Verdadero si el estado de favorito se alternó correctamente, falso en caso contrario
   */
  toggleFavorite(listId: string, forUser?: string | null): boolean {
    const user = forUser ?? this.getCurrentUser();
    if (!user) return false;
    const map = this.loadFavoritesMap();
    const arr = map[user] || [];
    const idx = arr.indexOf(listId);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      arr.push(listId);
    }
    map[user] = arr;
    this.saveFavoritesMap(map);
    return true;
  }

  /**
   * Verifica si una lista específica es favorita para un usuario dado, comprobando si el ID de la lista está presente
   * en el array de IDs de favoritos del usuario. Devuelve true si la lista es favorita, o false en caso contrario.
   * @param listId ID de la lista a verificar como favorita
   * @param forUser Nombre del usuario para el cual verificar si la lista es favorita (opcional, si no se proporciona 
   * se usa el usuario actual)
   * @returns Verdadero si la lista es favorita para el usuario, falso en caso contrario
   */
  isFavorited(listId: string, forUser?: string | null): boolean {
    const user = forUser ?? this.getCurrentUser();
    if (!user) return false;
    const arr = this.getFavoritesForUser(user);
    return arr.includes(listId);
  }


  /**
   * Asegura que el usuario especificado tenga las secciones de perfil estándar ("Leyendo", "Leído", "Plan para leer") 
   * en su colección de listas.
   * Si alguna de estas secciones no existe para el usuario, se crea una nueva lista con el nombre correspondiente y 
   * se asigna al usuario como propietario. 
   * Luego, si se realizaron cambios, se guarda el nuevo array de listas en localStorage y se emite el nuevo estado a 
   * través del BehaviorSubject.
   * @param username Nombre del usuario para el cual asegurar las secciones de perfil
   * @returns void
   */
  ensureProfileSections(username: string | null) {
    if (!username) return;
    const required = [
      { nombre: 'Leyendo', id: `profile-leyendo-${username}` },
      { nombre: 'Leído', id: `profile-leido-${username}` },
      { nombre: 'Plan para leer', id: `profile-plan-${username}` },
    ];
    const listas = this.getAll();
    let changed = false;

    required.forEach(({ nombre, id }) => {
      const exists = listas.some(l => l.owner === username && l.nombre === nombre);
      if (!exists) {
        listas.unshift({ id, nombre, libros: [], owner: username, isPrivate: false });
        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage(listas);
      this.listasSubject.next(listas);
    }
  }

  /**
   * Establece el estado de lectura de un libro en la base de datos del usuario.
   * El libro se elimina de cualquier otro estado antes de añadirse al nuevo.
   * Actualiza el estado local de forma síncrona y persiste en el backend de forma asíncrona.
   * @param book Libro al que se desea asignar un estado de lectura.
   * @param status Estado de lectura: "Plan para leer", "Leyendo", "Leído" o null para eliminar.
   */
  setBookReadingStatus(book: OpenLibraryBook, status: string | null): void {
    const username = this.getCurrentUser();
    if (!username) return;

    const bookId = (book as any).key || '';
    const profileNames = ['Leyendo', 'Leído', 'Plan para leer'];

    // Update all 3 profile lists locally in one atomic operation
    const listas = this.getAll().map(l => {
      if (!this.isProfileListName(l.nombre) || l.owner !== username) return l;
      if (l.nombre === status) {
        // Add to target list (avoid duplicates)
        const exists = l.libros.some(b => (bookId ? (b as any).key === bookId : false) || b.title === book.title);
        if (!exists) return { ...l, libros: [...l.libros, book] };
      } else {
        // Remove from all other profile lists
        const filtered = l.libros.filter(b => {
          if (bookId) return (b as any).key !== bookId;
          return b.title !== book.title;
        });
        return { ...l, libros: filtered };
      }
      return l;
    });

    try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
    this.listasSubject.next(listas);

    // Persist to backend
    const payload = { bookId, status: status || null, bookData: book };
    this.http.put<any>(`${this.backendBase}/users/username/${encodeURIComponent(username)}/book-status`, payload)
      .pipe(catchError(_ => of(null)))
      .subscribe();
  }

  /**
   * Agrega un libro a una lista específica, evitando duplicados por clave o título. 
   * Para listas de perfil (Leyendo, Leído, Plan para leer) usa el endpoint de estado
   * del usuario, que garantiza la persistencia y la exclusividad del estado.
   * @param listId ID de la lista a la cual agregar el libro
   * @param book Libro a agregar a la lista, representado como un objeto OpenLibraryBook. 
   * @returns void
   */
  addBookToList(listId: string, book: OpenLibraryBook) {
    const lista = this.getAll().find(l => l.id === listId);

    // For profile lists, use the dedicated book-status endpoint
    if (lista && this.isProfileListName(lista.nombre)) {
      this.setBookReadingStatus(book, lista.nombre);
      return;
    }

    // Custom list: use user_list endpoint
    const listas = this.getAll().map(l => {
      if (l.id === listId) {
        const exists = l.libros.some(b => (b as any).key === (book as any).key || b.title === book.title);
        if (!exists) l.libros = [...l.libros, book];
      }
      return l;
    });
    const owner = this.getCurrentUser();
    const numericId = Number(listId);
    if (owner && !isNaN(numericId)) {
      const toSave = listas.find(l => l.id === listId);
      const payload = { name: toSave?.nombre || '', owner, isPrivate: toSave?.isPrivate || false, booksJson: JSON.stringify(toSave?.libros || []) };
      this.http.put<any>(`${this.backendBase}/user_list/${numericId}`, payload).pipe(catchError(_ => of(null))).subscribe(() => {
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
      });
      return;
    }
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }

  /**
   * Elimina un libro de una lista específica, identificando el libro por su clave o título.
   * Para listas de perfil, solo actualiza el estado local (el backend ya fue actualizado
   * por setBookReadingStatus al añadir al nuevo estado).
   * @param listId ID de la lista de la cual eliminar el libro
   * @param book Libro a eliminar de la lista.
   */
  removeBookFromList(listId: string, book: OpenLibraryBook | { key?: string; title?: string }) {
    const lista = this.getAll().find(l => l.id === listId);

    // For profile lists, only update local state — the backend is handled by setBookReadingStatus
    if (lista && this.isProfileListName(lista.nombre)) {
      const listas = this.getAll().map(l => {
        if (l.id !== listId) return l;
        return {
          ...l, libros: (l.libros || []).filter(b => {
            try {
              if ((book as any).key) return (b as any).key !== (book as any).key;
              if ((book as any).title) return b.title !== (book as any).title;
              return true;
            } catch { return true; }
          })
        };
      });
      try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
      this.listasSubject.next(listas);
      return;
    }

    // Custom list: use user_list endpoint
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
    const owner = this.getCurrentUser();
    const numericId = Number(listId);
    if (owner && !isNaN(numericId)) {
      const toSave = listas.find(l => l.id === listId);
      const payload = { name: toSave?.nombre || '', owner, isPrivate: toSave?.isPrivate || false, booksJson: JSON.stringify(toSave?.libros || []) };
      this.http.put<any>(`${this.backendBase}/user_list/${numericId}`, payload).pipe(catchError(_ => of(null))).subscribe(() => {
        try { localStorage.setItem(this.storageKey, JSON.stringify(listas)); } catch {}
        this.listasSubject.next(listas);
      });
      return;
    }
    this.saveToStorage(listas);
    this.listasSubject.next(listas);
  }
}

