import { Component, OnInit } from '@angular/core';
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


  


  ngOnInit(): void {
    this.news = this.newsService.getAll();
    this.newsService.news$.subscribe(n => this.news = n || []);
    this.isAdmin = this.auth.isAdmin();
    this.auth.isAdmin$.subscribe(v => this.isAdmin = v);
  }

  constructor(private newsService: NewsService, private auth: AuthService, private router: Router) {}

  openDetail(id: string) {
    this.router.navigate(['noticias', id]);
  }


  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => { this.imageData = reader.result as string; };
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
