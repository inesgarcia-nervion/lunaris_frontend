import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio de confirmación utilizado para mostrar diálogos de confirmación al usuario.
 * 
 * Permite a los componentes solicitar una confirmación del usuario antes de realizar acciones críticas,
 * como eliminar un elemento o salir sin guardar cambios. El servicio emite solicitudes de confirmación
 * a través de un Subject, que puede ser suscrito por un componente de diálogo para mostrar el mensaje
 * y resolver la promesa con la respuesta del usuario (confirmar o cancelar).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private subject = new Subject<{ message: string; resolve: (v: boolean) => void }>();
  requests$ = this.subject.asObservable();

  /**
   * Solicita una confirmación al usuario mostrando un mensaje específico.
   * @param message El mensaje que se mostrará en el diálogo de confirmación.
   * @returns Una promesa que se resolverá con `true` si el usuario confirma, o `false` si cancela.
   */
  confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => this.subject.next({ message, resolve }));
  }
}
