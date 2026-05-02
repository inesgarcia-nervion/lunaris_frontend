import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsService, NewsItem } from '../../../domain/services/news.service';
import { BookSearchService } from '../../../domain/services/book-search.service';
import { ConfirmService } from '../../shared/confirm.service';
import { AuthService } from '../../../domain/services/auth.service';
import { Router } from '@angular/router';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
   * Componente para listar, crear y eliminar noticias (solo administradores).
   * Incluye paginación, subida de imagen y edición de contenido vía contenteditable.
   */
@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './noticias.component.html',
  styleUrls: ['./noticias.component.css']
})
export class NoticiasComponent implements OnInit {
  
  news: NewsItem[] = [];
  newsSuccess: string | null = null;
  title = '';
  text = '';
  body = '';
  imageData: string | null = null;
  isAdmin = false;
  error: string | null = null;
  pendingDeleteId: string | null = null;

  pageSize = 5;
  currentPage = 1;
  pagedNews: NewsItem[] = [];

  @ViewChild('bodyEditor') bodyEditorRef?: ElementRef<HTMLElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  showCreateModal = false;

  // Detectar cambios en el formulario de creación para habilitar/deshabilitar el botón
  hasCreateChanges(): boolean {
    try {
      if ((this.title || '').trim()) return true;
      if ((this.text || '').trim()) return true;
      if ((this.body || '').trim()) return true;
      if (this.imageData) return true;
      return false;
    } catch (_) { return false; }
  }

  /**
   * Al inicializar el componente, se cargan todas las noticias desde el servicio 
   * de noticias y se configura la paginación.
   * También se verifica si el usuario es administrador para mostrar las opciones 
   * de creación y eliminación de noticias.
   */
  ngOnInit(): void {
    this.newsService.news$.subscribe(n => {
      this.news = n || [];
      this.updatePagination();
    });
    this.newsService.refresh();
    this.isAdmin = this.auth.isAdmin();
    this.auth.isAdmin$.subscribe(v => this.isAdmin = v);
  }

  constructor(private newsService: NewsService, private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef, private confirm: ConfirmService, private bookSearchService: BookSearchService) {}

  /**
   * Navega a la página de detalles de una noticia específica.
   * @param id El ID de la noticia a mostrar en detalle.
   */
  openDetail(id: string) {
    this.router.navigate(['noticias', id]);
  }

