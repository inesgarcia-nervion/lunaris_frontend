import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { ConfirmService } from '../../shared/confirm.service';
import { Subscription } from 'rxjs';
import { BookSearchService, OpenLibraryBook } from '../../../domain/services/book-search.service';

@Component({
  selector: 'app-lista-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-detalle.component.html',
  styleUrls: ['./lista-detalle.component.css']
})
export class ListaDetalleComponent implements OnInit, OnDestroy {
  lista: ListaItem | undefined;
  private subs: Subscription[] = [];
  private currentId: string = '';
  currentUser: string | null = null;

  constructor(private route: ActivatedRoute, private listas: ListasService, private router: Router, private bookSearch: BookSearchService, private location: Location, private confirm: ConfirmService) {}

  ngOnInit(): void {
    this.currentId = this.route.snapshot.paramMap.get('id') || '';
    this.lista = this.listas.getById(this.currentId);
    this.currentUser = this.listas.getCurrentUser();
    // Subscribe to updates so new books show up live
    this.subs.push(this.listas.listas$.subscribe(() => {
      this.lista = this.listas.getById(this.currentId);
    }));
  }

  openFromDetail(book: any): void {
    const b = book as OpenLibraryBook;
    if (!b) return;
    // remember we opened detail from this list so back button can return here
    // preserve any previous origin (e.g., came from profile -> list -> book)
    const prev = this.bookSearch.getNavigationOrigin();
    const origin: any = { type: 'list', listId: this.currentId };
    if (prev && prev.type === 'profile') {
      origin.parentType = prev.type;
      origin.parentListId = prev.listId;
    }
    this.bookSearch.setNavigationOrigin(origin);
    this.bookSearch.setSelectedBook(b);
    this.router.navigateByUrl('/menu');
  }

  back(): void {
    const origin = this.bookSearch.getNavigationOrigin();
    // Respect origin types so "volver" returns to the place the user came from
    if (origin) {
      if (origin.type === 'menu') {
        this.bookSearch.setNavigationOrigin(null);
        this.location.back();
        return;
      }
      if (origin.type === 'listas') {
        this.bookSearch.setNavigationOrigin(null);
        this.router.navigateByUrl('/listas-usuarios');
        return;
      }
      if (origin.type === 'profile') {
        this.bookSearch.setNavigationOrigin(null);
        this.router.navigateByUrl('/perfil');
        return;
      }
      // if origin indicates it had a parent profile, go back to profile
      if ((origin as any).parentType === 'profile') {
        this.bookSearch.setNavigationOrigin(null);
        this.router.navigateByUrl('/perfil');
        return;
      }
    }
    // default
    this.router.navigateByUrl('/listas-usuarios');
  }

  get backButtonLabel(): string {
    const origin = this.bookSearch.getNavigationOrigin();
    if (!origin) return '← Volver';
    if (origin.type === 'menu') return '← Volver al menú';
    if (origin.type === 'listas') return '← Volver a listas';
    if (origin.type === 'profile') return '← Volver al perfil';
    return '← Volver';
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  isProfileList(name: string | undefined | null): boolean {
    return this.listas.isProfileListName(name || undefined);
  }

  getCover(book: any): string {
    try {
      // Prefer service helper (handles local and OL shapes)
      return this.bookSearch.getCoverUrl(book as OpenLibraryBook);
    } catch {
      // Fallbacks for older shapes
      const coverId = (book && (book.cover_i || book.coverId));
      if (coverId) return 'https://covers.openlibrary.org/b/id/' + coverId + '-M.jpg';
      if (book && book.coverUrl) return book.coverUrl;
      if (book && book.coverImage) return book.coverImage;
      return '/assets/placeholder.png';
    }
  }

  getAuthor(book: any): string {
    try {
      const fromService = this.bookSearch.getFirstAuthor(book as OpenLibraryBook);
      if (fromService && fromService !== 'Autor desconocido') return fromService;
    } catch {}
    if (book) {
      if (Array.isArray(book.author_name) && book.author_name.length > 0) return book.author_name[0];
      if (Array.isArray(book.authorNames) && book.authorNames.length > 0) return book.authorNames[0];
      if (book.author) return book.author;
    }
    return '';
  }

  async removeFromList(listId: string, book: any, event?: Event): Promise<void> {
    if (event) event.stopPropagation();
    const ok = await this.confirm.confirm('¿Estás seguro de eliminar este libro de la lista?');
    if (!ok) return;
    this.listas.removeBookFromList(listId, book as OpenLibraryBook);
  }

  async confirmAndDeleteList(): Promise<void> {
    if (!this.lista) return;
    if (this.isProfileList(this.lista.nombre)) {
      alert('Esta lista del perfil no puede eliminarse.');
      return;
    }
    const ok = await this.confirm.confirm(`¿Estás seguro de que quieres eliminar la lista "${this.lista.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    this.listas.deleteList(this.lista.id);
    this.router.navigateByUrl('/listas-usuarios');
  }

  editListName(): void {
    if (!this.lista) return;
    if (!this.lista.owner || this.lista.owner !== this.currentUser) return;
    if (this.isProfileList(this.lista.nombre)) {
      alert('El nombre de esta lista no se puede editar.');
      return;
    }
    const nuevo = prompt('Nuevo nombre de la lista', this.lista.nombre);
    if (!nuevo) return;
    const nombre = nuevo.trim();
    if (!nombre) return;
    this.listas.updateListName(this.lista.id, nombre);
    // refresh local reference
    this.lista = this.listas.getById(this.currentId);
  }
}
