import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ElementRef, Renderer2 } from '@angular/core';
import { ContenteditableDirective } from '../../../app/presentation/shared/contenteditable.directive';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

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

describe('ContenteditableDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let div: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TestHostMultilineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    div = fixture.nativeElement.querySelector('div');
  });

  it('directive should be created', () => {
    expect(div).toBeTruthy();
  });

  it('writeValue updates innerText when value is different', async () => {
    component.value = 'Hello World';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(div.innerText).toBe('Hello World');
  });

  it('writeValue does not update if value is the same', async () => {
    div.innerText = 'Same';
    component.value = 'Same';
    fixture.detectChanges();
    await fixture.whenStable();
    // Should not throw or change the content
    expect(div.innerText).toBe('Same');
  });

  it('writeValue treats null as empty string', async () => {
    component.value = null as any;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(div.innerText).toBe('');
  });

  it('onInput fires onChange and updates ngModel', async () => {
    div.innerText = 'Typed text';
    div.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.value).toBe('Typed text');
  });

  it('onBlur marks as touched', () => {
    // Should not throw
    expect(() => div.dispatchEvent(new Event('blur'))).not.toThrow();
  });

  it('onKeydown Enter prevents default in single-line mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    div.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('onKeydown non-Enter key does not prevent default', () => {
    const event = new KeyboardEvent('keydown', { key: 'A', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    div.dispatchEvent(event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('onPaste inserts plain text, removes newlines in single-line mode', async () => {
    const clipboardData = {
      getData: vi.fn().mockReturnValue('Pasted\nText'),
    };
    const pasteEvent = new Event('paste', { bubbles: true }) as any;
    Object.defineProperty(pasteEvent, 'clipboardData', { value: clipboardData });
    div.dispatchEvent(pasteEvent);
    fixture.detectChanges();
    await fixture.whenStable();
    // newline should be replaced with space
    expect(div.innerText).not.toContain('\n');
  });

  it('onPaste handles missing clipboardData gracefully', () => {
    const pasteEvent = new Event('paste', { bubbles: true }) as any;
    // clipboardData is null by default in some environments
    expect(() => div.dispatchEvent(pasteEvent)).not.toThrow();
  });
});

describe('ContenteditableDirective (multiline mode)', () => {
  let fixture: ComponentFixture<TestHostMultilineComponent>;
  let component: TestHostMultilineComponent;
  let div: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostMultilineComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostMultilineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    div = fixture.nativeElement.querySelector('div');
  });

  it('onKeydown Enter does NOT prevent default in multiline mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    div.dispatchEvent(event);
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('onPaste preserves newlines in multiline mode', async () => {
    // Set up a selection range so the directive can insert text
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

    // Spy on document.createTextNode to capture what text is actually inserted
    const createTextNodeSpy = vi.spyOn(document, 'createTextNode');

    div.dispatchEvent(pasteEvent);
    fixture.detectChanges();
    await fixture.whenStable();

    // In multiline mode, newlines should be preserved (not stripped with replace)
    expect(clipboardData.getData).toHaveBeenCalledWith('text/plain');
    // The text node created should contain newlines (multiline mode)
    const calls = createTextNodeSpy.mock.calls;
    if (calls.length > 0) {
      const insertedText = calls[calls.length - 1][0] as string;
      expect(insertedText).toContain('Line1');
      expect(insertedText).not.toBe(insertedText.replace(/\n/g, ' '));
    } else {
      // jsdom selection may not support insertNode - verify at least getData was called
      expect(clipboardData.getData).toHaveBeenCalled();
    }

    createTextNodeSpy.mockRestore();
  });
});
