import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ConfirmService } from '../../shared/confirm.service';
import { CommonModule } from '@angular/common';

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
  /** Nuevo: soporte para varias imágenes (máx 3) */
  imageUrls?: string[];
  text: string;
  likes: number;
  liked?: boolean;
  comments?: BubbleComment[];
}

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

  // Índice de imagen actualmente visible (por instancia)
  currentImageIndex = 0;

  get images(): string[] {
    // compatibilidad: priorizamos imageUrls, si no existe usamos imageUrl como array de uno
    if (Array.isArray(this.post.imageUrls) && this.post.imageUrls.length) return this.post.imageUrls;
    if (this.post.imageUrl) return [this.post.imageUrl];
    return [];
  }

  showNextImage(event?: Event) {
    if (event) event.stopPropagation();
    const imgs = this.images;
    if (!imgs.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % imgs.length;
  }

  showPrevImage(event?: Event) {
    if (event) event.stopPropagation();
    const imgs = this.images;
    if (!imgs.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + imgs.length) % imgs.length;
  }

  currentImageSrc(): string | undefined {
    const imgs = this.images;
    return imgs.length ? imgs[this.currentImageIndex] : undefined;
  }

  firstImageSrc(): string | undefined {
    const imgs = this.images;
    return imgs.length ? imgs[0] : undefined;
  }

  async onDeleteConfirm() {
    const ok = await this.confirmService.confirm('¿Estás seguro de eliminar esta publicación?');
    if (!ok) return;
    this.delete.emit(this.post.id);
  }

  onToggleLike() {
    this.like.emit(this.post.id);
  }

  onEdit() {
    this.edit.emit(this.post.id);
  }

  onDelete() {
    this.delete.emit(this.post.id);
  }

  onOpen() {
    this.open.emit(this.post);
  }

  onMaybeOpen(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // if the click originated inside a button, input, or element with role button, don't open
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;
    this.onOpen();
  }
}
