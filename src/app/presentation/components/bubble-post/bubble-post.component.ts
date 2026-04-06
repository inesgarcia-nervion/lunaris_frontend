import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ConfirmService } from '../../shared/confirm.service';
import { CommonModule } from '@angular/common';

/**
 * Componente para mostrar una publicación individual en el feed de burbujas. 
 * 
 * Incluye funcionalidades para mostrar texto, una o varias imágenes, número de "me gusta", y comentarios. 
 * Permite acciones como dar "me gusta", editar, eliminar y abrir la publicación en detalle. La edición y
 * eliminación solo están disponibles si `canDelete` es verdadero.
 */
export interface BubbleUser {
  name: string;
  avatarUrl?: string;
}

export interface BubbleComment {
  id: number;
  user: BubbleUser;
  text: string;
}

export interface BubblePost {
  id: number;
  user: BubbleUser;
  imageUrl?: string;
  imageUrls?: string[];
  text: string;
  likes: number;
  liked?: boolean;
  comments?: BubbleComment[];
}

/**
 * Componente para mostrar una publicación individual en el feed de burbujas.
 * 
 * Incluye funcionalidades para mostrar texto, una o varias imágenes, número de "me gusta", y comentarios.
 */
@Component({
  selector: 'app-bubble-post',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bubble-post.component.html',
  styleUrls: ['./bubble-post.component.css']
})
export class BubblePostComponent {
  @Input() post!: BubblePost;
  @Input() canDelete: boolean = false;
  @Output() like = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() open = new EventEmitter<BubblePost>();
  @Output() delete = new EventEmitter<number>();

  constructor(private confirmService: ConfirmService) {}

  currentImageIndex = 0;

  get images(): string[] {
    if (Array.isArray(this.post.imageUrls) && this.post.imageUrls.length) return this.post.imageUrls;
    if (this.post.imageUrl) return [this.post.imageUrl];
    return [];
  }

  /**
   * Muestra la siguiente imagen de la publicación. Si se proporciona un evento, 
   * se detiene su propagación para evitar que se dispare el evento de apertura de la publicación.
   * @param event Evento opcional que puede haber disparado el cambio de imagen.
   * @returns void
   */
  showNextImage(event?: Event) {
    if (event) event.stopPropagation();
    const imgs = this.images;
    if (!imgs.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % imgs.length;
  }

  /**
   * Muestra la imagen anterior de la publicación. Si se proporciona un evento,
   * se detiene su propagación para evitar que se dispare el evento de apertura de la publicación.
   * @param event Evento opcional que puede haber disparado el cambio de imagen.
   * @returns void
   */
  showPrevImage(event?: Event) {
    if (event) event.stopPropagation();
    const imgs = this.images;
    if (!imgs.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + imgs.length) % imgs.length;
  }

  /**
   * Devuelve la URL de la imagen actualmente seleccionada para mostrar en la publicación. 
   * Si no hay imágenes, devuelve undefined.
   * @returns La URL de la imagen actualmente seleccionada o undefined si no hay imágenes.
   */
  currentImageSrc(): string | undefined {
    const imgs = this.images;
    return imgs.length ? imgs[this.currentImageIndex] : undefined;
  }

  /**
   * Devuelve la URL de la primera imagen de la publicación, o undefined si no hay imágenes.
   * @returns La URL de la primera imagen o undefined si no hay imágenes.
   */
  firstImageSrc(): string | undefined {
    const imgs = this.images;
    return imgs.length ? imgs[0] : undefined;
  }

  /**
   * Solicita confirmación al usuario antes de emitir el evento de eliminación de la publicación.
   * @returns void
   */
  async onDeleteConfirm() {
    const ok = await this.confirmService.confirm('¿Estás seguro de eliminar esta publicación?');
    if (!ok) return;
    this.delete.emit(this.post.id);
  }

  /**
   * Emite el evento de "me gusta" para la publicación actual. El componente padre se encargará 
   * de manejar la lógica de actualización del estado de "me gusta".
   */
  onToggleLike() {
    this.like.emit(this.post.id);
  }

  /**
   * Emite el evento de edición para la publicación actual.
   */
  onEdit() {
    this.edit.emit(this.post.id);
  }

  /**
   * Emite el evento de eliminación para la publicación actual.
   */
  onDelete() {
    this.delete.emit(this.post.id);
  }

  /**
   * Emite el evento de apertura para mostrar la publicación en detalle. 
   */
  onOpen() {
    this.open.emit(this.post);
  }

  /**
   * Maneja el evento de clic en la publicación para abrirla en detalle, pero solo si el clic no se originó
   * en un botón, enlace o elemento interactivo dentro de la publicación. Esto evita que acciones como dar "me gusta" 
   * o navegar por las imágenes disparen la apertura de la publicación.
   * @param event El evento de clic que se ha producido en la publicación.
   * @returns void
   */
  onMaybeOpen(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;
    this.onOpen();
  }
}
