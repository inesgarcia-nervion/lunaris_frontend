import { Component, OnInit, NgZone, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { BubblePostComponent, BubblePost } from '../bubble-post/bubble-post.component';
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
  newImageFile: File | null = null;
  newImagePreview: string | null = null;
  // If editing, stores the id of the post being edited
  editingId: number | null = null;

  selected?: BubblePost;
  newCommentText = '';

  imageLoading = false;
  private imageObjectUrl: string | null = null;

  constructor(public auth: AuthService, private zone: NgZone, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private router: Router, private location: Location) {}

  ngOnInit(): void {
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
  }

  openCreate() { this.creating = true }

  cancelCreate() { this.creating = false; this.clearForm(); this.editingId = null; }

  onImageSelected(e: Event) {
    const inp = e.target as HTMLInputElement;
    if (!inp.files || inp.files.length === 0) { this.newImageFile = null; this.newImagePreview = null; return; }
    const f = inp.files[0];
    this.newImageFile = f;
    // Create an object URL first so the preview appears immediately
    try {
      if (this.imageObjectUrl) { try { URL.revokeObjectURL(this.imageObjectUrl); } catch {} }
      this.imageObjectUrl = URL.createObjectURL(f);
      this.newImagePreview = this.imageObjectUrl;
    } catch (e) {
      this.newImagePreview = null;
    }

    // Then also read as data URL for broader compatibility/persistence
    this.imageLoading = true;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.zone.run(() => {
          // Replace object URL with data URL when ready
          const data = reader.result as string;
          this.newImagePreview = data || this.newImagePreview;
          if (this.imageObjectUrl) { try { URL.revokeObjectURL(this.imageObjectUrl); } catch {} this.imageObjectUrl = null; }
          this.imageLoading = false;
          this.cdr.detectChanges();
        });
      } catch (err) {
        this.zone.run(() => { this.newImagePreview = this.newImagePreview || null; this.imageLoading = false; this.cdr.detectChanges(); });
      }
    };
    reader.onerror = () => { this.zone.run(() => { this.newImagePreview = this.newImagePreview || null; this.imageLoading = false; this.cdr.detectChanges(); }); };
    reader.readAsDataURL(f);
  }

  publish() {
    const username = this.auth.getCurrentUsername() || 'Tú';
    const avatar = this.auth.getLocalAvatar() || null;
    if (this.editingId != null) {
      // Save edits to existing post
      const p = this.posts.find(x => x.id === this.editingId);
      if (!p) return;
      p.text = this.newText || '';
      p.imageUrl = this.newImagePreview || undefined;
      this.editingId = null;
      this.clearForm();
      this.creating = false;
      return;
    }

    const id = Date.now();
    const post: BubblePost = {
      id,
      user: { name: username, avatarUrl: avatar || undefined },
      imageUrl: this.newImagePreview || undefined,
      text: this.newText || '',
      likes: 0,
      liked: false,
      comments: []
    };
    this.posts.unshift(post);
    this.clearForm();
    this.creating = false;
  }

  startEdit(postId: number) {
    const p = this.posts.find(x => x.id === postId);
    if (!p) return;
    this.editingId = p.id;
    this.newText = p.text || '';
    this.newImagePreview = p.imageUrl || null;
    this.creating = true;
  }

  private clearForm() {
    this.newText = '';
    this.newImageFile = null;
    if (this.imageObjectUrl) { try { URL.revokeObjectURL(this.imageObjectUrl); } catch {} this.imageObjectUrl = null; }
    this.newImagePreview = null;
  }
}
