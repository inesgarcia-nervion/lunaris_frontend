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
    .pagination-wrapper { padding:10px 8px; display:flex; gap:14px; align-items:center; justify-content:center; width:100%; }
    .pagination { display:flex; gap:12px; align-items:center; justify-content:center; }

    .arrow { background:transparent; border:1px solid var(--border-color, rgba(0,0,0,0.15)); width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:6px; color:inherit; cursor:pointer; }
    .arrow[disabled] { opacity:0.45; cursor:not-allowed; }
    .arrow-inner { font-size:22px; line-height:1; }

    .page-num { background:transparent; border:none; color:inherit; padding:8px 10px; font-weight:700; cursor:pointer; font-size:16px; }
    .page-num:hover { text-decoration:underline; }
    .page-num[aria-current="page"], .page-num.active { background:var(--pagination-active-bg, #ffd54f); color:var(--pagination-active-fg, #222); border-radius:6px; padding:8px 12px; }

    .small-counter { color:var(--text-secondary, rgba(0,0,0,0.6)); font-size:15px; font-weight:600; }

    @media (max-width:480px) {
      .pagination-wrapper { gap:8px; padding:8px; }
      .page-num { padding:6px 8px; font-size:14px; }
      .arrow { width:38px; height:38px; }
      .arrow-inner { font-size:18px; }
      .small-counter { font-size:13px; }
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
