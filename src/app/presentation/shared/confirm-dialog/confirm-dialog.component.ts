import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  show = false;
  message = '';
  private resolveFn: ((v: boolean) => void) | null = null;

  constructor(private confirm: ConfirmService) {
    this.confirm.requests$.subscribe((r) => {
      this.message = r.message || '¿Estás seguro?';
      this.resolveFn = r.resolve;
      this.show = true;
    });
  }

  confirmYes() {
    if (this.resolveFn) this.resolveFn(true);
    this.close();
  }

  confirmNo() {
    if (this.resolveFn) this.resolveFn(false);
    this.close();
  }

  private close() {
    this.show = false;
    this.message = '';
    this.resolveFn = null;
  }
}
