import { Component, OnInit } from '@angular/core';
import { BookSearchService } from '../../services/book-search.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listas-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listas-usuarios.component.html',
  styleUrl: './listas-usuarios.component.css'
})
export class ListasUsuariosComponent implements OnInit {
  search: string = '';
  listas: any[] = [];
  filteredListas: any[] = [];

  constructor(private bookSearchService: BookSearchService) {}

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
    // Lógica para crear una nueva lista (abrir modal o navegar a formulario)
    alert('Funcionalidad para crear lista próximamente');
  }
}
