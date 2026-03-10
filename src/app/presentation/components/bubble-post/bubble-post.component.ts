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
  @Output() like = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() open = new EventEmitter<BubblePost>();

  onToggleLike() {
    this.like.emit(this.post.id);
  }

  onEdit() {
    this.edit.emit(this.post.id);
  }

  onOpen() {
    this.open.emit(this.post);
  }
}
