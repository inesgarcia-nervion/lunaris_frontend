import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { BubblePostComponent, BubblePost } from '../bubble-post/bubble-post.component';
import { ConfirmService } from '../../shared/confirm.service';
import { AuthService } from '../../../domain/services/auth.service';
import { BookSearchService } from '../../../domain/services/book-search.service';
import { PostService } from '../../../domain/services/post.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

/**
 * Componente principal del feed de burbujas, que muestra la lista de 
 * publicaciones, el formulario para crear nuevas publicaciones, y el 
 * modal de detalle de cada publicación.
 */
@Component({
  selector: 'app-bubble-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, BubblePostComponent, PaginationComponent],
  templateUrl: './bubble-feed.component.html',
  styleUrls: ['./bubble-feed.component.css']
})
export class BubbleFeedComponent implements OnInit, OnDestroy {
  posts: BubblePost[] = [];
  postSuccess: string | null = null;

  creating = false;
  newText = '';
  newImageFiles: File[] = [];
  newImagePreviews: string[] = [];
  newImagePreviewIndex = 0;
  editingId: number | null = null;
  editInline = false;
  imageError: string | null = null;
  editOriginalText = '';
  editOriginalImagePreviews: string[] = [];

  selected?: BubblePost;
  selectedImageIndex = 0;
  newCommentText = '';
  pendingDeleteId: number | null = null;

  pageSize = 5;
  currentPage = 1;
  pagedPosts: BubblePost[] = [];

  @ViewChild('postEditor') postEditorRef?: ElementRef<HTMLElement>;
  @ViewChild('commentEditor') commentEditorRef?: ElementRef<HTMLElement>;

  imageLoading = false;
  private imageObjectUrl: string | null = null;

  constructor(public auth: AuthService, private zone: NgZone, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private router: Router, private location: Location, private confirm: ConfirmService, private bookSearchService: BookSearchService, private postService: PostService) {}

