import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../confirm.service';

/**
 * Componente de diálogo de confirmación utilizado para mostrar un mensaje al usuario y 
 * solicitar una respuesta de sí o no.
 * 
 * Este componente se suscribe a las solicitudes de confirmación emitidas por el servicio 
 * ConfirmService, mostrando un cuadro de diálogo con el mensaje proporcionado y resolviendo 
 * la promesa asociada con la respuesta del usuario (verdadero para sí, falso para no). 
 */
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

  /**
   * Maneja la acción de confirmación afirmativa del usuario, resolviendo la promesa con 
   * verdadero y cerrando el diálogo.
    * @returns void
   */
  confirmYes() {
    if (this.resolveFn) this.resolveFn(true);
    this.close();
  }

  /**
   * Maneja la acción de confirmación negativa del usuario, resolviendo la promesa con falso 
   * y cerrando el diálogo.
   * @returns void
   */
  confirmNo() {
    if (this.resolveFn) this.resolveFn(false);
    this.close();
  }

  /**
   * Cierra el diálogo de confirmación, ocultándolo y limpiando el mensaje y la función de 
   * resolución para prepararlo para la próxima solicitud de confirmación.
   * @returns void
   */
  private close() {
    this.show = false;
    this.message = '';
    this.resolveFn = null;
  }
}
