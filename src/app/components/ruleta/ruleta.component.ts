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
  radius: number = 140; // px - distance from center for labels (computed)
  rotationDeg: number = 0;
  spinDurationMs: number = 3800;
  wheelSize: number = 520; // default larger wheel
  initialWheelSize: number = this.wheelSize;
  wheelBackground: string = '';
  // Additional soft colors used for slices 3..N (cycled)
  additionalColors: string[] = [
    '#f8e7c2', // soft cream
    '#d9e8fb', // soft blue
    '#f4d4e0', // soft pink
    '#cfe8c7', // soft mint
    '#fde6b8'  // soft peach
  ];
  // Keep a selected index so the chosen slice can be highlighted
  selectedIndex: number | null = null;
  labelOffset: number = 0;
  labelColors: string[] = [];
  // helper used by template to avoid referencing global Math
  get halfRadius(): number { return Math.floor(this.radius / 2); }

  constructor(private listasService: ListasService, public bookService: BookSearchService, private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.currentUser = this.listasService.getCurrentUser();
    // Ensure profile sections exist for the user so "Plan para leer" is present
    this.listasService.ensureProfileSections(this.currentUser);
    // initialize visible lists limited to user's own lists + their "Plan para leer"
    this.updateAvailableLists(this.listasService.getAll() || []);
    // default wheel when no list selected
    this.titles = ['Ruleta aleatoria'];
    this.anglePer = 360 / this.titles.length;
    this.wheelBackground = this.buildWheelBackground(this.titles);
    this.labelOffset = Math.max(60, Math.floor(this.wheelSize / 2) - 18);
    // capture the initial size so we can preserve it across selections
    this.initialWheelSize = this.wheelSize;
    this.listasService.listas$.subscribe(l => this.updateAvailableLists(l || []));
  }

  private updateAvailableLists(_all: ListaItem[]) {
    // Only include lists owned by the current user, but exclude the
    // profile lists 'Leyendo' and 'Leído'. Keep 'Plan para leer'.
    const ownerLists = this.listasService.getByOwner(this.currentUser) || [];
    const normalized = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    this.listas = ownerLists.filter(l => {
      try {
        const name = normalized(l.nombre || '');
        // allow plan para leer
        if (name.includes('plan para leer') || name === 'planparaleer') return true;
        // exclude leyendo / leido / leído
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
    // if user cleared selection, keep at initial wheel size
    if (!this.selectedListId) {
      this.titles = ['Ruleta aleatoria'];
      this.anglePer = 360 / this.titles.length;
      // keep initial wheel size
      this.wheelSize = this.initialWheelSize;
      this.radius = Math.floor(this.wheelSize / 2) - 40;
      this.wheelBackground = this.buildWheelBackground(this.titles);
      this.labelOffset = Math.max(60, this.radius - 18);
      return;
    }
    const lista = this.listasService.getById(this.selectedListId);
    // if selected list is empty, show full purple wheel
    if (!lista || !lista.libros || lista.libros.length === 0) {
      this.titles = ['Vacía'];
      this.anglePer = 360;
      // keep at least the initial wheel size for empty lists
      this.wheelSize = this.initialWheelSize;
      this.radius = Math.floor(this.wheelSize / 2) - 40;
      this.wheelBackground = this.buildWheelBackground(this.titles);
      this.labelOffset = Math.max(60, this.radius - 18);
      return;
    }
    this.titles = lista.libros.map(b => b.title || '—');
    const n = this.titles.length || 1;
    this.anglePer = 360 / n;
    // compute wheel size and radius - allow a larger maximum so titles fit,
    // but never shrink below the initial wheel size
    const computed = Math.min(760, Math.max(360, n * 52));
    this.wheelSize = Math.max(this.initialWheelSize, computed);
    this.radius = Math.floor(this.wheelSize / 2) - 40;
    this.wheelBackground = this.buildWheelBackground(this.titles);
    this.labelOffset = Math.max(60, this.radius - 18);
  }

  // dynamic font size for labels so long titles remain readable and fit
  get labelFontSize(): number {
    // base font grows with wheel size but clamp to [11,18]
    const v = Math.floor(this.wheelSize / 40);
    return Math.max(11, Math.min(18, v));
  }

  private buildWheelBackground(titles: string[]): string {
    const n = titles.length || 1;
    const angle = 360 / n;
    // If no selection or single slice, render the whole wheel in purple
    const purple = '#7e57c2';
    const white = '#ffffff';
    if (!this.selectedListId || n <= 1) {
      this.labelColors = [this.isLight(purple) ? '#111' : '#fff'];
      return `conic-gradient(from -90deg, ${purple} 0deg 360deg)`;
    }

    // Desired pattern:
    // - index 0 -> white
    // - index 1 -> purple
    // - index >=2 -> cycle through additionalColors
    const stops: string[] = [];
    let acc = 0;
    this.labelColors = [];
    for (let i = 0; i < n; i++) {
      let color: string;
      if (i === 0) color = white;
      else if (i === 1) color = purple;
      else color = this.additionalColors[(i - 2) % this.additionalColors.length];

      const start = acc;
      const end = acc + angle;
      stops.push(`${color} ${start}deg ${end}deg`);
      acc += angle;
      this.labelColors.push(this.isLight(color) ? '#111' : '#fff');
    }
    return `conic-gradient(from -90deg, ${stops.join(', ')})`;
  }

  private isLight(hex: string): boolean {
    // remove # and convert
    try {
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0,2),16);
      const g = parseInt(h.substring(2,4),16);
      const b = parseInt(h.substring(4,6),16);
      // relative luminance formula
      const yiq = (r*299 + g*587 + b*114) / 1000;
      return yiq > 160;
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
    // Pick random index and assign result immediately. Do not animate rotation.
    const idx = Math.floor(Math.random() * lista.libros.length);
    this.selectedIndex = idx;
    this.resultBook = lista.libros[idx];
    this.spinning = false;
    this.rotationDeg = 0;
    try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
  }

  quitarLibro(): void {
    if (!this.selectedListId || !this.resultBook) return;
    this.listasService.removeBookFromList(this.selectedListId, this.resultBook);
    this.resultBook = null;
  }

  getCover(b: OpenLibraryBook | null): string {
    if (!b) return '';
    return this.bookService.getCoverUrl(b);
  }
}
