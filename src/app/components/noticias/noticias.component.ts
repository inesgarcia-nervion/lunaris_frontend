import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NewsService, NewsItem } from '../../services/news.service';
import { AuthService } from '../../services/auth.service';


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
  imageData: string | null = null;
  isAdmin = false;


  constructor(private newsService: NewsService, private auth: AuthService) {}


  ngOnInit(): void {
    this.news = this.newsService.getAll();
    this.newsService.news$.subscribe(n => this.news = n || []);
    this.isAdmin = this.auth.isAdmin();
    this.auth.isAdmin$.subscribe(v => this.isAdmin = v);
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
    if (!title || !text) return alert('Título y texto son obligatorios');
    this.newsService.addNews({ title, text, image: this.imageData || undefined });
    this.title = '';
    this.text = '';
    this.imageData = null;
  }


  remove(id: string) {
    if (!this.isAdmin) return;
    if (!confirm('Eliminar noticia?')) return;
    this.newsService.removeNews(id);
  }
}
