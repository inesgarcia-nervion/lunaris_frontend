import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookSearchService } from '../../../domain/services/book-search.service';
import { AuthService } from '../../../domain/services/auth.service';
import { ContenteditableDirective } from '../../shared/contenteditable.directive';

/**
 * Componente para que los administradores puedan crear nuevos libros manualmente.
 * 
 * Permite ingresar título, autor, descripción, imagen de portada (URL o archivo), 
 * año de lanzamiento, puntuación y géneros.
 * Solo accesible para usuarios con rol de admin.
 */
@Component({
  selector: 'app-admin-create-book',
  standalone: true,
  imports: [CommonModule, FormsModule, ContenteditableDirective],
  templateUrl: './admin-create-book.component.html',
    styleUrls: ['./admin-create-book.component.css']
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

  // Detecta si hay contenido en el formulario para habilitar el botón Crear
  hasCreateBookChanges(): boolean {
    try {
      if ((this.title || '').trim()) return true;
      if ((this.author || '').trim()) return true;
      if ((this.description || '').trim()) return true;
      if ((this.coverImage || '').trim()) return true;
      if ((this.filePreview || '').trim()) return true;
      if ((this.selectedGenreIds || []).length > 0) return true;
      if (this.releaseYear != null) return true;
      if (this.score != null) return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  /**
   * Constructor del componente.
   * @param bookService Servicio para manejar operaciones relacionadas con libros (crear, obtener géneros, etc).
   * @param auth Servicio de autenticación para verificar permisos y obtener información del usuario actual.
   * @param router Servicio de enrutamiento para redirigir a otras páginas si el usuario no es admin o después de crear un libro.
   * @param cdr ChangeDetectorRef para forzar la detección de cambios después de cargar la imagen o actualizar el estado.
   */
  constructor(
    private bookService: BookSearchService,
    private auth: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.isAdmin = this.auth.isAdmin();
    
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

  /**
   * Inicializa el componente cargando la lista de géneros disponibles.
   * 
   * Si el usuario no es admin, se muestra un mensaje de error y se redirige al menú principal.
   */
  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.bookService.getGenres().subscribe({
      next: (genres) => { this.allGenres = genres; },
      error: () => { /* no bloquear si falla */ }
    });
  }

  /**
   * Alterna la visibilidad del dropdown de selección de géneros.
   * 
   * El dropdown muestra la lista de géneros disponibles y permite seleccionar múltiples géneros para el libro.
   */
  toggleGenreDropdown(): void {
    this.genreDropdownOpen = !this.genreDropdownOpen;
  }

  /**
   * Verifica si un género con el ID dado está seleccionado.
   * @param id ID del género a verificar
   * @returns true si el género está seleccionado, false en caso contrario
   */
  isGenreSelected(id: number): boolean {
    return this.selectedGenreIds.includes(id);
  }

  /**
   * Alterna la selección de un género dado su ID.
   * Si el género ya está seleccionado, se deselecciona; si no, se selecciona.
   * @param id ID del género a alternar
   */
  toggleGenre(id: number): void {
    const idx = this.selectedGenreIds.indexOf(id);
    if (idx >= 0) {
      this.selectedGenreIds.splice(idx, 1);
    } else {
      this.selectedGenreIds.push(id);
    }
  }

  /**
   * Elimina un género de la lista de géneros seleccionados dado su ID.
   * Si el género no está seleccionado, no hace nada.
   * @param id ID del género a eliminar de la selección
   */
  removeGenre(id: number): void {
    this.selectedGenreIds = this.selectedGenreIds.filter(g => g !== id);
  }

  /**
   * Obtiene el nombre de un género dado su ID.
   * Si el género no se encuentra en la lista de todos los géneros, devuelve una cadena vacía.
   * @param id ID del género del cual obtener el nombre
   * @returns El nombre del género o una cadena vacía si no se encuentra el género
   */
  getGenreName(id: number): string {
    return this.allGenres.find(g => g.id === id)?.name || '';
  }

  /**
   * Genera la etiqueta que se muestra en el dropdown de géneros basado en los géneros seleccionados.
   * Si no hay géneros seleccionados, muestra "Selecciona géneros...".
   * Si hay géneros seleccionados, muestra una lista separada por comas de los nombres de los géneros seleccionados.
   * @returns La etiqueta a mostrar en el dropdown de géneros
   */
  getDropdownLabel(): string {
    if (this.selectedGenreIds.length === 0) return 'Selecciona géneros...';
    return this.allGenres
      .filter(g => this.selectedGenreIds.includes(g.id))
      .map(g => g.name)
      .join(', ');
  }

  /**
   * Maneja el cambio de archivo en el input de imagen de portada.
   * Lee el archivo seleccionado y genera una vista previa de la imagen.
   * Si se selecciona un archivo, se carga como Data URL y se asigna a coverImage para su posterior envío.
   * @param event Evento de cambio del input de archivo que contiene el archivo seleccionado por el usuario
   * @returns void
   */
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

  /**
   * Establece la imagen de portada a partir de la URL ingresada en el campo correspondiente.
   * @returns void
   */
  setImageFromUrl(): void {
    if (!this.coverImage.trim()) return;
    this.filePreview = this.coverImage;
  }

  /**
   * Limpia el formulario restableciendo todos los campos a sus valores iniciales.
   * @returns void
   */
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

  /**
   * Envía el formulario para crear un nuevo libro con los datos ingresados.
   * Realiza validaciones básicas antes de enviar la solicitud al servicio.
   * Si la creación es exitosa, muestra un mensaje de éxito y redirige al menú principal después de unos segundos.
   * Si ocurre un error, muestra un mensaje de error adecuado según el tipo de error.
   * @returns void
   */
  submit(): void {
    this.error = null;
    this.success = null;

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
        if (err.status === 409) {
          this.error = err.error || 'Ya existe un libro con el mismo título y autor';
        } else if (err.status === 400) {
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
