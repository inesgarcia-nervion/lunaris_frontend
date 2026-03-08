import { Component, ChangeDetectorRef } from '@angular/core';
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
export class AdminCreateBookComponent {
  title: string = '';
  author: string = '';
  description: string = '';
  coverImage: string = '';
  releaseYear: number | null = null;
  score: number | null = null;
  
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
      userId: this.currentUserId || undefined
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
