import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NewsService, NewsItem } from '../../../domain/services/news.service';

/**
 * El componente NoticiasDetailComponent es responsable de mostrar 
 * los detalles de una noticia específica en la aplicación.
 * 
 * Este componente se inicializa obteniendo el ID de la noticia 
 * desde la ruta, luego busca la noticia correspondiente en el 
 * servicio de noticias.
 */
@Component({
  selector: 'app-noticia-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './noticias-detail.component.html',
  styleUrls: ['./noticias-detail.component.css']
})
export class NoticiasDetailComponent implements OnInit {
  noticia: NewsItem | null = null;
  loading = true;

  constructor(private route: ActivatedRoute, private newsService: NewsService, private router: Router, private location: Location) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/noticias']); return; }
    this.newsService.getById(id).subscribe({
      next: n => { this.noticia = n; this.loading = false; },
      error: () => this.router.navigate(['/noticias'])
    });
  }

  back() { this.location.back(); }
}
