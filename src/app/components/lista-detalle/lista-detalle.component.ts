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

  constructor(private route: ActivatedRoute, private listas: ListasService, private router: Router, private bookSearch: BookSearchService) {}

  ngOnInit(): void {
    this.currentId = this.route.snapshot.paramMap.get('id') || '';
    this.lista = this.listas.getById(this.currentId);
    // Subscribe to updates so new books show up live
    this.subs.push(this.listas.listas$.subscribe(() => {
      this.lista = this.listas.getById(this.currentId);
    }));
  }

  openFromDetail(book: any): void {
    const b = book as OpenLibraryBook;
    if (!b) return;
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
}
