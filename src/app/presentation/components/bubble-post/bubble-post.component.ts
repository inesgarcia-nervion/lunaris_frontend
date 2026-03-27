import { Component, Input, Output, EventEmitter } from '@angular/core';
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
