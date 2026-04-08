import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { RouterTestingModule } from '@angular/router/testing';
import { ListasService } from './domain/services/listas.service';
import { AuthService } from './domain/services/auth.service';

/**
 * Pruebas unitarias para el componente raíz `App` de la aplicación Angular. 
 * 
 * Estas pruebas verifican que el componente se crea correctamente y que el 
 * título se renderiza como se espera. 
 */
describe('App', () => {
  const listasMock = {
    getCurrentUser: vi.fn().mockReturnValue(null),
    assignUnownedListsToCurrentUser: vi.fn(),
    listas$: { subscribe: () => ({ unsubscribe: () => {} }) }
  };

  const authMock = {
    getCurrentUsername: vi.fn().mockReturnValue(null),
    getUserTheme: vi.fn().mockReturnValue('light'),
    isAdmin: vi.fn().mockReturnValue(false)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, RouterTestingModule],
      providers: [
        { provide: ListasService, useValue: listasMock },
        { provide: AuthService, useValue: authMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have title lunaris_frontend', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect((app as any).title()).toBe('lunaris_frontend');
  });
});
