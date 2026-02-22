import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BookSearchService, OpenLibraryBook } from '../../services/book-search.service';
import { ListasService } from '../../services/listas.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listas-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listas-usuarios.component.html',
  styleUrls: ['./listas-usuarios.component.css']
})
export class ListasUsuariosComponent implements OnInit {
  search: string = '';
  listas: any[] = [];
  filteredListas: any[] = [];
  showCreateInput: boolean = false;
  newListName: string = '';
  currentUser: string | null = null;

  constructor(
    public bookSearchService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private listasService: ListasService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Cargar listas desde servicio (localStorage por ahora)
    this.listas = this.filterOutProfileLists(this.listasService.getAll());
    this.filteredListas = this.listas;
    this.currentUser = this.listasService.getCurrentUser();
    this.listasService.listas$.subscribe(l => { this.listas = this.filterOutProfileLists(l || []); this.filteredListas = this.listas; this.cdr.markForCheck(); });
    console.log('ListasUsuariosComponent initialized; current searchQuery:', this.bookSearchService.getSearchQuery());
  }

  editList(listId: string): void {
    const lista = this.listasService.getById(listId);
    if (!lista) return;
    if (!lista.owner || lista.owner !== this.currentUser) return;
    const nuevo = prompt('Nuevo nombre de la lista', lista.nombre);
    if (!nuevo) return;
    const nombre = nuevo.trim();
    if (!nombre) return;
    this.listasService.updateListName(listId, nombre);
  }

  deleteList(listId: string): void {
    const lista = this.listasService.getById(listId);
    if (!lista) return;
    if (!lista.owner || lista.owner !== this.currentUser) return;
    const ok = confirm(`¿Estás seguro de eliminar la lista "${lista.nombre}"?`);
    if (!ok) return;
    this.listasService.deleteList(listId);
  }

  onSearch(): void {
    const term = this.search.toLowerCase();
    this.filteredListas = this.listas.filter(l => l.nombre.toLowerCase().includes(term));
  }

  private filterOutProfileLists(listas: any[]): any[] {
    if (!Array.isArray(listas)) return [];
    const skip = new Set(['leyendo', 'leído', 'leido', 'plan para leer']);
    return listas.filter(l => {
      try {
        const nombre = (l.nombre || '').toString().toLowerCase();
        return !skip.has(nombre);
      } catch {
        return true;
      }
    });
  }

  crearLista(): void {
    // Muestra el input inline para crear una nueva lista
    this.showCreateInput = true;
    // focus handled in template via autofocus attribute
  }

  confirmCreate(): void {
    const name = (this.newListName || '').trim();
    if (!name) {
      return;
    }
    // create list with current user as owner (ListasService handles owner assignment)
    const nueva = this.listasService.addList(name);
    // filteredListas se actualizará por suscripción
    this.router.navigate(['/listas', nueva.id]);
    // force change detection to ensure template updates (handles edge cases)
    this.cdr.detectChanges();
    // limpiar estado del input
    this.newListName = '';
    this.showCreateInput = false;
  }

  cancelCreate(): void {
    this.newListName = '';
    this.showCreateInput = false;
  }

  // Template helper: accept unknown (from localStorage) and return cover URL
  getCoverForTemplate(book: unknown): string {
    return this.bookSearchService.getCoverUrl(book as OpenLibraryBook);
  }
  getTitleForTemplate(book: unknown): string {
    try {
      return (book as OpenLibraryBook).title || '';
    } catch {
      return '';
    }
  }

  openBookDetailFromList(book: unknown): void {
    const b = book as OpenLibraryBook;
    if (!b) return;
    // set selected book in shared service and navigate to menu (where detail view lives)
    this.bookSearchService.setSelectedBook(b);
    this.bookSearchService.setSearchQuery('');
    this.router.navigate(['/menu']);
  }
}
