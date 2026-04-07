import { TestBed } from '@angular/core/testing';
import { App } from './app';

/**
 * Pruebas unitarias para el componente raíz `App` de la aplicación Angular. 
 * 
 * Estas pruebas verifican que el componente se crea correctamente y que el 
 * título se renderiza como se espera. 
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, lunaris_frontend');
  });
});
