import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BookSearchService } from '../../services/book-search.service';
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

  constructor(
    private bookSearchService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private listasService: ListasService,
    public router: Router
  ) {}

  ngOnInit(): void {
    // Cargar listas desde servicio (localStorage por ahora)
    this.listas = this.listasService.getAll();
    this.filteredListas = this.listas;
    this.listasService.listas$.subscribe(l => { this.listas = l; this.filteredListas = l; this.cdr.markForCheck(); });
    console.log('ListasUsuariosComponent initialized; current searchQuery:', this.bookSearchService.getSearchQuery());
  }

  onSearch(): void {
    const term = this.search.toLowerCase();
    this.filteredListas = this.listas.filter(l => l.nombre.toLowerCase().includes(term));
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
}
