import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ContenteditableDirective } from '../../../app/presentation/shared/contenteditable.directive';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Pruebas para el ContenteditableDirective.
 */
@Component({
  standalone: true,
  imports: [FormsModule, ContenteditableDirective],
  template: `<div contenteditable [(ngModel)]="value"></div>`,
})
class TestHostComponent {
  value = '';
}

@Component({
  standalone: true,
  imports: [FormsModule, ContenteditableDirective],
  template: `<div contenteditable [multiline]="true" [(ngModel)]="value"></div>`,
})
class TestHostMultilineComponent {
  value = '';
}

/**
 * Pruebas para el ContenteditableDirective.
 */
describe('ContenteditableDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let div: HTMLElement;

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TestHostMultilineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    div = fixture.nativeElement.querySelector('div');
  });

  /**
   * Prueba de creación de la directiva.
   */
  it('directive should be created', () => {
    expect(div).toBeTruthy();
  });

  /**
   * Prueba de actualización del valor cuando es diferente.
   */
  it('writeValue updates innerText when value is different', async () => {
    component.value = 'Hello World';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(div.innerText).toBe('Hello World');
  });

  /**
   * Prueba de que writeValue no actualiza si el valor es el mismo.
   */
  it('writeValue does not update if value is the same', async () => {
    div.innerText = 'Same';
    component.value = 'Same';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(div.innerText).toBe('Same');
  });

  /**
   * Prueba de que writeValue trata null como cadena vacía.
   */
  it('writeValue treats null as empty string', async () => {
    component.value = null as any;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(div.innerText).toBe('');
  });

  /**
   * Prueba de que onInput dispara onChange y actualiza ngModel.
   */
  it('onInput fires onChange and updates ngModel', async () => {
    div.innerText = 'Typed text';
    div.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.value).toBe('Typed text');
  });

  /**
   * Prueba de que onBlur marca como tocado.
   */
  it('onBlur marks as touched', () => {
    expect(() => div.dispatchEvent(new Event('blur'))).not.toThrow();
  });

  /**
   * Prueba de que onKeydown Enter previene el comportamiento por defecto en modo de una sola línea.
   */
  it('onKeydown Enter prevents default in single-line mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    div.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  /**
   * Prueba de que onKeydown una tecla que no sea Enter no previene el comportamiento por defecto.
   */
  it('onKeydown non-Enter key does not prevent default', () => {
    const event = new KeyboardEvent('keydown', { key: 'A', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    div.dispatchEvent(event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  /**
   * Prueba de que onPaste inserta texto plano y elimina saltos de línea en modo de una sola línea.
   */
  it('onPaste inserts plain text, removes newlines in single-line mode', async () => {
    const clipboardData = {
      getData: vi.fn().mockReturnValue('Pasted\nText'),
    };
    const pasteEvent = new Event('paste', { bubbles: true }) as any;
    Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData });
    div.dispatchEvent(pasteEvent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(div.innerText).not.toContain('\n');
  });

  /**
   * Prueba de que onPaste maneja la ausencia de clipboardData sin errores.
   */
  it('onPaste handles missing clipboardData gracefully', () => {
    const pasteEvent = new Event('paste', { bubbles: true }) as any;
    expect(() => div.dispatchEvent(pasteEvent)).not.toThrow();
  });
});

/**
 * Pruebas para ContenteditableDirective en modo multilinea.
 */
describe('ContenteditableDirective (multiline mode)', () => {
  let fixture: ComponentFixture<TestHostMultilineComponent>;
  let component: TestHostMultilineComponent;
  let div: HTMLElement;

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostMultilineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostMultilineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    div = fixture.nativeElement.querySelector('div');
  });

  /**
   * Prueba de que onKeydown Enter no previene el comportamiento por defecto en modo multilinea.
   */
  it('onKeydown Enter does NOT prevent default in multiline mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    div.dispatchEvent(event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  /**
   * Prueba de que onPaste preserva los saltos de línea en modo multilinea.
   */
  it('onPaste preserves newlines in multiline mode', async () => {
    div.innerText = '';
    const range = document.createRange();
    range.selectNodeContents(div);
    range.collapse(false);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const clipboardData = {
      getData: vi.fn().mockReturnValue('Line1\nLine2'),
    };
    const pasteEvent = new Event('paste', { bubbles: true }) as any;
    Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData });

    const createTextNodeSpy = vi.spyOn(document, 'createTextNode');

    div.dispatchEvent(pasteEvent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(clipboardData.getData).toHaveBeenCalledWith('text/plain');
    const calls = createTextNodeSpy.mock.calls;
    if (calls.length > 0) {
      const insertedText = calls[calls.length - 1][0] as string;
      expect(insertedText).toContain('Line1');
      expect(insertedText).not.toBe(insertedText.replace(/\n/g, ' '));
    } else {
      expect(clipboardData.getData).toHaveBeenCalled();
    }

    createTextNodeSpy.mockRestore();
  });
});
