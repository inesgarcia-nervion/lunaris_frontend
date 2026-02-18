
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OpenLibraryBook } from '../../services/book-search.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  // Navegación y usuario
  isMenuOpen = false;
  showUserMenu = false;

  // Búsqueda
  searchQuery = '';
  searchResults: OpenLibraryBook[] = [];
  totalResults = 0;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  currentPage = 1;
  selectedBook: OpenLibraryBook | null = null;

  // Selectores de detalle
  selectedList = '';
  selectedStatus = '';
  userRating = 0;
  userReview = '';

  constructor(private router: Router) {}

  navigate(path: string) {
    this.router.navigate([path]);
    this.isMenuOpen = false;
    this.showUserMenu = false;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  logout() {
    // Aquí va la lógica real de logout
    this.successMessage = 'Sesión cerrada correctamente';
    this.showUserMenu = false;
  }

  search() {
    // Aquí va la lógica real de búsqueda
    this.loading = true;
    this.error = null;
    this.successMessage = null;
    // Simulación de resultados
    setTimeout(() => {
      this.searchResults = [];
      this.totalResults = 0;
      this.loading = false;
      if (!this.searchQuery.trim()) {
        this.error = 'Introduce un término de búsqueda';
      } else {
        // Simula resultados
        this.searchResults = [
          { title: 'Libro de ejemplo', firstPublishYear: 2020 } as OpenLibraryBook
        ];
        this.totalResults = 1;
      }
    }, 800);
  }

  // Métodos de paginación y selección
  previousPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { this.currentPage++; }
  hasPreviousPage() { return this.currentPage > 1; }
  hasNextPage() { return false; }
  getTotalPages() { return 1; }
  selectBook(book: OpenLibraryBook) { this.selectedBook = book; }
  backToSearch() { this.selectedBook = null; }

  // Métodos auxiliares para la vista de detalle
  getCoverUrl(book: OpenLibraryBook | null) { return book ? 'https://via.placeholder.com/100x150?text=Portada' : ''; }
  isSaga(book: OpenLibraryBook | null) { return !!book && false; }
  getSagaName(book: OpenLibraryBook | null) { return book ? 'Ejemplo Saga' : ''; }
  getFirstAuthor(book: OpenLibraryBook | null) { return book ? 'Autor Ejemplo' : ''; }
  generateRatingArray(rating: number | undefined) {
    const safeRating = typeof rating === 'number' ? rating : 0;
    // Ejemplo simple: redondea y llena estrellas
    const fullStars = Math.round(safeRating);
    return Array(5)
      .fill('full', 0, fullStars)
      .fill('empty', fullStars);
  }
  getCategories(book: OpenLibraryBook | null) { return book ? ['Fantasía', 'Aventura'] : []; }

  submitReview() {
    this.successMessage = 'Review guardada';
  }
}
