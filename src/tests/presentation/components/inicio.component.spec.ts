import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { InicioComponent } from '../../../app/presentation/components/inicio/inicio.component';
import { provideRouter } from '@angular/router';

/**
 * Pruebas para InicioComponent.
 */
describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let component: InicioComponent;
  let routerSpy: { navigate: ReturnType<typeof vi.fn> };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    routerSpy = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('navigateToRegister should navigate to /register', () => {
    component.navigateToRegister();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('navigateToLogin should navigate to /login', () => {
    component.navigateToLogin();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
