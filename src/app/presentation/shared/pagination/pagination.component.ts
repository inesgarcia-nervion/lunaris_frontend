import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagination-wrapper" *ngIf="totalPages >= 1">
      <nav class="pagination" aria-label="Paginación">
        <button class="arrow" (click)="selectPage(currentPage - 1)" [disabled]="currentPage === 1" aria-label="Anterior">
          <span class="arrow-inner">‹</span>
        </button>

        <button *ngFor="let p of pagesToShow" class="page-num" [class.active]="p === currentPage" (click)="onClick(p)" [attr.aria-current]="p === currentPage ? 'page' : null">
          <ng-container *ngIf="p > 0">{{ p }}</ng-container>
          <ng-container *ngIf="p <= 0">…</ng-container>
        </button>

        <button class="arrow" (click)="selectPage(currentPage + 1)" [disabled]="currentPage === totalPages" aria-label="Siguiente">
          <span class="arrow-inner">›</span>
        </button>
      </nav>
      <div class="small-counter">{{ currentPage | number:'2.0-0' }} de {{ totalPages | number:'2.0-0' }}</div>
    </div>
  `,
  styles: [
    `
    :host { display:block; width:100%; }
    /* Neutral styles so the component inherits app theme; override with parent CSS when needed */
    .pagination-wrapper { padding:8px 6px; display:flex; gap:12px; align-items:center; justify-content:center; width:100%; }
    .pagination { display:flex; gap:8px; align-items:center; justify-content:center; }

    .arrow { background:transparent; border:1px solid rgba(0,0,0,0.08); width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:4px; color:inherit; cursor:pointer; }
    .arrow[disabled] { opacity:0.4; cursor:not-allowed; }
    .arrow-inner { font-size:18px; line-height:1; }

    .page-num { background:transparent; border:none; color:inherit; padding:6px 8px; font-weight:600; cursor:pointer; }
    .page-num:hover { text-decoration:underline; }
    .page-num[aria-current="page"], .page-num.active { background:var(--pagination-active-bg, #ffd54f); color:var(--pagination-active-fg, #222); border-radius:4px; padding:6px 10px; }

    .small-counter { color:rgba(0,0,0,0.6); font-size:12px; }

    @media (max-width:480px) {
      .pagination-wrapper { gap:6px; padding:6px; }
      .page-num { padding:4px 6px; }
      .arrow { width:30px; height:30px; }
    }
    `
  ]
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 1;
  @Input() maxPages = 7; // maximum numbered buttons to show including first/last
  @Input() leadingPages = 3; // window size: number of consecutive pages to show
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pagesToShow(): number[] {
    const total = this.totalPages;
    const windowSize = Math.max(1, Math.floor(this.leadingPages));
    const pages: number[] = [];

    if (total <= 1) return [1];

    const { start, end } = this.getWindowRange();

    // If window doesn't start at 1, show first page and left ellipsis when needed
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push(-1); // left ellipsis (clickable -> jump backwards)
      }
    }

    // Add window pages (consecutive)
    for (let i = start; i <= end; i++) pages.push(i);

    // If there are more pages after the window, show right ellipsis and last page
    if (end < total) {
      if (end < total - 1) pages.push(-2); // right ellipsis (clickable -> jump forwards)
      pages.push(total);
    }

    return pages;
  }

  private getWindowRange(): { start: number; end: number } {
    const total = this.totalPages;
    const windowSize = Math.max(1, Math.floor(this.leadingPages));

    // Start tries to follow currentPage, but keep window inside bounds
    const maxStart = Math.max(1, total - windowSize + 1);
    const start = Math.min(Math.max(1, this.currentPage), maxStart);
    const end = Math.min(total, start + windowSize - 1);
    return { start, end };
  }

  onClick(p: number) {
    if (p === -2) {
      // right ellipsis: jump to the page after the current window
      const { end } = this.getWindowRange();
      this.selectPage(Math.min(this.totalPages, end + 1));
      return;
    }

    if (p === -1) {
      // left ellipsis: jump backwards by one window (or to 1)
      const { start } = this.getWindowRange();
      // jump to the page immediately before the current window
      this.selectPage(Math.max(1, start - 1));
      return;
    }

    this.selectPage(p);
  }

  selectPage(p: number) {
    const page = Math.min(this.totalPages, Math.max(1, p));
    if (page === this.currentPage) return;
    this.currentPage = page;
    this.pageChange.emit(page);
  }
}
