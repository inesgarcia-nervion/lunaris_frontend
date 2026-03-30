import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private subject = new Subject<{ message: string; resolve: (v: boolean) => void }>();
  requests$ = this.subject.asObservable();

  confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => this.subject.next({ message, resolve }));
  }
}
