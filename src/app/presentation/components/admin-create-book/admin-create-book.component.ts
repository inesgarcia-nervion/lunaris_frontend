import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookSearchService } from '../../../domain/services/book-search.service';
import { AuthService } from '../../../domain/services/auth.service';

@Component({
  selector: 'app-admin-create-book',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-create-book.component.html',
  styleUrl: './admin-create-book.component.css'
})
export class AdminCreateBookComponent implements OnInit {
  title: string = '';
  author: string = '';
  description: string = '';
  coverImage: string = '';
  releaseYear: number | null = null;
  score: number | null = null;

  allGenres: { id: number; name: string }[] = [];
  selectedGenreIds: number[] = [];
  genreDropdownOpen: boolean = false;

  loading: boolean = false;
  error: string | null = null;
  success: string | null = null;
  filePreview: string | null = null;

  isAdmin: boolean = false;
  currentUserId: number | null = null;

  constructor(
    private bookService: BookSearchService,
    private auth: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Verificar que es admin
    this.isAdmin = this.auth.isAdmin();
    
    // Obtener el ID del usuario actual (necesario para registrar quién crea el libro)
    try {
      const userData = localStorage.getItem('lunaris_user');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUserId = user.id || null;
      }
    } catch (e) {
      console.warn('No se pudo obtener userId del localStorage', e);
    }
    
    if (!this.isAdmin) {
      this.error = 'No tienes permisos para acceder a esta página';
      setTimeout(() => this.router.navigate(['/menu']), 2000);
    }
  }

  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.bookService.getGenres().subscribe({
      next: (genres) => { this.allGenres = genres; },
      error: () => { /* no bloquear si falla */ }
    });
  }

  toggleGenreDropdown(): void {
    this.genreDropdownOpen = !this.genreDropdownOpen;
  }

  isGenreSelected(id: number): boolean {
    return this.selectedGenreIds.includes(id);
  }

  toggleGenre(id: number): void {
    const idx = this.selectedGenreIds.indexOf(id);
    if (idx >= 0) {
      this.selectedGenreIds.splice(idx, 1);
    } else {
      this.selectedGenreIds.push(id);
    }
  }

  removeGenre(id: number): void {
    this.selectedGenreIds = this.selectedGenreIds.filter(g => g !== id);
  }

  getGenreName(id: number): string {
    return this.allGenres.find(g => g.id === id)?.name || '';
  }

  getDropdownLabel(): string {
    if (this.selectedGenreIds.length === 0) return 'Selecciona géneros...';
    return this.allGenres
      .filter(g => this.selectedGenreIds.includes(g.id))
      .map(g => g.name)
      .join(', ');
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = () => {
      this.filePreview = reader.result as string;
      this.coverImage = this.filePreview;
      this.cdr.detectChanges();
    };
    
    reader.readAsDataURL(file);
  }

  setImageFromUrl(): void {
    if (!this.coverImage.trim()) return;
    this.filePreview = this.coverImage;
  }

  clearForm(): void {
    this.title = '';
    this.author = '';
    this.description = '';
    this.coverImage = '';
    this.releaseYear = null;
    this.score = null;
    this.filePreview = null;
    this.error = null;
    this.success = null;
    this.selectedGenreIds = [];
    this.genreDropdownOpen = false;
  }

  submit(): void {
    this.error = null;
    this.success = null;

    // Validaciones
    if (!this.title.trim()) {
      this.error = 'El título es obligatorio';
      return;
    }

    if (!this.author.trim()) {
      this.error = 'El autor es obligatorio';
      return;
    }

    if (this.score !== null && (this.score < 0 || this.score > 5)) {
      this.error = 'La puntuación debe estar entre 0 y 5';
      return;
    }

    if (this.releaseYear !== null && this.releaseYear < 1000) {
      this.error = 'El año de lanzamiento debe ser válido';
      return;
    }

    this.loading = true;

    const bookData = {
      title: this.title.trim(),
      author: this.author.trim(),
      description: this.description.trim() || undefined,
      coverImage: this.coverImage.trim() || undefined,
      releaseYear: this.releaseYear || undefined,
      score: this.score || undefined,
      source: 'custom', // Marcamos como libro creado manualmente
      userId: this.currentUserId || undefined,
      genreIds: this.selectedGenreIds.length > 0 ? this.selectedGenreIds : undefined
    };

    this.bookService.createBook(bookData).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = '¡Libro creado correctamente!';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.clearForm();
          this.router.navigate(['/menu']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error creando libro:', err);
        if (err.status === 400) {
          this.error = 'Error en los datos enviados';
        } else if (err.status === 0) {
          this.error = 'No se puede conectar con el servidor';
        } else {
          this.error = err.error?.message || 'Error al crear el libro. Inténtalo de nuevo';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
