import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ListasService, ListaItem } from '../../services/listas.service';
import { Subscription } from 'rxjs';
import { BookSearchService, OpenLibraryBook } from '../../services/book-search.service';

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

  constructor(private route: ActivatedRoute, private listas: ListasService, private router: Router, private bookSearch: BookSearchService) {}

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
    this.bookSearch.setNavigationOrigin({ type: 'list', listId: this.currentId });
    this.bookSearch.setSelectedBook(b);
    this.router.navigateByUrl('/menu');
  }

  back(): void {
    this.router.navigateByUrl('/listas-usuarios');
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  removeFromList(listId: string, book: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.listas.removeBookFromList(listId, book as OpenLibraryBook);
  }

  confirmAndDeleteList(): void {
    if (!this.lista) return;
    const ok = confirm(`¿Estás seguro de que quieres eliminar la lista "${this.lista.nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    this.listas.deleteList(this.lista.id);
    this.router.navigateByUrl('/listas-usuarios');
  }

  editListName(): void {
    if (!this.lista) return;
    if (!this.lista.owner || this.lista.owner !== this.currentUser) return;
    const nuevo = prompt('Nuevo nombre de la lista', this.lista.nombre);
    if (!nuevo) return;
    const nombre = nuevo.trim();
    if (!nombre) return;
    this.listas.updateListName(this.lista.id, nombre);
    // refresh local reference
    this.lista = this.listas.getById(this.currentId);
  }
}
