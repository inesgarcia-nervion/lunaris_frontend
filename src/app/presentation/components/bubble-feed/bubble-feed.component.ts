import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { BubblePostComponent, BubblePost } from '../bubble-post/bubble-post.component';
import { ConfirmService } from '../../shared/confirm.service';
import { AuthService } from '../../../domain/services/auth.service';

@Component({
  selector: 'app-bubble-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, BubblePostComponent],
  templateUrl: './bubble-feed.component.html',
  styleUrls: ['./bubble-feed.component.css']
})
export class BubbleFeedComponent implements OnInit, OnDestroy {
  // Start empty — user will add posts later
  posts: BubblePost[] = [];

  // Create form state
  creating = false;
  newText = '';
  // soporta hasta 3 imágenes
  newImageFiles: File[] = [];
  newImagePreviews: string[] = [];
  newImagePreviewIndex = 0;
  // If editing, stores the id of the post being edited
  editingId: number | null = null;
  // controls whether editing happens inline in the list or in the separate modal
  editInline = false;
  // validation / UI error when handling images
  imageError: string | null = null;

  selected?: BubblePost;
  selectedImageIndex = 0;
  newCommentText = '';
  // id of the post pending deletion (for inline confirm)
  pendingDeleteId: number | null = null;

  @ViewChild('postEditor') postEditorRef?: ElementRef<HTMLElement>;
  @ViewChild('commentEditor') commentEditorRef?: ElementRef<HTMLElement>;

  imageLoading = false;
  private imageObjectUrl: string | null = null;

  constructor(public auth: AuthService, private zone: NgZone, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private router: Router, private location: Location, private confirm: ConfirmService) {}

