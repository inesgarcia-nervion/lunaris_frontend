import { Component, OnInit, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { BookSearchService, OpenLibraryBook } from '../../../domain/services/book-search.service';

/**
 * Componente de la ruleta aleatoria para seleccionar un libro de una lista del usuario.
 * 
 * Permite al usuario elegir una de sus listas de libros, girar una ruleta que muestra 
 * los títulos de los libros en esa lista, y seleccionar aleatoriamente uno de ellos. 
 */
@Component({
  selector: 'app-ruleta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ruleta.component.html',
  styleUrls: ['./ruleta.component.css']
})
export class RuletaComponent implements OnInit {
  listas: ListaItem[] = [];
  selectedListId: string | null = null;
  loading: boolean = false;
  spinning: boolean = false;
  revealing: boolean = false;
  resultBook: OpenLibraryBook | null = null;
  currentUser: string | null = null;
  titles: string[] = [];
  anglePer: number = 0;
  radius: number = 140;
  rotationDeg: number = 0;
  spinDurationMs: number = 3800;
  wheelSize: number = 520;
  private readonly maxWheelSize: number = 520;
  initialWheelSize: number = this.wheelSize;
  wheelBackground: string = '';
  additionalColors: string[] = [
    '#f8e7c2',
    '#d9e8fb',
    '#f4d4e0',
    '#cfe8c7',
    '#fde6b8'
  ];
  selectedIndex: number | null = null;
  labelOffset: number = 0;
  labelColors: string[] = [];
  private _pendingSpinIdx: number | null = null;
  private _pendingFinalRotation: number | null = null;
  private _revealTimeoutId: ReturnType<typeof setTimeout> | null = null;

  get halfRadius(): number { return Math.floor(this.radius / 2); }

  get labelWidth(): number {
    const n = this.titles.length || 1;
    if (n <= 1) return this.radius;
    const halfAngleRad = (this.anglePer / 2) * (Math.PI / 180);
    const chord = 2 * this.labelOffset * Math.sin(halfAngleRad);
    return Math.max(24, Math.floor(chord * 0.82));
  }

  /**
   * Trunca un título si es demasiado largo para que quepa en la etiqueta de la ruleta.
   * Agrega puntos suspensivos al final si se trunca.
   * @param t El título a truncar.
   * @returns El título truncado si es necesario, o el título original si no es demasiado largo.
   */
  truncateTitle(t: string): string {
    if (!t) return '';
    return t.length > 27 ? t.substring(0, 27).trimEnd() + '…' : t;
  }

  get sliceLines(): { x2: number; y2: number }[] {
    const n = this.titles.length;
    if (n <= 1) return [];
    const cx = this.wheelSize / 2;
    const lines = [];
    for (let i = 0; i < n; i++) {
      const angleRad = (i * this.anglePer - 90) * (Math.PI / 180);
      lines.push({
        x2: Math.round(cx + cx * Math.cos(angleRad)),
        y2: Math.round(cx + cx * Math.sin(angleRad))
      });
    }
    return lines;
  }

  /**
   * Calcula la transformación CSS para rotar las etiquetas de los títulos en la ruleta,
   * de modo que sean legibles y estén orientadas correctamente según su posición en la rueda.
   * Las etiquetas en la mitad inferior de la ruleta se rotan 180 grados para evitar que aparezcan al revés.
   * @param i El índice de la etiqueta en la lista de títulos.
   * @returns Una cadena con la transformación CSS para rotar la etiqueta según su posición en la ruleta.
   */
  labelTransform(i: number): string {
    const center = (i * this.anglePer + this.anglePer / 2) % 360;
    const rot = (center > 90 && center < 270) ? -90 : 90;
    return `rotate(${rot}deg)`;
  }

  constructor(
    private listasService: ListasService,
    public bookService: BookSearchService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  /**
   * Escucha el evento de redimensionamiento de la ventana para recalcular el tamaño de la ruleta y sus elementos,
   * asegurando que se mantenga una apariencia adecuada en diferentes tamaños de pantalla.
   * @returns void
   */
  @HostListener('window:resize')
  onWindowResize(): void {
    this.recalcWheelSize();
  }

  /**
   * Recalcula el tamaño de la ruleta y sus elementos basándose en el ancho de la ventana, con límites mínimos y máximos.
   * Ajusta el radio de la ruleta y la posición de las etiquetas para mantener una apariencia equilibrada.
   * Se llama al inicializar el componente y cada vez que se redimensiona la ventana.
   * @returns void
   */
  private recalcWheelSize(): void {
    const vw = window.innerWidth;
    const available = vw - 160;
    this.wheelSize = Math.max(200, Math.min(this.maxWheelSize, available));
    this.initialWheelSize = this.wheelSize;
    this.radius = Math.floor(this.wheelSize / 2) - 40;
    this.computeLabelOffset();
  }

  /**
   * Inicializa el componente, cargando las listas del usuario, configurando la ruleta y sus títulos,
   * y suscribiéndose a cambios en las listas para actualizar la ruleta dinámicamente.
   * También calcula el tamaño inicial de la ruleta y su apariencia.
   * @returns void
   */
  ngOnInit(): void {
    this.recalcWheelSize();
    this.currentUser = this.listasService.getCurrentUser();
    this.listasService.ensureProfileSections(this.currentUser);
    this.updateAvailableLists(this.listasService.getAll() || []);
    this.titles = ['Ruleta aleatoria'];
    this.anglePer = 360 / this.titles.length;
    this.wheelBackground = this.buildWheelBackground(this.titles);
    this.computeLabelOffset();
    this.initialWheelSize = this.wheelSize;
    this.listasService.listas$.subscribe(l => this.updateAvailableLists(l || []));
  }

  /**
   * Limpia cualquier temporizador pendiente al destruir el componente para evitar que se intente 
   * actualizar el estado de un componente que ya no existe.
   * @returns void
   */
  ngOnDestroy(): void {
    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }
  }

  /**
   * Calcula el desplazamiento de las etiquetas de los títulos en la ruleta basándose en el radio actual,
   * para asegurarse de que las etiquetas estén posicionadas correctamente dentro de la rueda.
   * Se llama cada vez que se recalcula el tamaño de la ruleta o se actualizan los títulos.
   * @returns void
   */
  private computeLabelOffset(): void {
    try {
      this.labelOffset = Math.max(40, Math.floor(this.radius * 0.82));
    } catch {
      this.labelOffset = Math.max(40, Math.floor(this.wheelSize / 2) - 40);
    }
  }

  /**
   * Actualiza la lista de listas disponibles para el usuario, filtrando las listas del propietario 
   * actual y excluyendo aquellas que tengan nombres relacionados con "leyendo" o "leído".
   * @param _all La lista completa de listas obtenida del servicio, que se filtra para mostrar solo las 
   * relevantes para la ruleta.
   */
  private updateAvailableLists(_all: ListaItem[]) {
    const ownerLists = this.listasService.getByOwner(this.currentUser) || [];
    const normalized = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    this.listas = ownerLists.filter(l => {
      try {
        const name = normalized(l.nombre || '');
        if (name.includes('plan para leer') || name === 'planparaleer') return true;
        if (name === 'leyendo' || name === 'leido' || name === 'leído') return false;
        return true;
      } catch {
        return true;
      }
    });
  }

  /**
   * Maneja el evento de selección de una lista por parte del usuario, actualizando la ruleta para 
   * mostrar los títulos de los libros en la lista seleccionada.
   * Si no se selecciona ninguna lista, muestra una ruleta vacía con un solo segmento. 
   * @returns void
   */
  onSelectList(): void {
    this.resultBook = null;
    this.selectedIndex = null;
    this.spinning = false;
    this.rotationDeg = 0;
    this.titles = [];

    if (!this.selectedListId) {
      this.titles = ['Ruleta aleatoria'];
      this.anglePer = 360 / this.titles.length;
      this.wheelSize = this.initialWheelSize;
      this.radius = Math.floor(this.wheelSize / 2) - 40;
      this.wheelBackground = this.buildWheelBackground(this.titles);
      this.computeLabelOffset();
      return;
    }

    const lista = this.listasService.getById(this.selectedListId);

    if (!lista || !lista.libros || lista.libros.length === 0) {
      this.titles = ['Vacía'];
      this.anglePer = 360;
      this.wheelSize = this.initialWheelSize;
      this.radius = Math.floor(this.wheelSize / 2) - 40;
      this.wheelBackground = this.buildWheelBackground(this.titles);
      this.computeLabelOffset();
      return;
    }

    this.titles = lista.libros.map(b => (b.title || '').toString().trim() || '—');
    const n = this.titles.length || 1;
    this.anglePer = 360 / n;
    this.wheelSize = this.initialWheelSize;
    this.radius = Math.floor(this.wheelSize / 2) - 40;
    this.wheelBackground = this.buildWheelBackground(this.titles);
    this.computeLabelOffset();
  }

  /**
   * Calcula el tamaño de fuente de las etiquetas de los títulos en la ruleta basándose en el ancho 
   * disponible, asegurándose de que el texto sea legible y se ajuste correctamente dentro de cada 
   * segmento.
   * @returns number El tamaño de fuente calculado para las etiquetas.
   */
  get labelFontSize(): number {
    const base = Math.floor(this.labelWidth / 6);
    return Math.max(14, Math.min(24, base));
  }

  /**
   * Determina si la ruleta puede iniciarse, verificando si hay una lista seleccionada y si no está 
   * en proceso de giro o revelación.
   * @returns boolean Verdadero si la ruleta puede iniciarse, falso en caso contrario.
   */
  get canStart(): boolean {
    if (this.spinning || this.revealing) return false;
    if (!this.selectedListId) return false;
    try {
      const lista = this.listasService.getById(this.selectedListId);
      return !!lista && !!lista.libros && lista.libros.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Construye el fondo de la ruleta utilizando un gradiente cónico basado en un color base y colores 
   * adicionales, y determina los colores de las etiquetas según la luminosidad del color base para 
   * asegurar un buen contraste.
   * @param titles La lista de títulos que se mostrarán en la ruleta, utilizada para determinar el 
   * número de segmentos y colores.
   * @returns string Una cadena con la definición del fondo de la ruleta en formato CSS.
   */
  private buildWheelBackground(titles: string[]): string {
    const purple = '#7e57c2';
    this.labelColors = [this.isLight(purple) ? '#111' : '#fff'];
    return `conic-gradient(from -90deg, ${purple} 0deg 360deg)`;
  }

  /**
   * Determina si un color dado en formato hexadecimal es claro o oscuro utilizando la fórmula de luminosidad
   * para calcular el contraste y decidir si las etiquetas deben ser de color claro u oscuro para asegurar 
   * una buena legibilidad.
   * @param hex El color en formato hexadecimal (por ejemplo, "#7e57c2") que se evaluará.
   * @returns boolean Verdadero si el color es claro, falso si es oscuro o si ocurre un error al analizar el color.
   */
  private isLight(hex: string): boolean {
    try {
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 160;
    } catch {
      return true;
    }
  }

  /**
   * Inicia el proceso de giro de la ruleta, seleccionando aleatoriamente un libro de la lista seleccionada,
   * calculando la rotación necesaria para mostrar el libro seleccionado en la parte superior, y programando 
   * la revelación del resultado después de que termine el giro.
   * Verifica que se haya seleccionado una lista válida y que no haya un giro en curso antes de iniciar el proceso.
   * @returns void
   */
  comenzarRuleta(): void {
    if (!this.selectedListId) {
      alert('Seleccione primero una lista.');
      return;
    }
    const lista = this.listasService.getById(this.selectedListId);
    if (!lista) return;
    if (!lista.libros || lista.libros.length === 0) {
      alert('La lista seleccionada no contiene libros.');
      return;
    }
    if (this.spinning) return;

    const n = lista.libros.length;
    const idx = Math.floor(Math.random() * n);
    const spins = Math.floor(Math.random() * 3) + 4;
    const offset = -(idx * this.anglePer + this.anglePer / 2);
    const finalRotation = spins * 360 + offset;

    this.spinning = true;
    this.selectedIndex = null;
    this.resultBook = null;

    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }

    this._pendingSpinIdx = idx;
    this._pendingFinalRotation = finalRotation;

    this.ngZone.run(() => {
      this.rotationDeg = finalRotation;
      try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
    });

    const revealDelay = this.spinDurationMs + 200;
    this._revealTimeoutId = setTimeout(() => this.revealPendingSpin(lista), revealDelay);
  }

  /**
   * Revela el resultado del giro de la ruleta mostrando el libro seleccionado, actualizando el estado para 
   * mostrar la información del libro y permitiendo al usuario interactuar con el resultado (como añadirlo 
   * a la lista de lectura).
   * @param lista La lista de libros de la cual se seleccionará el libro ganador.
   * @returns void
   */
  private revealPendingSpin(lista: any): void {
    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }
    if (this._pendingSpinIdx == null) return;
    const idx = this._pendingSpinIdx;
    const finalRotation = this._pendingFinalRotation || 0;
    this._pendingSpinIdx = null;
    this._pendingFinalRotation = null;

    this.ngZone.run(() => {
      this.spinning = false;
      this.revealing = true;
      this.rotationDeg = ((finalRotation % 360) + 360) % 360;
      this.selectedIndex = idx;
      try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }

      this._revealTimeoutId = setTimeout(() => {
        this.ngZone.run(() => {
          try { this.resultBook = lista.libros[idx]; } catch { this.resultBook = null; }
          this.revealing = false;
          try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
          this._revealTimeoutId = null;
        });
      }, 2000);
    });
  }

  /**
   * Maneja el evento de finalización de la transición de giro de la ruleta, verificando si hay un giro pendiente
   * que deba revelarse y llamando a la función de revelación si es necesario. 
   * @param ev El evento de transición que se dispara al finalizar la animación de giro, utilizado para sincronizar 
   * la revelación del resultado con el final del giro.
   * @returns void
   */
  onWheelTransitionEnd(ev: TransitionEvent): void {
    if (ev && ev.propertyName && ev.propertyName !== 'transform' && ev.propertyName !== 'all') return;
    if (this._pendingSpinIdx == null) return;
    const lista = this.listasService.getById(this.selectedListId || '');
    if (!lista) return;
    this.revealPendingSpin(lista);
  }

  /**
   * Maneja la acción de quitar el libro seleccionado de la lista original y añadirlo a la lista de "Leyendo" del usuario.
   * @returns void
   */
  quitarLibro(): void {
    if (!this.selectedListId || !this.resultBook) return;
    const toRemove = this.resultBook;
    const currentUser = this.listasService.getCurrentUser();
    this.listasService.ensureProfileSections(currentUser);
    const leyendoLista = this.listasService.getAll().find(
      l => l.owner === currentUser && l.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') === 'leyendo'
    );
    if (leyendoLista) {
      this.listasService.addBookToList(leyendoLista.id, toRemove);
    }
    this.listasService.removeBookFromList(this.selectedListId, toRemove);
    this.resultBook = null;
    this.selectedIndex = null;
    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }
    try {
      this.onSelectList();
      this.cdr.detectChanges();
    } catch (e) { /* ignore*/ }
  }

  /**
   * Obtiene la URL de la portada de un libro dado utilizando el servicio de búsqueda de libros, que construye la URL
   * @param b El libro del cual se desea obtener la portada, que puede ser nulo si no se ha seleccionado ningún libro.
   * @returns string La URL de la portada del libro, o una cadena vacía si el libro es nulo o no tiene una portada disponible.
   */
  getCover(b: OpenLibraryBook | null): string {
    if (!b) return '';
    return this.bookService.getCoverUrl(b);
  }
}