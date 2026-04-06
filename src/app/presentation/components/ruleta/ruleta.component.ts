import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListasService, ListaItem } from '../../../domain/services/listas.service';
import { BookSearchService, OpenLibraryBook } from '../../../domain/services/book-search.service';

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
  // pending spin info used to reveal result when transition ends
  private _pendingSpinIdx: number | null = null;
  private _pendingFinalRotation: number | null = null;
  // Timeout id used both as fallback for missing transitionend and for the 2s delay
  private _revealTimeoutId: ReturnType<typeof setTimeout> | null = null;

  get halfRadius(): number { return Math.floor(this.radius / 2); }

  /**
   * Chord width at labelOffset distance for the current slice angle.
   * chord = 2 * r * sin(halfAngle), capped to 85% to avoid touching separator lines.
   */
  get labelWidth(): number {
    const n = this.titles.length || 1;
    if (n <= 1) return this.radius;
    const halfAngleRad = (this.anglePer / 2) * (Math.PI / 180);
    const chord = 2 * this.labelOffset * Math.sin(halfAngleRad);
    return Math.max(24, Math.floor(chord * 0.82));
  }

  /** Truncate title to 27 characters max */
  truncateTitle(t: string): string {
    if (!t) return '';
    return t.length > 27 ? t.substring(0, 27).trimEnd() + '…' : t;
  }

  /** SVG radial lines at each slice boundary */
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

  @HostListener('window:resize')
  onWindowResize(): void {
    this.recalcWheelSize();
  }

  private recalcWheelSize(): void {
    const vw = window.innerWidth;
    // Leave generous padding so labels extending outside the circle never get clipped
    const available = vw - 160;
    this.wheelSize = Math.max(200, Math.min(this.maxWheelSize, available));
    this.initialWheelSize = this.wheelSize;
    this.radius = Math.floor(this.wheelSize / 2) - 40;
    this.computeLabelOffset();
  }

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

  ngOnDestroy(): void {
    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }
  }

  private computeLabelOffset(): void {
    try {
      // Move labels closer to the rim: use a larger fraction of radius
      // 82% keeps labels near the edge while avoiding separator lines in most cases
      this.labelOffset = Math.max(40, Math.floor(this.radius * 0.82));
    } catch {
      this.labelOffset = Math.max(40, Math.floor(this.wheelSize / 2) - 40);
    }
  }

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
    // Keep wheel at a fixed, predictable size so page layout doesn't change
    // regardless of how many books are added. Radius derived from that fixed size.
    this.wheelSize = this.initialWheelSize;
    this.radius = Math.floor(this.wheelSize / 2) - 40;
    this.wheelBackground = this.buildWheelBackground(this.titles);
    this.computeLabelOffset();
  }

  get labelFontSize(): number {
    // scale with labelWidth so text fits inside the chord
    const base = Math.floor(this.labelWidth / 6);
    // increase default minimum and maximum for larger, more readable labels
    return Math.max(14, Math.min(24, base));
  }

  /** Whether the start button should be enabled */
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

  private buildWheelBackground(titles: string[]): string {
    // Force a uniform purple background for the wheel regardless of list contents.
    const purple = '#7e57c2';
    this.labelColors = [this.isLight(purple) ? '#111' : '#fff'];
    return `conic-gradient(from -90deg, ${purple} 0deg 360deg)`;
  }

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

    // clear any pending reveal timeout from previous runs
    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }

    // Keep pending info so transitionend can reveal the result
    this._pendingSpinIdx = idx;
    this._pendingFinalRotation = finalRotation;

    this.ngZone.run(() => {
      this.rotationDeg = finalRotation;
      try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
    });

    // Fallback: reveal when the spin animation finishes.
    // Give a small extra margin to ensure the CSS transition completed.
    const revealDelay = this.spinDurationMs + 200;
    this._revealTimeoutId = setTimeout(() => this.revealPendingSpin(lista), revealDelay);
  }

  private revealPendingSpin(lista: any): void {
    if (this._revealTimeoutId) { clearTimeout(this._revealTimeoutId); this._revealTimeoutId = null; }
    if (this._pendingSpinIdx == null) return;
    const idx = this._pendingSpinIdx;
    const finalRotation = this._pendingFinalRotation || 0;
    this._pendingSpinIdx = null;
    this._pendingFinalRotation = null;

    this.ngZone.run(() => {
      // Stop the spinning visual immediately and highlight the selected slice
      this.spinning = false;
      this.revealing = true;
      this.rotationDeg = ((finalRotation % 360) + 360) % 360;
      this.selectedIndex = idx;
      try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }

      // Schedule the final reveal after 2 seconds so the user sees the stopped wheel
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

  onWheelTransitionEnd(ev: TransitionEvent): void {
    // Only act on transform transitions — accept 'transform' or 'all' or missing propertyName
    if (ev && ev.propertyName && ev.propertyName !== 'transform' && ev.propertyName !== 'all') return;
    if (this._pendingSpinIdx == null) return;
    const lista = this.listasService.getById(this.selectedListId || '');
    if (!lista) return;
    this.revealPendingSpin(lista);
  }

  quitarLibro(): void {
    if (!this.selectedListId || !this.resultBook) return;
    const toRemove = this.resultBook;
    // Add to "Leyendo" list before removing from current list
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
    // Refresh wheel contents for the currently selected list so the removed book
    // no longer appears as a slice.
    try {
      this.onSelectList();
      this.cdr.detectChanges();
    } catch (e) { /* ignore detection errors */ }
  }

  getCover(b: OpenLibraryBook | null): string {
    if (!b) return '';
    return this.bookService.getCoverUrl(b);
  }
}