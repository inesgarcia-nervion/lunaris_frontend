import { Directive, ElementRef, forwardRef, HostListener, Input, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Directiva para elementos con `contenteditable` que permite su uso como un control de formulario en Angular.
 * 
 * Esta directiva implementa `ControlValueAccessor` para integrarse con el sistema de formularios de Angular,
 * permitiendo que los elementos `contenteditable` se comporten como controles de formulario reactivos o basados en plantillas.
 */
@Directive({
  selector: '[contenteditable][ngModel]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ContenteditableDirective),
      multi: true,
    },
  ],
})
export class ContenteditableDirective implements ControlValueAccessor {
  @Input() multiline: boolean = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  /**
   * Maneja el evento de entrada en el elemento `contenteditable`, actualizando el valor del control de formulario
   * cada vez que el contenido cambia. También se asegura de emitir el nuevo valor a través de la función `onChange`
   * registrada por Angular Forms.
   */
  @HostListener('input')
  onInput(): void {
    this.onChange(this.el.nativeElement.innerText);
  }

  /**
   * Maneja el evento de pérdida de foco (blur) en el elemento `contenteditable`, marcando el control como tocado
   * para que Angular Forms pueda realizar validaciones y actualizaciones de estado adecuadas.
   */
  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  /**
   * Maneja el evento de pulsación de tecla en el elemento `contenteditable`, previniendo la inserción de 
   * saltos de línea cuando la tecla 'Enter' es presionada y el modo multilinea no está habilitado. 
   * @param event El evento de teclado que se ha producido. Si la tecla es 'Enter' y el modo multilinea no 
   * está habilitado, se previene la acción por defecto.
   */
  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.multiline) {
      event.preventDefault();
    }
  }

  /**
   * Maneja el evento de pegado (paste) en el elemento `contenteditable`, previniendo la inserción de contenido 
   * con formato y asegurando que solo se pegue texto plano. Si el modo multilinea no está habilitado, también 
   * se eliminan los saltos de línea.
   * @param event El evento de pegado que se ha producido. Se previene la acción por defecto, se obtiene el 
   * texto plano del portapapeles, se procesa según el modo multilinea, y luego se inserta en el contenido del 
   * elemento `contenteditable`. Finalmente, se emite el nuevo valor a través de `onChange`.
   */
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const raw = event.clipboardData?.getData('text/plain') ?? '';
    const text = this.multiline ? raw : raw.replace(/\n/g, ' ');
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      selection.deleteFromDocument();
      selection.getRangeAt(0).insertNode(document.createTextNode(text));
      selection.collapseToEnd();
      this.onChange(this.el.nativeElement.innerText);
    }
  }

  /**
   * Escribe un nuevo valor en el elemento `contenteditable`, actualizando su contenido solo si el nuevo valor es diferente
   * al contenido actual. Esto evita actualizaciones innecesarias que podrían causar parpadeos o pérdida de foco.
   * @param value El nuevo valor que se desea escribir en el elemento `contenteditable`. Si el valor es 
   * `null` o `undefined`, se tratará como una cadena vacía. Si el nuevo valor es diferente al contenido 
   * actual del elemento, se actualizará el contenido del elemento con el nuevo valor.
   */
  writeValue(value: string): void {
    const text = value ?? '';
    if (this.el.nativeElement.innerText !== text) {
      this.el.nativeElement.innerText = text;
    }
  }

  /**
   * Registra una función de devolución de llamada que Angular Forms llamará cuando el valor del control cambie. 
   * Esta función se utiliza para notificar a Angular Forms sobre los cambios en el valor del control, 
   * permitiendo que el sistema de formularios actualice su estado y realice validaciones según sea necesario.
   * @param fn La función de devolución de llamada que se registrará para manejar los cambios en el valor del control.
   */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  /**
   * Registra una función de devolución de llamada que Angular Forms llamará cuando el control sea tocado (touched).
   * Esta función se utiliza para notificar a Angular Forms que el control ha sido interactuado, lo que puede ser 
   * importante para la validación y el estado del formulario.
   * @param fn La función de devolución de llamada que se registrará para manejar el evento de toque (touched) del control.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Establece el estado de deshabilitado del control, actualizando el atributo `contenteditable` del elemento para 
   * reflejar si el control está habilitado o deshabilitado. Cuando el control está deshabilitado, el atributo 
   * `contenteditable` se establece en 'false', lo que impide que el usuario edite el contenido del elemento. 
   * Cuando el control está habilitado, el atributo se establece en 'true', permitiendo la edición del contenido.
   * @param isDisabled Indica si el control debe estar deshabilitado (`true`) o habilitado (`false`).
   */
  setDisabledState(isDisabled: boolean): void {
    this.renderer.setAttribute(
      this.el.nativeElement,
      'contenteditable',
      isDisabled ? 'false' : 'true'
    );
  }
}
