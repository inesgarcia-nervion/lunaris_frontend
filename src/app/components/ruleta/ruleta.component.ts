import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListasService, ListaItem } from '../../services/listas.service';
import { BookSearchService, OpenLibraryBook } from '../../services/book-search.service';

@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ruleta.component.html',
  styleUrls: ['./ruleta.component.css']
})
export class RuletaComponent implements OnInit {
  listas: ListaItem[] = [];
  selectedListId: string | null = null;
  loading: boolean = false;
  resultBook: OpenLibraryBook | null = null;
  currentUser: string | null = null;

  constructor(private listasService: ListasService, public bookService: BookSearchService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.currentUser = this.listasService.getCurrentUser();
    // Ensure profile sections exist for the user so "Plan para leer" is present
    this.listasService.ensureProfileSections(this.currentUser);
    // initialize visible lists limited to user's own lists + their "Plan para leer"
    this.updateAvailableLists(this.listasService.getAll() || []);
    this.listasService.listas$.subscribe(l => this.updateAvailableLists(l || []));
  }

  private updateAvailableLists(_all: ListaItem[]) {
    // Only include lists owned by the current user, but exclude the
    // profile lists 'Leyendo' and 'Leído'. Keep 'Plan para leer'.
    const ownerLists = this.listasService.getByOwner(this.currentUser) || [];
    const normalized = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    this.listas = ownerLists.filter(l => {
      try {
        const name = normalized(l.nombre || '');
        // allow plan para leer
        if (name.includes('plan para leer') || name === 'planparaleer') return true;
        // exclude leyendo / leido / leído
        if (name === 'leyendo' || name === 'leido' || name === 'leído') return false;
        return true;
      } catch {
        return true;
      }
    });
  }

  onSelectList(): void {
    this.resultBook = null;
  }

  comenzarRuleta(): void {
    if (!this.selectedListId) {
      alert('Seleccione primero una lista.');
      return;
    }
    const lista = this.listasService.getById(this.selectedListId);
    if (!lista) return;
    if (!lista.libros || lista.libros.length === 0) {
      alert('La lista seleccionada no contiene libros.');
      return;
    }

    this.loading = true;
    this.resultBook = null;
    // ensure UI shows loading state immediately
    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }

    // run the timeout inside Angular zone and force detection when finished
    this.ngZone.run(() => {
      setTimeout(() => {
        const idx = Math.floor(Math.random() * lista.libros.length);
        this.resultBook = lista.libros[idx];
        this.loading = false;
        try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
      }, 3000);
    });
  }

  quitarLibro(): void {
    if (!this.selectedListId || !this.resultBook) return;
    this.listasService.removeBookFromList(this.selectedListId, this.resultBook);
    this.resultBook = null;
  }

  getCover(b: OpenLibraryBook | null): string {
    if (!b) return '';
    return this.bookService.getCoverUrl(b);
  }
}
