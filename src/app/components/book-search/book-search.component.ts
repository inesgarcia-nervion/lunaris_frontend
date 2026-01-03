import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookSearchService, OpenLibraryBook, OpenLibrarySearchResponse } from '../../services/book-search.service';

@Component({
  selector: 'app-book-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-search.component.html',
  styleUrl: './book-search.component.css'
})
export class BookSearchComponent implements OnInit {
  searchQuery: string = '';
  searchResults: OpenLibraryBook[] = [];
  loading: boolean = false;
  error: string | null = null;
  currentPage: number = 1;
  limit: number = 10;
  totalResults: number = 0;
  successMessage: string | null = null;

  constructor(private bookSearchService: BookSearchService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  /**
   * Realiza la búsqueda de libros
   */
  search(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un término de búsqueda';
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;
    const offset = (this.currentPage - 1) * this.limit;

    console.log('Iniciando búsqueda con query:', this.searchQuery);
    this.bookSearchService.searchBooks(this.searchQuery, this.limit, offset).subscribe({
      next: (response: OpenLibrarySearchResponse) => {
        console.log('Búsqueda completada, response:', response);
        this.searchResults = response.docs || [];
        this.totalResults = response.numFound || 0;
        console.log('searchResults actualizado:', this.searchResults);
        console.log('loading antes de cambiar:', this.loading);
        this.loading = false;
        console.log('loading después de cambiar:', this.loading);
        this.cdr.markForCheck();

        if (this.searchResults.length === 0) {
          this.error = 'No se encontraron libros. Intenta con otra búsqueda.';
        }
      },
      error: (error) => {
        console.error('Error buscando libros:', error);
        this.error = 'Error al buscar libros. Por favor intenta más tarde.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Búsqueda por autor
   */
  searchByAuthor(): void {
    if (!this.searchQuery.trim()) {
      this.error = 'Por favor ingresa un autor';
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.bookSearchService.searchByAuthor(this.searchQuery, this.limit).subscribe({
      next: (response: OpenLibrarySearchResponse) => {
        this.searchResults = response.docs || [];
        this.totalResults = response.numFound || 0;
        this.loading = false;
        this.cdr.markForCheck();

        if (this.searchResults.length === 0) {
          this.error = 'No se encontraron libros de este autor.';
        }
      },
      error: (error) => {
        console.error('Error buscando por autor:', error);
        this.error = 'Error al buscar. Por favor intenta más tarde.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Importa un libro a la base de datos
   */
  importBook(book: OpenLibraryBook): void {
    this.loading = true;
    this.error = null;

    this.bookSearchService.importBook(book).subscribe({
      next: (importedBook) => {
        this.successMessage = `"${book.title}" ha sido importado correctamente!`;
        this.loading = false;
        this.cdr.markForCheck();
        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => {
          this.successMessage = null;
          this.cdr.markForCheck();
        }, 5000);
      },
      error: (error) => {
        console.error('Error importando libro:', error);
        this.error = 'Error al importar el libro. Intenta nuevamente.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Obtiene la URL de portada para un libro
   */
  getCoverUrl(book: OpenLibraryBook): string {
    return this.bookSearchService.getCoverUrl(book);
  }

  /**
   * Obtiene el nombre del primer autor
   */
  getFirstAuthor(book: OpenLibraryBook): string {
    return book.authorNames && book.authorNames.length > 0 ? book.authorNames[0] : 'Autor desconocido';
  }

  /**
   * Va a la página anterior
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.search();
    }
  }

  /**
   * Va a la siguiente página
   */
  nextPage(): void {
    const maxPages = Math.ceil(this.totalResults / this.limit);
    if (this.currentPage < maxPages) {
      this.currentPage++;
      this.search();
    }
  }

  /**
   * Calcula el número de páginas
   */
  getTotalPages(): number {
    return Math.ceil(this.totalResults / this.limit);
  }

  /**
   * Verifica si hay más páginas
   */
  hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  /**
   * Verifica si hay página anterior
   */
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }
}
