import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsService, NewsItem } from '../../../domain/services/news.service';
import { AuthService } from '../../../domain/services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './noticias.component.html',
  styleUrls: ['./noticias.component.css']
})
export class NoticiasComponent implements OnInit {
  news: NewsItem[] = [];
  title = '';
  text = '';
  body = '';
  imageData: string | null = null;
  isAdmin = false;
  // id of the news pending deletion (for inline confirm)
  pendingDeleteId: string | null = null;

  @ViewChild('bodyEditor') bodyEditorRef?: ElementRef<HTMLElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  showCreateModal = false;


  


  ngOnInit(): void {
    this.news = this.newsService.getAll();
    this.newsService.news$.subscribe(n => this.news = n || []);
    this.isAdmin = this.auth.isAdmin();
    this.auth.isAdmin$.subscribe(v => this.isAdmin = v);
  }

  constructor(private newsService: NewsService, private auth: AuthService, private router: Router, private cdr: ChangeDetectorRef) {}

  openDetail(id: string) {
    this.router.navigate(['noticias', id]);
  }


  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => { this.imageData = reader.result as string; this.cdr.detectChanges(); };
    reader.readAsDataURL(file);
  }


  addNews() {
    if (!this.isAdmin) return;
    const title = this.title.trim();
    const text = this.text.trim();
    const body = this.body.trim();
    if (!title || !body) return alert('Título y contenido (body) son obligatorios');
    // text (summary) is optional; body holds the full news content
    this.newsService.addNews({ title, text, body, image: this.imageData || undefined });
    this.title = '';
    this.text = '';
    this.body = '';
    this.imageData = null;
    try { if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = ''; } catch (_) {}
    try { if (this.bodyEditorRef?.nativeElement) this.bodyEditorRef.nativeElement.innerHTML = ''; } catch (_) {}
    this.closeCreateModal();
  }

  clearImage() {
    this.imageData = null;
    try { if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = ''; } catch (_) {}
    this.cdr.detectChanges();
  }

  // Contenteditable helpers
  onBodyInput(el: HTMLElement) {
    this.body = this.extractTextFromEditable(el);
  }

  onBodyKeydown(event: KeyboardEvent, el: HTMLElement) {
    // allow newlines; no special rules for now
  }

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

  openCreateModal() {
    this.showCreateModal = true;
    // small timeout to ensure modal renders before focus
    setTimeout(() => { try { this.bodyEditorRef?.nativeElement?.focus(); } catch (_) {} }, 50);
  }

  closeCreateModal() {
    this.showCreateModal = false;
    // clear form fields when closing/cancelling
    this.title = '';
    this.text = '';
    this.body = '';
    this.imageData = null;
    try { if (this.fileInputRef?.nativeElement) this.fileInputRef.nativeElement.value = ''; } catch (_) {}
    try { if (this.bodyEditorRef?.nativeElement) this.bodyEditorRef.nativeElement.innerHTML = ''; } catch (_) {}
    try { this.cdr.detectChanges(); } catch (_) {}
  }


  // Inline confirmation handlers
  confirmRemove(id: string) {
    if (!this.isAdmin) return;
    this.pendingDeleteId = id;
  }

  cancelRemove() {
    this.pendingDeleteId = null;
  }

  removeConfirmed(id: string) {
    if (!this.isAdmin) return;
    this.newsService.removeNews(id);
    if (this.pendingDeleteId === id) this.pendingDeleteId = null;
  }
}
