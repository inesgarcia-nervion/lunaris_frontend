import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { Router } from '@angular/router';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { AuthService } from '../../../domain/services/auth.service';
import { BookSearchService } from '../../../domain/services/book-search.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
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

  // Pagination for reading sections in profile preview: show 4 items per section
  pageSize = 4;
  leyendoPage = 1;
  leidoPage = 1;
  planParaLeerPage = 1;
  pagedLeyendo: any[] = [];
  pagedLeido: any[] = [];
  pagedPlanParaLeer: any[] = [];

  // Other lists created by user
  userLists: ListaItem[] = [];
  pagedUserLists: ListaItem[] = [];
  userListsPage = 1;
  readonly userListsPageSize = 4;
  // Lists favorited by current user (owned by other users)
  favoriteLists: ListaItem[] = [];

  constructor(
    private listasService: ListasService,
    private authService: AuthService,
    private bookSearchService: BookSearchService,
    private router: Router
  ) {}

  toggleFavorite(listId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.listasService.toggleFavorite(listId);
  }

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
    this.listasService.favorites$.subscribe(() => this.loadLists());
  }

  loadLists() {
    const all = this.listasService.getByOwner(this.username);
    // find the special lists by name and record ids
    const lLeyendo = all.find(l => l.nombre === 'Leyendo');
    const lLeido = all.find(l => l.nombre === 'Leído');
    const lPlan = all.find(l => l.nombre === 'Plan para leer');
    this.leyendo = (lLeyendo?.libros || []);
    this.leido = (lLeido?.libros || []);
    this.planParaLeer = (lPlan?.libros || []);
    this.leyendoPage = 1;
    this.leidoPage = 1;
    this.planParaLeerPage = 1;
    this.updatePaginationLeyendo();
    this.updatePaginationLeido();
    this.updatePaginationPlan();
    this.leyendoId = lLeyendo?.id || null;
    this.leidoId = lLeido?.id || null;
    this.planParaLeerId = lPlan?.id || null;

    // other lists are those owned by user but not the three special ones
    this.userLists = all.filter(l => !['Leyendo', 'Leído', 'Plan para leer'].includes(l.nombre));
    this.userListsPage = 1;
    this.updatePagedUserLists();

    // favorites: lists the current user favorited but which are owned by others
    this.favoriteLists = this.listasService.getFavoriteListsForUser(this.username).filter(l => l.owner && l.owner !== this.username);
  }

  // wrapper helpers for template
  getCoverUrl(book: any): string { return this.bookSearchService.getCoverUrl(book); }
  navigate(path: string) { this.router.navigateByUrl(path); }

  updatePaginationLeyendo(): void {
    const start = (this.leyendoPage - 1) * this.pageSize;
    this.pagedLeyendo = this.leyendo.slice(start, start + this.pageSize);
  }
  updatePaginationLeido(): void {
    const start = (this.leidoPage - 1) * this.pageSize;
    this.pagedLeido = this.leido.slice(start, start + this.pageSize);
  }
  updatePaginationPlan(): void {
    const start = (this.planParaLeerPage - 1) * this.pageSize;
    this.pagedPlanParaLeer = this.planParaLeer.slice(start, start + this.pageSize);
  }
  onLeyendoPageChange(page: number): void { this.leyendoPage = page; this.updatePaginationLeyendo(); }
  onLeidoPageChange(page: number): void { this.leidoPage = page; this.updatePaginationLeido(); }
  onPlanParaLeerPageChange(page: number): void { this.planParaLeerPage = page; this.updatePaginationPlan(); }

  updatePagedUserLists(): void {
    const start = (this.userListsPage - 1) * this.userListsPageSize;
    this.pagedUserLists = this.userLists.slice(start, start + this.userListsPageSize);
  }
  onUserListsPageChange(page: number): void { this.userListsPage = page; this.updatePagedUserLists(); }

  navigateToList(id: string | null) {
    if (!id) return;
    // mark navigation origin so ListaDetalle can return to profile when user hits back
    this.bookSearchService.setNavigationOrigin({ type: 'profile', listId: id });
    this.router.navigate(['/listas', id]);
  }
}
