import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ListasService, ListaItem } from '../../services/listas.service';
import { BookSearchService, OpenLibraryBook } from '../../services/book-search.service';

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
  resultBook: OpenLibraryBook | null = null;
  currentUser: string | null = null;
  titles: string[] = [];
  anglePer: number = 0;
  radius: number = 140;
  rotationDeg: number = 0;
  spinDurationMs: number = 3800;
  wheelSize: number = 520;
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

  ngOnInit(): void {
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

  private computeLabelOffset(): void {
    try {
      // 60% of radius keeps labels well inside the wheel for any slice count
      this.labelOffset = Math.max(30, Math.floor(this.radius * 0.60));
    } catch {
      this.labelOffset = Math.max(30, Math.floor(this.wheelSize / 2) - 80);
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
    const computed = Math.min(760, Math.max(360, n * 52));
    this.wheelSize = Math.max(this.initialWheelSize, computed);
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

    this.ngZone.run(() => {
      this.rotationDeg = finalRotation;
      try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
    });
    // After the spin animation finishes, wait an extra 2000ms then reveal the result.
    const revealDelay = this.spinDurationMs + 50 + 2000;
    setTimeout(() => {
      this.ngZone.run(() => {
        this.spinning = false;
        this.rotationDeg = ((finalRotation % 360) + 360) % 360;
        this.selectedIndex = idx;
        this.resultBook = lista.libros[idx];
        try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
      });
    }, revealDelay);
    // resultBook is set above; UI shows result automatically when not spinning and resultBook != null
  }

  quitarLibro(): void {
    if (!this.selectedListId || !this.resultBook) return;
    const toRemove = this.resultBook;
    this.listasService.removeBookFromList(this.selectedListId, toRemove);
    this.resultBook = null;
    this.selectedIndex = null;
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