  ngOnInit(): void {
    // Load persisted posts from localStorage
    this.loadPosts();
    // If route contains an id param, open that post when posts are available
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (!id) { this.selected = undefined; return; }
      const pid = Number(id);
      // If posts are already loaded, open immediately
      const p = this.posts.find(x => x.id === pid);
      if (p) this.selected = p;
      // Otherwise keep selected undefined; when posts are published locally they will appear in the list
    });
  }

  toggleLike(postId: number) {
    const p = this.posts.find(x => x.id === postId);
    if (!p) return;
    p.liked = !p.liked;
    p.likes += p.liked ? 1 : -1;
    this.savePosts();
  }


  openPost(post: BubblePost) {
    this.selected = post;
    // Update URL without re-navigating so the component (and posts list) is not recreated
    try { this.location.go(`/bubble/${post.id}`); } catch (_) {}
    try { document.body.style.overflow = 'hidden'; } catch (_) {}
  }

  closeDetail() { this.selected = undefined; try { this.location.go('/bubble'); } catch (_) {} try { document.body.style.overflow = ''; } catch (_) {} }

  ngOnDestroy(): void {
    try { document.body.style.overflow = ''; } catch (_) {}
  }

  get selectedImages(): string[] {
    if (!this.selected) return [];
    if (Array.isArray(this.selected.imageUrls) && this.selected.imageUrls.length) return this.selected.imageUrls;
    if (this.selected.imageUrl) return [this.selected.imageUrl];
    return [];
  }

  showNextSelectedImage() {
    const imgs = this.selectedImages;
    if (!imgs.length) return;
    this.selectedImageIndex = (this.selectedImageIndex + 1) % imgs.length;
  }

  showPrevSelectedImage() {
    const imgs = this.selectedImages;
    if (!imgs.length) return;
    this.selectedImageIndex = (this.selectedImageIndex - 1 + imgs.length) % imgs.length;
  }

  selectedImageSrc(): string | undefined {
    const imgs = this.selectedImages;
    return imgs.length ? imgs[this.selectedImageIndex] : undefined;
  }

  addComment() {
    if (!this.selected) return;
    const text = this.newCommentText?.trim();
    if (!text) return;
    const user = { name: this.auth.getCurrentUsername() || 'Tú' };
    const comment = { id: Date.now(), user, text };
    this.selected.comments = this.selected.comments || [];
    this.selected.comments.push(comment);
    // Update post in list as well
    const p = this.posts.find(x => x.id === this.selected!.id);
    if (p) p.comments = this.selected.comments;
    this.newCommentText = '';
    // clear editor content
    try { if (this.commentEditorRef?.nativeElement) this.commentEditorRef.nativeElement.innerHTML = ''; } catch (_) {}
    this.savePosts();
  }

  async deleteComment(commentId: number) {
    if (!this.selected || !this.selected.comments) return;
    const currentUser = this.auth.getCurrentUsername();
    const isAdmin = this.auth.isAdmin();
    const comment = this.selected.comments.find(c => c.id === commentId);
    if (!comment) return;
    if (!isAdmin && comment.user.name !== currentUser) return; // not allowed

    const ok = await this.confirm.confirm('¿Estás seguro de eliminar este comentario?');
    if (!ok) return;

    // remove from selected.comments
    this.selected.comments = this.selected.comments.filter(c => c.id !== commentId);

    // update the post in the posts list as well
    const p = this.posts.find(x => x.id === this.selected!.id);
    if (p) p.comments = this.selected.comments;
    try { this.cdr.detectChanges(); } catch (_) {}
    this.savePosts();
  }

  // ---- Post deletion (inline confirm like Noticias) ----
  confirmRemovePost(id: number) {
    this.pendingDeleteId = id;
  }

  cancelRemovePost() {
    this.pendingDeleteId = null;
  }

  removeConfirmedPost(id: number) {
    const isAdmin = this.auth.isAdmin();
    const currentUser = this.auth.getCurrentUsername();
    const p = this.posts.find(x => x.id === id);
    if (!p) return;
    if (!isAdmin && p.user.name !== currentUser) return;
    this.posts = this.posts.filter(x => x.id !== id);
    if (this.selected && this.selected.id === id) this.selected = undefined;
    if (this.pendingDeleteId === id) this.pendingDeleteId = null;
    this.savePosts();
  }

  
  openCreate() {
    this.creating = true;
    // set editor content after modal renders
    setTimeout(() => { try { this.setPostEditorContent(); if (this.postEditorRef?.nativeElement) this.postEditorRef.nativeElement.focus(); } catch (_) {} }, 50);
  }

  cancelCreate() { this.creating = false; this.clearForm(); this.editingId = null; }

  onImageSelected(e: Event) {
    const inp = e.target as HTMLInputElement;
    if (!inp.files || inp.files.length === 0) {
      return; // no borrar las imágenes existentes si la selección está vacía
    }

    // prevent exceeding global max of 3 images (including existing previews)
    const selectedFiles = Array.from(inp.files);
    const existingCount = (this.newImagePreviews && this.newImagePreviews.length) || 0;
    if (existingCount + selectedFiles.length > 3) {
      this.imageError = 'El máximo es 3 imágenes';
      return;
    }

    // cap at remaining slots and append to existing images
    const files = selectedFiles.slice(0, Math.max(0, 3 - existingCount));
    this.newImageFiles = [...(this.newImageFiles || []), ...files];
    this.imageLoading = true;

    const readers: Promise<void>[] = files.map((file, relIdx) => {
      const absIdx = existingCount + relIdx;
      return new Promise<void>((resolve) => {
        // push object URL immediately for feedback
        try {
          const obj = URL.createObjectURL(file);
          this.newImagePreviews.push(obj);
        } catch (_) {
          this.newImagePreviews.push('');
        }

        const r = new FileReader();
        r.onload = () => {
          const data = r.result as string;
          // replace at the correct absolute index with the persistent data URL
          try { this.zone.run(() => { this.newImagePreviews[absIdx] = data || this.newImagePreviews[absIdx]; this.cdr.detectChanges(); resolve(); }); } catch (_) { resolve(); }
        };
        r.onerror = () => { resolve(); };
        r.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(() => { this.zone.run(() => { this.imageLoading = false; this.cdr.detectChanges(); }); });
  }

  replaceFileClick(i: number) {
    try { const el = document.getElementById('replace-file-' + i) as HTMLInputElement | null; if (el) el.click(); } catch (_) {}
  }

  replaceFileClickEdit(i: number) {
    try { const el = document.getElementById('replace-file-edit-' + i) as HTMLInputElement | null; if (el) el.click(); } catch (_) {}
  }

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

  deleteImage(index: number) {
    if (index < 0 || index >= this.newImagePreviews.length) return;
    this.newImagePreviews.splice(index, 1);
    if (this.newImageFiles && this.newImageFiles.length > index) this.newImageFiles.splice(index, 1);
    if (this.newImagePreviewIndex >= this.newImagePreviews.length) {
      this.newImagePreviewIndex = Math.max(0, this.newImagePreviews.length - 1);
    }
    // clear any image-related error when user manually deletes
    if (this.imageError) this.imageError = null;
  }

  selectNewImage(i: number) { if (i >= 0 && i < this.newImagePreviews.length) { this.newImagePreviewIndex = i; try { this.cdr.detectChanges(); } catch (_) {} } }

  showNextNewImage() { if (!this.newImagePreviews || this.newImagePreviews.length <= 1) return; this.newImagePreviewIndex = (this.newImagePreviewIndex + 1) % this.newImagePreviews.length; }

  showPrevNewImage() { if (!this.newImagePreviews || this.newImagePreviews.length <= 1) return; this.newImagePreviewIndex = (this.newImagePreviewIndex - 1 + this.newImagePreviews.length) % this.newImagePreviews.length; }

  // ---- Contenteditable helpers ----
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

  onCommentInput(el: HTMLElement) {
    const text = this.extractTextFromEditable(el);
    this.newCommentText = text;
  }

  onPostKeydown(event: KeyboardEvent, el: HTMLElement) {
    // Prevent exceeding max length when typing
    const text = this.extractTextFromEditable(el);
    if (text.length >= 1000 && !this.isControlKey(event)) {
      // allow navigation and deletion
      event.preventDefault();
      return;
    }
  }

  onCommentKeydown(event: KeyboardEvent, el: HTMLElement) {
    // Allow Enter for newline; do nothing special here but keep hook for future rules
  }

  private isControlKey(e: KeyboardEvent) {
    return e.key === 'Backspace' || e.key === 'Delete' || e.ctrlKey || e.metaKey || e.key.startsWith('Arrow');
  }

  private extractTextFromEditable(el: HTMLElement): string {
    try {
      const clone = el.cloneNode(true) as HTMLElement;
      // convert <br> to newlines
      clone.querySelectorAll('br').forEach(b => b.replaceWith(document.createTextNode('\n')));
      // convert block elements to their text plus newline
      clone.querySelectorAll('div, p').forEach(node => {
        const t = node.textContent || '';
        node.replaceWith(document.createTextNode(t + '\n'));
      });
      // textContent preserves spaces; trim trailing newline
      let txt = clone.textContent || '';
      if (txt.endsWith('\n')) txt = txt.slice(0, -1);
      return txt;
    } catch (e) {
      return el.textContent || '';
    }
  }

  private setEditableFromText(el: HTMLElement, text: string) {
    // escape HTML and replace newlines with <br>
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = esc(text).replace(/\n/g, '<br>');
    el.innerHTML = html;
    // place caret at end
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
    } catch (_) {}
  }

  publish() {
    const username = this.auth.getCurrentUsername() || 'Tú';
    const avatar = this.auth.getLocalAvatar() || null;
    if (this.editingId != null) {
      // Save edits to existing post
      const p = this.posts.find(x => x.id === this.editingId);
      if (!p) return;
      p.text = this.newText || '';
      // compatibilidad: guardar array de urls si hay varias
      if (this.newImagePreviews && this.newImagePreviews.length) {
        p.imageUrls = this.newImagePreviews.slice(0, 3);
        p.imageUrl = this.newImagePreviews[0] || undefined;
      } else {
        p.imageUrls = undefined;
        p.imageUrl = undefined;
      }
      this.editingId = null;
      this.clearForm();
      this.creating = false;
      this.savePosts();
      return;
    }

    const id = Date.now();
    const post: BubblePost = {
      id,
      user: { name: username, avatarUrl: avatar || undefined },
      imageUrl: this.newImagePreviews.length ? this.newImagePreviews[0] : undefined,
      imageUrls: this.newImagePreviews.length ? this.newImagePreviews.slice(0, 3) : undefined,
      text: this.newText || '',
      likes: 0,
      liked: false,
      comments: []
    };
    this.posts.unshift(post);
    this.clearForm();
    this.creating = false;
    this.savePosts();
  }

  // Persist posts to localStorage so they survive page reloads
  private readonly STORAGE_KEY = 'lunaris.bubble.posts.v1';

  private savePosts() {
    try {
      const serialized = JSON.stringify(this.posts || []);
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (e) {
      // ignore storage errors
    }
  }

  private loadPosts() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BubblePost[];
      if (Array.isArray(parsed)) {
        this.posts = parsed;
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  startEdit(postId: number) {
    const p = this.posts.find(x => x.id === postId);
    if (!p) return;
    this.editingId = p.id;
    this.newText = p.text || '';
    // restore previews from post imageUrls or single imageUrl
    this.newImagePreviews = (p.imageUrls && p.imageUrls.slice()) || (p.imageUrl ? [p.imageUrl] : []);
    this.newImagePreviewIndex = 0;
    // Open the editor in the separate modal instead of inline
    this.editInline = false;
    this.creating = true;
    // set editor content after the modal renders
    setTimeout(() => { try { this.setPostEditorContent(); if (this.postEditorRef?.nativeElement) this.postEditorRef.nativeElement.focus(); } catch (_) {} }, 50);
  }

  // Ensure contenteditable reflects `newText` after view updates
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
  }
}
