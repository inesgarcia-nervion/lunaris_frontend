import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PeticionesComponent } from '../../../app/presentation/components/peticiones/peticiones.component';
import { PeticionesService } from '../../../app/domain/services/peticiones.service';
import { of, throwError } from 'rxjs';

/**
 * Pruebas para el componente PeticionesComponent.
 */
describe('PeticionesComponent', () => {
  let fixture: ComponentFixture<PeticionesComponent>;
  let component: PeticionesComponent;
  let peticionesSpy: { create: ReturnType<typeof vi.fn> };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(async () => {
    peticionesSpy = { create: vi.fn().mockReturnValue(of({ id: 1, title: 'Test', author: 'Auth' })) };

    await TestBed.configureTestingModule({
      imports: [PeticionesComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PeticionesService, useValue: peticionesSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PeticionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Pruebas para la creación del componente.
   */
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Pruebas para el estado inicial del componente.
   */
  it('initial state should have empty fields', () => {
    expect(component.title).toBe('');
    expect(component.author).toBe('');
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
    expect(component.success).toBeNull();
  });

  /**
   * Pruebas para el método submit del componente.
   */
  it('submit with empty title sets error', () => {
    component.title = '';
    component.author = 'AuthorName';
    component.submit();
    expect(component.error).toBe('El título es obligatorio');
    expect(peticionesSpy.create).not.toHaveBeenCalled();
  });

  /**
   * Pruebas para el método submit del componente con título en blanco.
   */
  it('submit with whitespace-only title sets error', () => {
    component.title = '   ';
    component.author = 'Author';
    component.submit();
    expect(component.error).toBe('El título es obligatorio');
  });

  /**
   * Pruebas para el método submit del componente con autor en blanco.
   */
  it('submit with empty author sets error', () => {
    component.title = 'A Book';
    component.author = '';
    component.submit();
    expect(component.error).toBe('El autor es obligatorio');
    expect(peticionesSpy.create).not.toHaveBeenCalled();
  });

  /**
   * Pruebas para el método submit del componente con entradas válidas.
   */
  it('submit with valid inputs calls peticiones.create', () => {
    component.title = 'Dune';
    component.author = 'Herbert';
    component.submit();
    expect(peticionesSpy.create).toHaveBeenCalledWith({ title: 'Dune', author: 'Herbert' });
  });

  /**
   * Pruebas para el método submit del componente con entradas con espacios en blanco.
   */
  it('submit trims whitespace from inputs', () => {
    component.title = '  Dune  ';
    component.author = '  Herbert  ';
    component.submit();
    expect(peticionesSpy.create).toHaveBeenCalledWith({ title: 'Dune', author: 'Herbert' });
  });

  /**
   * Pruebas para el método submit del componente en caso de éxito.
   */
  it('submit on success shows success message and clears fields', () => {
    component.title = 'Dune';
    component.author = 'Herbert';
    component.submit();
    expect(component.success).toBe('Petición enviada correctamente');
    expect(component.title).toBe('');
    expect(component.author).toBe('');
    expect(component.loading).toBe(false);
  });

  /**
   * Pruebas para el método submit del componente en caso de error.
   */
  it('submit on error shows error message', () => {
    peticionesSpy.create.mockReturnValue(throwError(() => ({ error: { message: 'Server Error' } })));
    component.title = 'Dune';
    component.author = 'Herbert';
    component.submit();
    expect(component.error).toBe('Server Error');
    expect(component.loading).toBe(false);
  });

  /**
   * Pruebas para el método submit del componente en caso de error sin mensaje.
   */
  it('submit on error without message shows default error', () => {
    peticionesSpy.create.mockReturnValue(throwError(() => ({})));
    component.title = 'Dune';
    component.author = 'Herbert';
    component.submit();
    expect(component.error).toBe('Error enviando la petición');
  });

  /**
   * Pruebas para el método submit del componente al limpiar errores y éxitos previos.
   */
  it('submit clears previous error and success', () => {
    component.error = 'old error';
    component.success = 'old success';
    component.title = 'Book';
    component.author = 'Author';
    component.submit();
    expect(component.error).toBeNull();
  });
});
