import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NewsService, NewsItem } from '../../../domain/services/news.service';

@Component({
  selector: 'app-noticia-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticias-detail.component.html',
  styleUrls: ['./noticias-detail.component.css']
})
export class NoticiasDetailComponent implements OnInit {
  noticia: NewsItem | null = null;

  constructor(private route: ActivatedRoute, private newsService: NewsService, private router: Router, private location: Location) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/noticias']); return; }
    const all = this.newsService.getAll();
    this.noticia = all.find(n => n.id === id) || null;
    if (!this.noticia) this.router.navigate(['/noticias']);
  }

  back() { this.location.back(); }
}
