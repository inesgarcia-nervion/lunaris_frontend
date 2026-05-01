import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { Router } from '@angular/router';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { AuthService } from '../../../domain/services/auth.service';
import { BookSearchService } from '../../../domain/services/book-search.service';

/**
 * Muestra el perfil del usuario actual, incluyendo su avatar, nombre de usuario, 
 * y sus listas de libros organizadas en secciones fijas (Leyendo, Leído, Plan para leer) 
 * y otras listas personalizadas. 
 * 
 * Permite navegar a detalles de libros y listas, y gestionar
 * favoritos. Se actualiza en tiempo real ante cambios en las listas o el avatar.
 */
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

  leyendo: any[] = [];
  leido: any[] = [];
  planParaLeer: any[] = [];
  leyendoId: string | null = null;
  leidoId: string | null = null;
  planParaLeerId: string | null = null;

  pageSize = 4;
  leyendoPage = 1;
  leidoPage = 1;
  planParaLeerPage = 1;
  pagedLeyendo: any[] = [];
  pagedLeido: any[] = [];
  pagedPlanParaLeer: any[] = [];

  userLists: ListaItem[] = [];
  pagedUserLists: ListaItem[] = [];
  userListsPage = 1;
  readonly userListsPageSize = 4;
  favoriteLists: ListaItem[] = [];

  constructor(
    private listasService: ListasService,
    private authService: AuthService,
    private bookSearchService: BookSearchService,
    private router: Router
  ) {}

  /**
   * Alterna el estado de favorito de una lista. Si la lista ya está en 
   * favoritos, se elimina; si no, se agrega.
   * @param listId El ID de la lista a alternar en favoritos.
   * @param event El evento de clic, utilizado para detener la propagación 
   * y evitar que se active la navegación al hacer clic en el botón de favorito.
   */
  toggleFavorite(listId: string, event?: Event) {
    if (event) event.stopPropagation();
    this.listasService.toggleFavorite(listId);
  }

  /**
   * Maneja el error de carga del avatar, estableciendo el avatar local a null 
   * para mostrar un avatar por defecto.
   */
  onAvatarError(): void {
    try { this.authService.setLocalAvatar(null); } catch (e) { /* ignore */ }
  }

  /**
   * Inicializa el componente cargando el nombre de usuario, verificando si es admin,
   * y suscribiéndose a cambios en el avatar y las listas. También asegura que las 
   * secciones de perfil estén creadas para el usuario actual.
   */
  ngOnInit(): void {
    this.username = this.authService.getCurrentUsername();
    this.isAdmin = this.authService.isAdmin();
    try {
      this.avatar = this.authService.getLocalAvatar();
      this.authService.avatar$.subscribe(a => this.avatar = a);
    } catch (e) {
      console.warn('Unable to read avatar', e);
    }
    // refresh listas from server when entering profile
    try { this.listasService.refreshFromServer(); } catch (e) {}
    this.listasService.ensureProfileSections(this.username);
    this.loadLists();
    this.listasService.listas$.subscribe(() => this.loadLists());
    this.listasService.favorites$.subscribe(() => this.loadLists());
  }

  /**
   * Carga las listas del usuario, identificando las secciones fijas (Leyendo, Leído, Plan para leer)
   * y separándolas de las listas personalizadas. También carga las listas que el usuario ha marcado 
   * como favoritas pero que son propiedad de otros usuarios.
   */
  loadLists() {
    const all = this.listasService.getByOwner(this.username);
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

    this.userLists = all.filter(l => !['Leyendo', 'Leído', 'Plan para leer'].includes(l.nombre));
    this.userListsPage = 1;
    this.updatePagedUserLists();

    this.favoriteLists = this.listasService.getFavoriteListsForUser(this.username).filter(l => l.owner && l.owner !== this.username);
  }

  /**
   * Obtiene la URL de la portada de un libro utilizando el servicio de búsqueda de libros.
   * @param book El libro para el cual se desea obtener la URL de la portada.
   * @returns La URL de la portada del libro.
   */
  getCoverUrl(book: any): string { 
    return this.bookSearchService.getCoverUrl(book); 
  }

  /**
   * Navega a una ruta específica dentro de la aplicación utilizando el router de Angular.
   * @param path La ruta a la que se desea navegar.
   */
  navigate(path: string) { 
    this.router.navigateByUrl(path); 
  }

  /**
   * Actualiza las secciones de lectura paginadas (Leyendo, Leído, Plan para leer) según 
   * la página actual.
   * Calcula el índice de inicio para cada sección y actualiza los arrays paginados que 
   * se muestran en la interfaz.
   */
  updatePaginationLeyendo(): void {
    const start = (this.leyendoPage - 1) * this.pageSize;
    this.pagedLeyendo = this.leyendo.slice(start, start + this.pageSize);
  }

  /**
   * Actualiza la sección de libros "Leído" según la página actual. Calcula el índice de inicio
   * para la sección "Leído" y actualiza el array paginado que se muestra en la interfaz.
   */
  updatePaginationLeido(): void {
    const start = (this.leidoPage - 1) * this.pageSize;
    this.pagedLeido = this.leido.slice(start, start + this.pageSize);
  }

  /**
   * Actualiza la sección de libros "Plan para leer" según la página actual. Calcula el índice de inicio
   * para la sección "Plan para leer" y actualiza el array paginado que se muestra en la interfaz.
   */
  updatePaginationPlan(): void {
    const start = (this.planParaLeerPage - 1) * this.pageSize;
    this.pagedPlanParaLeer = this.planParaLeer.slice(start, start + this.pageSize);
  }

  /**
   * Maneja el cambio de página para la sección "Leyendo". Actualiza la página actual y llama a la función
   * de actualización de paginación para reflejar los cambios en la interfaz.
   * @param page El número de página seleccionado por el usuario.
   */
  onLeyendoPageChange(page: number): void { 
    this.leyendoPage = page; this.updatePaginationLeyendo(); 
  }

  /**
   * Maneja el cambio de página para la sección "Leído". Actualiza la página actual y llama a la función
   * de actualización de paginación para reflejar los cambios en la interfaz.
   * @param page El número de página seleccionado por el usuario.
   */
  onLeidoPageChange(page: number): void { 
    this.leidoPage = page; this.updatePaginationLeido(); 
  }

  /**
   * Maneja el cambio de página para la sección "Plan para leer". Actualiza la página actual y llama a 
   * la función
   * de actualización de paginación para reflejar los cambios en la interfaz.
   * @param page El número de página seleccionado por el usuario.
   */
  onPlanParaLeerPageChange(page: number): void { 
    this.planParaLeerPage = page; this.updatePaginationPlan(); 
  }

  /**
   * Actualiza la sección de listas personalizadas del usuario según la página actual. Calcula el índice de inicio
   * para las listas personalizadas y actualiza el array paginado que se muestra en la interfaz.
   * Esto permite mostrar un número limitado de listas por página y navegar entre ellas.
   */
  updatePagedUserLists(): void {
    const start = (this.userListsPage - 1) * this.userListsPageSize;
    this.pagedUserLists = this.userLists.slice(start, start + this.userListsPageSize);
  }

  /**
   * Maneja el cambio de página para las listas personalizadas del usuario. Actualiza la página actual y llama a la función
   * de actualización de paginación para reflejar los cambios en la interfaz.
   * @param page El número de página seleccionado por el usuario.
   */
  onUserListsPageChange(page: number): void { 
    this.userListsPage = page; this.updatePagedUserLists(); 
  }

  /**
   * Navega a la vista de detalles de una lista específica. Antes de navegar, establece el origen de navegación en el 
   * servicio de búsqueda de libros
   * @param id El ID de la lista a la que se desea navegar. Si el ID es null, no se realiza ninguna acción.
   * @returns void
   */
  navigateToList(id: string | null) {
    if (!id) return;
    this.bookSearchService.setNavigationOrigin({ type: 'profile', listId: id });
    this.router.navigate(['/listas', id]);
  }
}
