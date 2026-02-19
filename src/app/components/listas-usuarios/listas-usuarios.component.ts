import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BookSearchService } from '../../services/book-search.service';
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

  constructor(private bookSearchService: BookSearchService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Aquí se cargarán las listas desde el backend en el futuro
    this.filteredListas = this.listas;
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
    const nueva = { nombre: name, libros: [] };
    // Insertar al principio (colocar la nueva lista arriba)
    this.listas.unshift(nueva);
    this.filteredListas = this.listas;
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