  /**
   * Al iniciar el componente, se cargan las publicaciones desde el servidor.
   */
  ngOnInit(): void {
    this.loadPosts();
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (!id) { this.selected = undefined; return; }
      const pid = Number(id);
      const p = this.posts.find(x => x.id === pid);
      if (p) this.selected = p;
    });
  }

  /**
   * Actualiza la paginación de publicaciones según la página actual y el tamaño de página.
   * Esto se llama después de cargar las publicaciones, cambiar de página, o modificar la lista de publicaciones.
   * Asegura que `pagedPosts` contenga solo las publicaciones correspondientes a la página actual.
   */
  updatePagination(): void {
    const totalPages = Math.max(1, Math.ceil(this.posts.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedPosts = this.posts.slice(start, start + this.pageSize);
  }

  /**
   * Maneja el cambio de página cuando el usuario interactúa con el componente de paginación.
   * Actualiza `currentPage` y llama a `updatePagination()` para mostrar las publicaciones correspondientes 
   * a la nueva página.
   * @param page Número de la página seleccionada.
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  /**
   * Alterna el estado de "like" de una publicación específica identificada por `postId`.
   * Busca la publicación en la lista de publicaciones, invierte su estado de "like" y ajusta 
   * el contador de "likes" en consecuencia.
   * Luego, guarda los cambios persistiendo la lista de publicaciones actualizada.
   * @param postId ID de la publicación cuyo estado de "like" se desea alternar.
   * @returns void
   */
  toggleLike(postId: number) {
    this.postService.toggleLike(postId).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(x => x.id === postId);
        if (idx !== -1) this.posts[idx] = updated;
        if (this.selected && this.selected.id === postId) this.selected = updated;
        this.updatePagination();
        try { this.cdr.detectChanges(); } catch (_) {}
      }
    });
  }

  /**
   * Abre el modal de detalle para una publicación específica. 
   * @param post La publicación que se desea mostrar en detalle. Se asigna a `selected` 
   * para que el modal muestre su contenido.
   * También actualiza la URL para reflejar la publicación seleccionada sin recargar la 
   * página, y deshabilita el scroll del body para mejorar la experiencia de usuario en el modal.
   * @returns void
   */
  openPost(post: BubblePost) {
    this.selected = post;
    try { this.location.go(`/bubble/${post.id}`); } catch (_) {}
    try { document.body.style.overflow = 'hidden'; } catch (_) {}
  }

  /**
   * Cierra el modal de detalle de la publicación seleccionada.
   * Restablece `selected` a `undefined`, actualiza la URL y permite el scroll del body nuevamente.
   * @returns void
   */
  closeDetail() { this.selected = undefined; try { this.location.go('/bubble'); } catch (_) {} try { document.body.style.overflow = ''; } catch (_) {} }

  /**
   * Al destruir el componente, se asegura de restablecer el estilo de overflow del body para 
   * permitir el scroll nuevamente, en caso de que el componente se destruya mientras un modal 
   * de detalle está abierto.
   * Esto es una medida de seguridad para evitar que el scroll quede bloqueado si el componente 
   * se desmonta inesperadamente.
   * @returns void
   */
  ngOnDestroy(): void {
    try { document.body.style.overflow = ''; } catch (_) {}
  }

  private clearPostAlertAfterDelay(): void {
    setTimeout(() => {
      this.postSuccess = null;
      try { this.cdr.detectChanges(); } catch (_) {}
    }, 5000);
  }

  get selectedImages(): string[] {
    if (!this.selected) return [];
    if (Array.isArray(this.selected.imageUrls) && this.selected.imageUrls.length) return this.selected.imageUrls;
    if (this.selected.imageUrl) return [this.selected.imageUrl];
    return [];
  }

  /**
   * Muestra la siguiente imagen en el modal de detalle de la publicación seleccionada.
   * Si la publicación tiene varias imágenes, se cicla a través de ellas. Si solo tiene una 
   * imagen o no tiene imágenes, esta función no hace nada.
   * @returns void
   */
  showNextSelectedImage() {
    const imgs = this.selectedImages;
    if (!imgs.length) return;
    this.selectedImageIndex = (this.selectedImageIndex + 1) % imgs.length;
  }

  /**
   * Muestra la imagen anterior en el modal de detalle de la publicación seleccionada.
   * Si la publicación tiene varias imágenes, se cicla a través de ellas. Si solo tiene una 
   * imagen o no tiene imágenes, esta función no hace nada.
   * @returns void
   */
  showPrevSelectedImage() {
    const imgs = this.selectedImages;
    if (!imgs.length) return;
    this.selectedImageIndex = (this.selectedImageIndex - 1 + imgs.length) % imgs.length;
  }

  /**
   * Devuelve la URL de la imagen actualmente seleccionada en el modal de detalle de la publicación.
   * Si la publicación tiene varias imágenes, devuelve la imagen correspondiente a `selectedImageIndex`.
   * Si solo tiene una imagen, devuelve esa imagen. Si no tiene imágenes, devuelve `undefined`.
   * @returns La URL de la imagen seleccionada o `undefined` si no hay imágenes.
   */
  selectedImageSrc(): string | undefined {
    const imgs = this.selectedImages;
    return imgs.length ? imgs[this.selectedImageIndex] : undefined;
  }

  /**
   * Agrega un nuevo comentario a la publicación actualmente seleccionada.
   * @returns void
   */
  addComment() {
    if (!this.selected) return;
    const text = this.newCommentText?.trim();
    if (!text) return;
    const avatarUrl = this.auth.getLocalAvatar() || undefined;
    this.postService.addComment(this.selected.id, { text, userAvatarUrl: avatarUrl }).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(x => x.id === updated.id);
        if (idx !== -1) this.posts[idx] = updated;
        this.selected = updated;
        this.newCommentText = '';
        try { if (this.commentEditorRef?.nativeElement) this.commentEditorRef.nativeElement.innerHTML = ''; } catch (_) {}
        this.updatePagination();
        try { this.cdr.detectChanges(); } catch (_) {}
      }
    });
  }

  /**
   * Elimina un comentario específico de la publicación actualmente seleccionada, después de confirmar 
   * la acción con el usuario.
   * Solo el autor del comentario o un administrador pueden eliminar el comentario.
   * @returns void
   * @param commentId El ID del comentario a eliminar.
   */
  async deleteComment(commentId: number) {
    if (!this.selected || !this.selected.comments) return;
    const ok = await this.confirm.confirm('¿Estás seguro de eliminar este comentario?');
    if (!ok) return;
    this.postService.deleteComment(this.selected.id, commentId).subscribe({
      next: (updated) => {
        const idx = this.posts.findIndex(x => x.id === updated.id);
        if (idx !== -1) this.posts[idx] = updated;
        this.selected = updated;
        this.updatePagination();
        try { this.cdr.detectChanges(); } catch (_) {}
      }
    });
  }

  /**
   * Inicia el proceso de eliminación de una publicación específica, estableciendo `pendingDeleteId`
   * con el ID de la publicación que se desea eliminar. Esto puede mostrar una confirmación en la 
   * interfaz de usuario para que el usuario confirme o cancele la eliminación.
   * @param id ID de la publicación que se desea eliminar.
   * @returns void
   */
  confirmRemovePost(id: number) {
    this.pendingDeleteId = id;
  }

  /**
   * Cancela el proceso de eliminación de una publicación, restableciendo `pendingDeleteId` a `null`.
   * Esto puede ocultar cualquier confirmación de eliminación que se esté mostrando en la interfaz de usuario.
   * @returns void
   */
  cancelRemovePost() {
    this.pendingDeleteId = null;
  }

  /**
   * Elimina una publicación específica después de confirmar que el usuario tiene permiso para eliminarla
   * (es el autor o un administrador). Actualiza la lista de publicaciones eliminando la publicación con el ID dado,
   * y si la publicación eliminada es la que está actualmente seleccionada, también deselecciona esa publicación.
   * Finalmente, guarda los cambios persistiendo la lista de publicaciones actualizada.
   * @param id ID de la publicación que se desea eliminar. Se verifica que el usuario tenga permiso para eliminar 
   * esta publicación antes de proceder con la eliminación.
   * @returns void
   */
  removeConfirmedPost(id: number) {
    this.postService.delete(id).subscribe({
      next: () => {
        this.posts = this.posts.filter(x => x.id !== id);
        if (this.selected && this.selected.id === id) this.selected = undefined;
        if (this.pendingDeleteId === id) this.pendingDeleteId = null;
        this.updatePagination();
        this.postSuccess = 'Publicación eliminada';
        this.clearPostAlertAfterDelay();
        try { this.cdr.detectChanges(); } catch (_) {}
      }
    });
  }

  /**
   * Abre el formulario para crear una nueva publicación. Establece `creating` en `true` para mostrar el formulario,
   * y luego, después de un breve retraso para permitir que el formulario se renderice, establece el foco en el editor 
   * de texto del formulario.
   * Esto mejora la experiencia del usuario al permitirle comenzar a escribir inmediatamente después de hacer clic para 
   * crear una nueva publicación.
   * @returns void
   */
  openCreate() {
    this.creating = true;
    setTimeout(() => { try { this.setPostEditorContent(); if (this.postEditorRef?.nativeElement) this.postEditorRef.nativeElement.focus(); } catch (_) {} }, 50);
  }

  cancelCreate() { this.creating = false; this.clearForm(); this.editingId = null; }

  /**
   * Maneja la selección de imágenes para una nueva publicación. Permite seleccionar hasta 3 imágenes, incluyendo las 
   * que ya se han seleccionado previamente.
   * @param e Evento de selección de archivos.
   * @returns void
   */
  onImageSelected(e: Event) {
    const inp = e.target as HTMLInputElement;
    if (!inp.files || inp.files.length === 0) {
      return;
    }

    const selectedFiles = Array.from(inp.files);
    const existingCount = (this.newImagePreviews && this.newImagePreviews.length) || 0;
    if (existingCount + selectedFiles.length > 3) {
      this.imageError = 'El máximo es 3 imágenes';
      this.cdr.detectChanges();
      setTimeout(() => { this.zone.run(() => { this.imageError = null; this.cdr.detectChanges(); }); }, 3000);
      return;
    }

    const files = selectedFiles.slice(0, Math.max(0, 3 - existingCount));
    this.newImageFiles = [...(this.newImageFiles || []), ...files];
    this.imageLoading = true;

    const readers: Promise<void>[] = files.map((file, relIdx) => {
      const absIdx = existingCount + relIdx;
      return new Promise<void>((resolve) => {
        try {
          const obj = URL.createObjectURL(file);
          this.newImagePreviews.push(obj);
        } catch (_) {
          this.newImagePreviews.push('');
        }

        const r = new FileReader();
        r.onload = () => {
          const data = r.result as string;
          try { this.zone.run(() => { this.newImagePreviews[absIdx] = data || this.newImagePreviews[absIdx]; this.cdr.detectChanges(); resolve(); }); } catch (_) { resolve(); }
        };
        r.onerror = () => { resolve(); };
        r.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(() => { this.zone.run(() => { this.imageLoading = false; this.cdr.detectChanges(); }); });
  }

  /**
   * Abre el selector de archivos para reemplazar una imagen específica en el formulario de creación o 
   * edición de publicaciones.
   * @param i Índice de la imagen a reemplazar.
   */
  replaceFileClick(i: number) {
    try { const el = document.getElementById('replace-file-' + i) as HTMLInputElement | null; if (el) el.click(); } catch (_) {}
  }

  /**
   * Abre el selector de archivos para reemplazar una imagen específica en el formulario de edición de publicaciones.
   * @param i Índice de la imagen a reemplazar.
   */
  replaceFileClickEdit(i: number) {
    try { const el = document.getElementById('replace-file-edit-' + i) as HTMLInputElement | null; if (el) el.click(); } catch (_) {}
  }

  /**
   * Maneja la selección de un nuevo archivo para reemplazar una imagen existente en el formulario de creación 
   * o edición de publicaciones.
   * Actualiza la lista de archivos e imágenes previas con el nuevo archivo seleccionado, y actualiza la vista 
   * para mostrar la nueva imagen.
   * @param e Evento de selección de archivos.
   * @param index Índice de la imagen que se desea reemplazar.
   * @returns void
   */
  onReplaceImage(e: Event, index: number) {
    const inp = e.target as HTMLInputElement;
    if (!inp.files || inp.files.length === 0) return;
    const f = inp.files[0];
    this.newImageFiles[index] = f;
    try {
      const obj = URL.createObjectURL(f);
      this.newImagePreviews[index] = obj;
    } catch (_) {}
    const reader = new FileReader();
    reader.onload = () => {
      try { this.zone.run(() => { this.newImagePreviews[index] = (reader.result as string) || this.newImagePreviews[index]; this.cdr.detectChanges(); }); } catch (_) {}
    };
    reader.onerror = () => {};
    reader.readAsDataURL(f);
  }

  /**
   * Elimina una imagen específica de la lista de imágenes previas y archivos seleccionados para una nueva publicación.
   * @param index Índice de la imagen que se desea eliminar.
   * @returns void
   */
  deleteImage(index: number) {
    if (index < 0 || index >= this.newImagePreviews.length) return;
    this.newImagePreviews.splice(index, 1);
    if (this.newImageFiles && this.newImageFiles.length > index) this.newImageFiles.splice(index, 1);
    if (this.newImagePreviewIndex >= this.newImagePreviews.length) {
      this.newImagePreviewIndex = Math.max(0, this.newImagePreviews.length - 1);
    }
    if (this.imageError) this.imageError = null;
  }

  /**
   * Selecciona una imagen específica para mostrar en el formulario de creación o edición de publicaciones,
   * actualizando `newImagePreviewIndex` con el índice de la imagen seleccionada. 
   * @param i Índice de la imagen que se desea seleccionar para vista previa.
   */
  selectNewImage(i: number) { 
    if (i >= 0 && i < this.newImagePreviews.length) { 
      this.newImagePreviewIndex = i; 
      try { 
        this.cdr.detectChanges(); 
      } catch (_) {
        // ignore
      } 
    } 
  }

  /**
   * Muestra la siguiente imagen en el formulario de creación o edición de publicaciones, 
   * ciclando a través de las imágenes previas disponibles.
   * @returns void
   */
  showNextNewImage() { 
    if (!this.newImagePreviews || this.newImagePreviews.length <= 1) 
      return; 
    this.newImagePreviewIndex = (this.newImagePreviewIndex + 1) % this.newImagePreviews.length; 
  }

  /**
   * Muestra la imagen anterior en el formulario de creación o edición de publicaciones, 
   * ciclando a través de las imágenes previas disponibles.
   * @returns void
   */
  showPrevNewImage() { 
    if (!this.newImagePreviews || this.newImagePreviews.length <= 1) 
      return; 
    this.newImagePreviewIndex = (this.newImagePreviewIndex - 1 + this.newImagePreviews.length) % this.newImagePreviews.length; 
  }

  /**
   * Maneja el evento de entrada de texto en el editor de texto del formulario de creación o edición de publicaciones.
   * @param el El elemento HTML del editor de texto que ha recibido la entrada. Se extrae el texto del contenido 
   * editable, se limita a 1000 caracteres, y se actualiza `newText` con el texto resultante.
   */
  onPostInput(el: HTMLElement) {
    const text = this.extractTextFromEditable(el);
    if (text.length > 1000) {
      const truncated = text.slice(0, 1000);
      this.setEditableFromText(el, truncated);
      this.newText = truncated;
    } else {
      this.newText = text;
    }
  }

  /**
   * Maneja el evento de entrada de texto en el editor de comentarios del formulario de creación o edición de publicaciones.
   * @param el El elemento HTML del editor de comentarios que ha recibido la entrada. Se extrae el texto del contenido 
   * editable y se actualiza `newCommentText` con el texto resultante.
   */
  onCommentInput(el: HTMLElement) {
    const text = this.extractTextFromEditable(el);
    this.newCommentText = text;
  }

  /**
   * Determina si el comentario que se desea enviar tiene contenido válido para ser enviado. 
   * @returns `true` si el comentario tiene texto no vacío después de eliminar espacios en 
   * blanco y caracteres invisibles, o `false` si el comentario está vacío o solo contiene espacios en blanco.
   */
  canSendComment(): boolean {
    if (!this.newCommentText) return false;
    const stripped = this.newCommentText.replace(/[\s\u00A0\u200B\u200C\u200D\uFEFF]/g, '');
    return stripped.length > 0;
  }

  /**
   * Maneja el evento de pulsación de teclas en el editor de texto del formulario de creación o edición de publicaciones.
   * @param event El evento de teclado que se ha producido. 
   * @param el El elemento HTML del editor de texto que ha recibido el evento. 
   * @returns void.
   */
  onPostKeydown(event: KeyboardEvent, el: HTMLElement) {
    const text = this.extractTextFromEditable(el);
    if (text.length >= 1000 && !this.isControlKey(event)) {
      event.preventDefault();
      return;
    }
  }

  /**
   * Maneja el evento de pulsación de teclas en el editor de comentarios del formulario de creación o edición de publicaciones.
   * @param event El evento de teclado que se ha producido.
   * @param el El elemento HTML del editor de comentarios que ha recibido el evento.
   * @returns void.
   */
  onCommentKeydown(event: KeyboardEvent, el: HTMLElement) {
  }

  /**
   * Determina si la tecla pulsada en un evento de teclado es una tecla de control 
   * que no debería contar para el límite de caracteres del editor de texto.
   * @param e El evento de teclado que se ha producido.
   * @returns `true` si la tecla pulsada es una tecla de control (como Backspace, Delete, Ctrl, Meta, o teclas de flecha), 
   * o `false` si es una tecla normal que debería contar para el límite de caracteres.
   */
  private isControlKey(e: KeyboardEvent) {
    return e.key === 'Backspace' || e.key === 'Delete' || e.ctrlKey || e.metaKey || e.key.startsWith('Arrow');
  }

  /**
   * Extrae el texto de un elemento HTML con contenido editable, reemplazando los saltos de línea y divs por 
   * caracteres de nueva línea.
   * @param el El elemento HTML del cual se desea extraer el texto. Se clona el elemento para manipularlo 
   * sin afectar el DOM original, y se reemplazan los elementos `<br>`, `<div>`, y `<p>` por caracteres de nueva 
   * línea para preservar el formato del texto.
   * @returns El texto extraído del elemento HTML, con los saltos de línea y divs reemplazados por caracteres de nueva línea.
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
   * Establece el contenido de un elemento HTML con formato a partir de un texto plano, escapando los caracteres HTML y 
   * reemplazando los saltos de línea por elementos `<br>`.
   * @param el El elemento HTML en el que se desea establecer el contenido.
   * @param text El texto plano que se desea establecer en el elemento HTML.
   */
  private setEditableFromText(el: HTMLElement, text: string) {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = esc(text).replace(/\n/g, '<br>');
    el.innerHTML = html;
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    } catch (_) {}
  }

  /**
   * Publica una nueva publicación o guarda los cambios de una publicación existente que se está editando.
   * @returns void
   */
  publish() {
    const avatar = this.auth.getLocalAvatar() || undefined;
    const imageUrls = this.newImagePreviews.slice(0, 3);
    if (this.editingId != null) {
      const editId = this.editingId;
      this.postService.update(editId, { text: this.newText || '', imageUrls, userAvatarUrl: avatar }).subscribe({
        next: (updated) => {
          const idx = this.posts.findIndex(x => x.id === editId);
          if (idx !== -1) this.posts[idx] = updated;
          if (this.selected && this.selected.id === editId) this.selected = updated;
          this.editingId = null;
          this.clearForm();
          this.creating = false;
          this.updatePagination();
          try { this.cdr.detectChanges(); } catch (_) {}
        }
      });
      return;
    }

    this.postService.create({ text: this.newText || '', imageUrls, userAvatarUrl: avatar }).subscribe({
      next: (created) => {
        this.posts.unshift(created);
        this.clearForm();
        this.creating = false;
        this.currentPage = 1;
        this.updatePagination();
        try { this.cdr.detectChanges(); } catch (_) {}
      }
    });
  }

  /**
   * Carga la lista de publicaciones desde el servidor.
   */
  private loadPosts() {
    this.postService.getAll().subscribe({
      next: (posts) => {
        this.posts = posts;
        this.updatePagination();
        try {
          const params = this.route.snapshot.params;
          const id = params['id'];
          if (id) {
            const pid = Number(id);
            const p = this.posts.find(x => x.id === pid);
            if (p) this.selected = p;
          }
        } catch (_) {}
        try { this.cdr.detectChanges(); } catch (_) {}
      },
      error: () => {
        this.posts = [];
        this.updatePagination();
      }
    });
  }

  /**
   * Inicia el proceso de edición de una publicación existente, identificada por `postId`.
   * @param postId ID de la publicación que se desea editar. Se busca la publicación en la lista de 
   * publicaciones, y si se encuentra, se inicializan los campos del formulario de edición con los datos 
   * de la publicación.
   * @returns void
   */
  startEdit(postId: number) {
    const p = this.posts.find(x => x.id === postId);
    if (!p) return;
    this.editingId = p.id;
    this.newText = p.text || '';
    this.newImagePreviews = (p.imageUrls && p.imageUrls.slice()) || (p.imageUrl ? [p.imageUrl] : []);
    this.editOriginalText = p.text || '';
    this.editOriginalImagePreviews = (p.imageUrls && p.imageUrls.slice()) || (p.imageUrl ? [p.imageUrl] : []);
    this.newImagePreviewIndex = 0;
    this.editInline = false;
    this.creating = true;
    setTimeout(() => { try { this.setPostEditorContent(); if (this.postEditorRef?.nativeElement) this.postEditorRef.nativeElement.focus(); } catch (_) {} }, 50);
  }

  private setPostEditorContent() {
    try {
      if (this.postEditorRef?.nativeElement) this.setEditableFromText(this.postEditorRef.nativeElement, this.newText || '');
    } catch (_) {}
  }

  private clearForm() {
    this.newText = '';
    this.newImageFiles = [];
    try { if (this.postEditorRef?.nativeElement) this.postEditorRef.nativeElement.innerHTML = ''; } catch (_) {}
    if (this.imageObjectUrl) { try { URL.revokeObjectURL(this.imageObjectUrl); } catch {} this.imageObjectUrl = null; }
    this.newImagePreviews = [];
    this.newImagePreviewIndex = 0;
    this.editOriginalText = '';
    this.editOriginalImagePreviews = [];
  }

  editHasChanges(): boolean {
    if (this.editingId == null) return false;
    const orig = (this.editOriginalText || '').trim();
    const curr = (this.newText || '').trim();
    if (orig !== curr) return true;
    const a = this.editOriginalImagePreviews || [];
    const b = this.newImagePreviews || [];
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return true;
    }
    return false;
  }
}
