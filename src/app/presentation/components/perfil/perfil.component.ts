import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { AuthService } from '../../../domain/services/auth.service';
import { BookSearchService } from '../../../domain/services/book-search.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {
  username: string | null = null;
  avatar: string | null = null;
  isAdmin: boolean = false;

  // Profile fixed sections
  leyendo: any[] = [];
  leido: any[] = [];
  planParaLeer: any[] = [];
  // ids for the special lists so we can navigate to them
  leyendoId: string | null = null;
  leidoId: string | null = null;
  planParaLeerId: string | null = null;

  // Other lists created by user
  userLists: ListaItem[] = [];

  constructor(
    private listasService: ListasService,
    private authService: AuthService,
    private bookSearchService: BookSearchService,
    private router: Router
  ) {}

  onAvatarError(): void {
    try { this.authService.setLocalAvatar(null); } catch (e) { /* ignore */ }
  }

  ngOnInit(): void {
    this.username = this.authService.getCurrentUsername();
    this.isAdmin = this.authService.isAdmin();
    // subscribe to avatar changes so perfil updates immediately
    try {
      this.avatar = this.authService.getLocalAvatar();
      this.authService.avatar$.subscribe(a => this.avatar = a);
    } catch (e) {
      console.warn('Unable to read avatar', e);
    }
    // Ensure the 3 mandatory sections exist for this user
    this.listasService.ensureProfileSections(this.username);
    this.loadLists();
    // react to listas changes so profile updates live
    this.listasService.listas$.subscribe(() => this.loadLists());
  }

  loadLists() {
    const all = this.listasService.getByOwner(this.username);
    // find the special lists by name and record ids
    const lLeyendo = all.find(l => l.nombre === 'Leyendo');
    const lLeido = all.find(l => l.nombre === 'Leído');
    const lPlan = all.find(l => l.nombre === 'Plan para leer');
    this.leyendo = (lLeyendo?.libros || []).slice(0, 6);
    this.leido = (lLeido?.libros || []).slice(0, 6);
    this.planParaLeer = (lPlan?.libros || []).slice(0, 6);
    this.leyendoId = lLeyendo?.id || null;
    this.leidoId = lLeido?.id || null;
    this.planParaLeerId = lPlan?.id || null;

    // other lists are those owned by user but not the three special ones
    this.userLists = all.filter(l => !['Leyendo', 'Leído', 'Plan para leer'].includes(l.nombre));
  }

  // wrapper helpers for template
  getCoverUrl(book: any): string { return this.bookSearchService.getCoverUrl(book); }
  navigate(path: string) { this.router.navigateByUrl(path); }

  navigateToList(id: string | null) {
    if (!id) return;
    // mark navigation origin so ListaDetalle can return to profile when user hits back
    this.bookSearchService.setNavigationOrigin({ type: 'profile', listId: id });
    this.router.navigate(['/listas', id]);
  }
}
