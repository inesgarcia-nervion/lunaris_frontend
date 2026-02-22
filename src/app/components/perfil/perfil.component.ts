import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ListasService, ListaItem } from '../../services/listas.service';
import { AuthService } from '../../services/auth.service';
import { BookSearchService } from '../../services/book-search.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  username: string | null = null;

  // Profile fixed sections
  leyendo: any[] = [];
  leido: any[] = [];
  planParaLeer: any[] = [];

  // Other lists created by user
  userLists: ListaItem[] = [];

  constructor(
    private listasService: ListasService,
    private authService: AuthService,
    private bookSearchService: BookSearchService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getCurrentUsername();
    // Ensure the 3 mandatory sections exist for this user
    this.listasService.ensureProfileSections(this.username);
    this.loadLists();
    // react to listas changes so profile updates live
    this.listasService.listas$.subscribe(() => this.loadLists());
  }

  loadLists() {
    const all = this.listasService.getByOwner(this.username);
    // find the special lists by name
    this.leyendo = (all.find(l => l.nombre === 'Leyendo')?.libros || []).slice(0, 6);
    this.leido = (all.find(l => l.nombre === 'Leído')?.libros || []).slice(0, 6);
    this.planParaLeer = (all.find(l => l.nombre === 'Plan para leer')?.libros || []).slice(0, 6);

    // other lists are those owned by user but not the three special ones
    this.userLists = all.filter(l => !['Leyendo', 'Leído', 'Plan para leer'].includes(l.nombre));
  }

  // wrapper helpers for template
  getCoverUrl(book: any): string { return this.bookSearchService.getCoverUrl(book); }
  navigate(path: string) { this.router.navigateByUrl(path); }

  navigateToList(id: string) {
    if (!id) return;
    // mark navigation origin so ListaDetalle can return to profile when user hits back
    this.bookSearchService.setNavigationOrigin({ type: 'profile', listId: id });
    this.router.navigate(['/listas', id]);
  }
}