  /**
   * Actualiza la lista de noticias mostrada según la página actual y el tamaño de página.
   * Calcula el número total de páginas y ajusta la página actual si es necesario.
   * Luego, extrae el subconjunto de noticias que corresponde a la página actual para mostrarlo.
   */
  updatePagination(): void {
    const totalPages = Math.max(1, Math.ceil(this.news.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedNews = this.news.slice(start, start + this.pageSize);
  }

  /**
   * Maneja el cambio de página solicitado por el usuario. Actualiza la página actual y recalcula 
   * la paginación para mostrar las noticias correspondientes a la nueva página.
   * @param page El número de página seleccionado por el usuario.
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  /**
   * Maneja el evento de cambio de archivo en el input de imagen. Lee el archivo seleccionado y 
   * lo convierte a una cadena de datos (data URL) que se puede mostrar como imagen en la vista 
   * previa. Si no se selecciona ningún archivo, simplemente retorna sin hacer nada.
   * @param e El evento de cambio de archivo.
   * @returns void
   */
  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => { this.imageData = reader.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }

  /**
   * Agrega una nueva noticia utilizando los datos ingresados en el formulario.
   * Verifica si el usuario es administrador antes de permitir la creación.
   * Limpia los campos del formulario y cierra el modal de creación después de agregar la noticia.
   */
  addNews() {
    if (!this.isAdmin) return;
    this.error = null;
    const title = this.title.trim();
    const text = this.text.trim();
    const body = this.body.trim();
    if (!title || !body) {
      this.error = 'Título y contenido (body) son obligatorios';
      setTimeout(() => { try { this.error = null; this.cdr.detectChanges(); } catch(_){} }, 3000);
      return;
    }
    this.newsService.addNews({ title, text, body, image: this.imageData || undefined }).subscribe({
      next: () => {
        this.closeCreateModal();
        this.newsSuccess = 'Noticia creada';
        setTimeout(() => { this.newsSuccess = null; try { this.cdr.detectChanges(); } catch(_){} }, 5000);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al crear la noticia';
        try { this.cdr.detectChanges(); } catch(_){}
        setTimeout(() => { try { this.error = null; this.cdr.detectChanges(); } catch(_){} }, 5000);
      }
    });
  }

  /**
   * Limpia la imagen seleccionada para la noticia en creación. Resetea el campo de entrada de
   * archivo y actualiza la vista para reflejar que no hay imagen seleccionada. 
   * @returns void
   */
  clearImage() {
    this.imageData = null;
    try { if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = ''; } catch (_) {}
    this.cdr.detectChanges();
  }

  /**
   * Maneja la entrada de texto en el editor de contenido (body) de la noticia. Extrae el texto 
   * plano del elemento editable, reemplazando saltos de línea y divs por caracteres de nueva 
   * línea para mantener el formato. 
   * @param el El elemento HTML editable que contiene el contenido de la noticia.
   */
  onBodyInput(el: HTMLElement) {
    this.body = this.extractTextFromEditable(el);
  }

  /**
   * Maneja eventos de teclado en el editor de contenido (body) de la noticia. Permite insertar 
   * saltos de línea al presionar Enter, y evita que se inserten saltos de línea adicionales 
   * si ya se ha alcanzado el límite de líneas permitido.
   * @param event El evento de teclado.
   * @param el El elemento HTML editable que contiene el contenido de la noticia.
   */
  onBodyKeydown(event: KeyboardEvent, el: HTMLElement) {
  }

  /**
   * Extrae el texto plano de un elemento HTML editable, reemplazando los saltos de línea y 
   * divs por caracteres de nueva línea.
   * Esto permite mantener el formato del texto ingresado por el usuario en el editor de 
   * contenido.
   * Si ocurre algún error durante la extracción, se devuelve el texto sin formato del elemento.
   * @param el El elemento HTML editable del cual se extraerá el texto.
   * @returns El texto plano extraído del elemento editable.
   */
  private extractTextFromEditable(el: HTMLElement): string {
    try {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('br').forEach(b => b.replaceWith(document.createTextNode('\n')));
      clone.querySelectorAll('div, p').forEach(node => {
        const t = node.textContent || '';
        node.replaceWith(document.createTextNode(t + '\n'));
      });
      let txt = clone.textContent || '';
      if (txt.endsWith('\n')) txt = txt.slice(0, -1);
      return txt;
    } catch (e) {
      return el.textContent || '';
    }
  }

  /**
   * Abre el modal de creación de noticias y establece el foco en el editor de contenido (body) 
   * después de un breve retraso para asegurar que el modal se haya renderizado completamente.
   * @returns void
   */
  openCreateModal() {
    this.showCreateModal = true;
    setTimeout(() => { try { this.bodyEditorRef?.nativeElement?.focus(); } catch (_) {} }, 50);
  }

  /**
   * Cierra el modal de creación de noticias y limpia todos los campos del formulario, incluyendo 
   * el título, texto, contenido (body) e imagen seleccionada.
   * @returns void
   */
  closeCreateModal() {
    this.showCreateModal = false;
    this.title = '';
    this.text = '';
    this.body = '';
    this.imageData = null;
    this.error = null;
    try { if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = ''; } catch (_) {}
    try { if (this.bodyEditorRef?.nativeElement) this.bodyEditorRef.nativeElement.innerHTML = ''; } catch (_) {}
    try { this.cdr.detectChanges(); } catch (_) {}
  }


  /**
   * Solicita confirmación al usuario antes de eliminar una noticia. Si el usuario confirma, se 
   * llama al servicio de noticias para eliminar la noticia con el ID especificado.
   * @param id El ID de la noticia a eliminar.
   * @returns void
   */
  async confirmRemove(id: string) {
    if (!this.isAdmin) return;
    const ok = await this.confirm.confirm('¿Estás seguro de eliminar esta noticia?');
    if (!ok) return;
    this.newsService.removeNews(id).subscribe({
      next: () => {
        this.newsService.refresh();
        this.newsSuccess = 'Noticia eliminada';
        setTimeout(() => { this.newsSuccess = null; try { this.cdr.detectChanges(); } catch(_){} }, 5000);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al eliminar la noticia';
        setTimeout(() => { try { this.error = null; this.cdr.detectChanges(); } catch(_){} }, 5000);
      }
    });
  }

  /**
   * Solicita al usuario que confirme la eliminación de una noticia específica. Si el usuario
   * es administrador, se establece el ID de la noticia pendiente de eliminación, lo que puede 
   * activar la visualización de opciones de confirmación en la interfaz de usuario.
   * @param id El ID de la noticia a eliminar.
   * @returns void
   */
  requestInlineDelete(id: string) {
    if (!this.isAdmin) return;
    this.pendingDeleteId = id;
  }

  /**
   * Elimina una noticia confirmada por el usuario. Verifica si el usuario es administrador 
   * antes de permitir la eliminación. Si la eliminación es exitosa, se limpia el ID de la 
   * noticia pendiente de eliminación.
   * @param id El ID de la noticia a eliminar.
   * @returns void
   */
  async removeConfirmed(id: string) {
    if (!this.isAdmin) return;
    this.newsService.removeNews(id).subscribe({
      next: () => {
        this.newsService.refresh();
        this.pendingDeleteId = null;
        this.newsSuccess = 'Noticia eliminada';
        setTimeout(() => { this.newsSuccess = null; try { this.cdr.detectChanges(); } catch(_){} }, 5000);
      },
      error: (err) => {
        this.pendingDeleteId = null;
        this.error = err?.error?.message || 'Error al eliminar la noticia';
        setTimeout(() => { try { this.error = null; this.cdr.detectChanges(); } catch(_){} }, 5000);
      }
    });
  }

  /**
   * Cancela la eliminación de una noticia. Limpia el ID de la noticia pendiente de eliminación, 
   * lo que puede ocultar las opciones de confirmación en la interfaz de usuario.
   * @returns void
   */
  cancelRemove() {
    this.pendingDeleteId = null;
  }
}
