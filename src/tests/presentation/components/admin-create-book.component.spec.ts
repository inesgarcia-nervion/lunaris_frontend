import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AdminCreateBookComponent } from '../../../app/presentation/components/admin-create-book/admin-create-book.component';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

/**
 * Pruebas unitarias para el componente AdminCreateBookComponent.
 */
describe('AdminCreateBookComponent', () => {
  let component: AdminCreateBookComponent;
  let fixture: ComponentFixture<AdminCreateBookComponent>;
  let bookServiceMock: any;
  let authMock: any;
  let routerSpy: any;

  /**
   * Configuración común para las pruebas, con opción de simular un usuario admin o no admin.
   * @param isAdmin Indica si el usuario simulado es admin (true) o no (false).
   */
  function setup(isAdmin = true) {
    localStorage.clear();
    if (isAdmin) {
      localStorage.setItem('lunaris_user', JSON.stringify({ id: 42 }));
    }
    bookServiceMock = {
      getGenres: vi.fn().mockReturnValue(of([{ id: 1, name: 'Fantasy' }, { id: 2, name: 'Sci-Fi' }])),
      createBook: vi.fn().mockReturnValue(of({ id: 1 }))
    };
    authMock = {
      isAdmin: vi.fn().mockReturnValue(isAdmin)
    };
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      imports: [AdminCreateBookComponent],
      providers: [
        { provide: BookSearchService, useValue: bookServiceMock },
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerSpy }
      ]
    });

    fixture = TestBed.createComponent(AdminCreateBookComponent);
    component = fixture.componentInstance;
  }

  /**
   * Limpieza después de cada prueba.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para el constructor del componente.
   */
  describe('constructor', () => {
    /**
     * Verifica que isAdmin se establece correctamente cuando el usuario es admin.
     */
    it('should set isAdmin=true when user is admin', () => {
      setup(true);
      expect(component.isAdmin).toBe(true);
    });

    /**
     * Verifica que se redirige a /menu después de un retraso cuando el usuario no es admin.
     */
    it('should redirect to /menu after delay when not admin', () => {
      vi.useFakeTimers();
      setup(false);
      vi.advanceTimersByTime(2001);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
      vi.useRealTimers();
    });

    /**
     * Verifica que currentUserId se establece correctamente desde localStorage.
     */
    it('should set currentUserId from localStorage', () => {
      setup(true);
      expect(component.currentUserId).toBe(42);
    });
  });

  /**
   * Pruebas para el método ngOnInit del componente.
   */
  describe('ngOnInit', () => {
    /**
     * Verifica que los géneros se cargan correctamente al inicializar el componente.
     */
    it('should load genres on init', () => {
      setup();
      fixture.detectChanges();
      expect(component.allGenres).toHaveLength(2);
    });

    /**
     * Verifica que no se lanza una excepción si getGenres falla.
     */
    it('should not throw if getGenres fails', () => {
      setup();
      bookServiceMock.getGenres.mockReturnValue(throwError(() => new Error('Network error')));
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  /**
   * Pruebas para el método hasCreateBookChanges del componente.
   */
  describe('hasCreateBookChanges()', () => {
    /**
     * Verifica que devuelve false cuando todos los campos están vacíos.
     */
    it('should return false when all fields empty', () => {
      setup();
      fixture.detectChanges();
      expect(component.hasCreateBookChanges()).toBe(false);
    });

    /**
     * Verifica que devuelve true cuando el título está establecido.
     */
    it('should return true when title is set', () => {
      setup();
      fixture.detectChanges();
      component.title = 'My Book';
      expect(component.hasCreateBookChanges()).toBe(true);
    });

    /**
     * Verifica que devuelve true cuando selectedGenreIds no está vacío.
     */
    it('should return true when selectedGenreIds is non-empty', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1];
      expect(component.hasCreateBookChanges()).toBe(true);
    });

    /**
     * Verifica que devuelve true cuando releaseYear está establecido.
     */
    it('should return true when releaseYear is set', () => {
      setup();
      fixture.detectChanges();
      component.releaseYear = 2020;
      expect(component.hasCreateBookChanges()).toBe(true);
    });
  });

  /**
   * Pruebas para el método toggleGenreDropdown del componente.
   */
  describe('toggleGenreDropdown()', () => {
    /**
     * Verifica que se abre el dropdown cuando está cerrado.
     */
    it('should open dropdown', () => {
      setup();
      fixture.detectChanges();
      component.genreDropdownOpen = false;

      component.toggleGenreDropdown();

      expect(component.genreDropdownOpen).toBe(true);
    });

    /**
     * Verifica que se cierra el dropdown cuando está abierto.
     */
    it('should close dropdown', () => {
      setup();
      fixture.detectChanges();
      component.genreDropdownOpen = true;

      component.toggleGenreDropdown();

      expect(component.genreDropdownOpen).toBe(false);
    });
  });

  /**
   * Pruebas para el método isGenreSelected del componente.
   */
  describe('isGenreSelected()', () => {
    /**
     * Verifica que devuelve true para un género seleccionado.
     */
    it('should return true for selected genre', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2];
      expect(component.isGenreSelected(1)).toBe(true);
    });

    /**
     * Verifica que devuelve false para un género no seleccionado.
     */
    it('should return false for unselected genre', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [2];
      expect(component.isGenreSelected(1)).toBe(false);
    });
  });

  /**
   * Pruebas para el método toggleGenre del componente.
   */
  describe('toggleGenre()', () => {
    /**
     * Verifica que se agrega un género cuando no está seleccionado.
     */
    it('should add genre when not selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [];

      component.toggleGenre(1);

      expect(component.selectedGenreIds).toContain(1);
    });

    /**
     * Verifica que se elimina un género cuando ya está seleccionado.
     */
    it('should remove genre when already selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2];

      component.toggleGenre(1);

      expect(component.selectedGenreIds).not.toContain(1);
    });
  });

  /**
   * Pruebas para el método removeGenre del componente.
   */
  describe('removeGenre()', () => {
    /**
     * Verifica que se elimina un género de selectedGenreIds.
     */
    it('should remove genre from selectedGenreIds', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2, 3];

      component.removeGenre(2);

      expect(component.selectedGenreIds).toEqual([1, 3]);
    });
  });

  /**
   * Pruebas para el método getGenreName del componente.
   */
  describe('getGenreName()', () => {
    /**
     * Verifica que devuelve el nombre del género por su id.
     */
    it('should return genre name by id', () => {
      setup();
      fixture.detectChanges();
      expect(component.getGenreName(1)).toBe('Fantasy');
    });

    /**
     * Verifica que devuelve una cadena vacía para un id desconocido.
     */
    it('should return empty string for unknown id', () => {
      setup();
      fixture.detectChanges();
      expect(component.getGenreName(999)).toBe('');
    });
  });

  /**
   * Pruebas para el método getDropdownLabel del componente.
   */
  describe('getDropdownLabel()', () => {
    /**
     * Verifica que devuelve el placeholder cuando no hay géneros seleccionados.
     */
    it('should return placeholder when no genres selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [];
      expect(component.getDropdownLabel()).toBe('Selecciona géneros...');
    });

    /**
     * Verifica que devuelve los nombres de los géneros seleccionados unidos por comas.
     */
    it('should return joined genre names when genres selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2];
      expect(component.getDropdownLabel()).toBe('Fantasy, Sci-Fi');
    });
  });

  /**
   * Pruebas para el método setImageFromUrl del componente.
   */
  describe('setImageFromUrl()', () => {
    /**
     * Verifica que se establece filePreview a partir de coverImage.
     */
    it('should set filePreview from coverImage', () => {
      setup();
      fixture.detectChanges();
      component.coverImage = 'http://example.com/cover.jpg';

      component.setImageFromUrl();

      expect(component.filePreview).toBe('http://example.com/cover.jpg');
    });

    /**
     * Verifica que no hace nada cuando coverImage está vacío.
     */
    it('should do nothing when coverImage is empty', () => {
      setup();
      fixture.detectChanges();
      component.coverImage = '';

      component.setImageFromUrl();

      expect(component.filePreview).toBeNull();
    });
  });

  /**
   * Pruebas para el método clearForm del componente.
   */
  describe('clearForm()', () => {
    /**
     * Verifica que se reinician todos los campos del formulario.
     */
    it('should reset all form fields', () => {
      setup();
      fixture.detectChanges();
      component.title = 'T';
      component.author = 'A';
      component.description = 'D';
      component.coverImage = 'C';
      component.releaseYear = 2021;
      component.score = 4;
      component.filePreview = 'data:img';
      component.selectedGenreIds = [1];
      component.genreDropdownOpen = true;

      component.clearForm();

      expect(component.title).toBe('');
      expect(component.author).toBe('');
      expect(component.releaseYear).toBeNull();
      expect(component.score).toBeNull();
      expect(component.filePreview).toBeNull();
      expect(component.selectedGenreIds).toEqual([]);
      expect(component.genreDropdownOpen).toBe(false);
    });
  });

  /**
   * Pruebas para el método submit del componente.
   */
  describe('submit()', () => {
    /**
     * Verifica que se establece un error cuando el título está vacío.
     */
    it('should set error when title is empty', () => {
      setup();
      fixture.detectChanges();
      component.title = '';
      component.author = 'An Author';

      component.submit();

      expect(component.error).toBeTruthy();
      expect(bookServiceMock.createBook).not.toHaveBeenCalled();
    });

    /**
     * Verifica que se establece un error cuando el autor está vacío.
     */
    it('should set error when author is empty', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = '';

      component.submit();

      expect(component.error).toBeTruthy();
      expect(bookServiceMock.createBook).not.toHaveBeenCalled();
    });

    /**
     * Verifica que se establece un error cuando la puntuación está fuera del rango permitido.
     */
    it('should set error when score is out of range', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      component.score = 6;

      component.submit();

      expect(component.error).toBeTruthy();
    });

    /**
     * Verifica que se establece un error cuando el año de lanzamiento es inválido.
     */
    it('should set error when releaseYear is invalid', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      component.releaseYear = 500;

      component.submit();

      expect(component.error).toBeTruthy();
    });

    /**
     * Verifica que se llama a createBook con los datos correctos y se muestra el éxito.
     */
    it('should call createBook with correct data and show success', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';

      component.submit();

      expect(bookServiceMock.createBook).toHaveBeenCalled();
      expect(component.success).toBeTruthy();
      vi.advanceTimersByTime(2001);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
      vi.useRealTimers();
    });

    /**
     * Verifica que se establece un error cuando se recibe una respuesta 400.
     */
    it('should set error on 400 response', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      bookServiceMock.createBook.mockReturnValue(throwError(() => ({ status: 400 })));

      component.submit();

      expect(component.error).toBeTruthy();
      expect(component.loading).toBe(false);
    });

    /**
     * Verifica que se establece un error cuando no hay conexión (status 0).
     */
    it('should set error on status 0 (no connection)', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      bookServiceMock.createBook.mockReturnValue(throwError(() => ({ status: 0 })));

      component.submit();

      expect(component.error).toContain('servidor');
    });

    /**
     * Verifica que se establece un error genérico en otros fallos.
     */
    it('should set generic error on other failures', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      bookServiceMock.createBook.mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Internal Error' } })));

      component.submit();

      expect(component.error).toBeTruthy();
    });
  });
});
