import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AdminCreateBookComponent } from '../../../app/presentation/components/admin-create-book/admin-create-book.component';
import { BookSearchService } from '../../../app/domain/services/book-search.service';
import { AuthService } from '../../../app/domain/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('AdminCreateBookComponent', () => {
  let component: AdminCreateBookComponent;
  let fixture: ComponentFixture<AdminCreateBookComponent>;
  let bookServiceMock: any;
  let authMock: any;
  let routerSpy: any;

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

  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set isAdmin=true when user is admin', () => {
      setup(true);
      expect(component.isAdmin).toBe(true);
    });

    it('should redirect to /menu after delay when not admin', () => {
      vi.useFakeTimers();
      setup(false);
      vi.advanceTimersByTime(2001);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/menu']);
      vi.useRealTimers();
    });

    it('should set currentUserId from localStorage', () => {
      setup(true);
      expect(component.currentUserId).toBe(42);
    });
  });

  describe('ngOnInit', () => {
    it('should load genres on init', () => {
      setup();
      fixture.detectChanges();
      expect(component.allGenres).toHaveLength(2);
    });

    it('should not throw if getGenres fails', () => {
      setup();
      bookServiceMock.getGenres.mockReturnValue(throwError(() => new Error('Network error')));
      expect(() => fixture.detectChanges()).not.toThrow();
    });
  });

  describe('hasCreateBookChanges()', () => {
    it('should return false when all fields empty', () => {
      setup();
      fixture.detectChanges();
      expect(component.hasCreateBookChanges()).toBe(false);
    });

    it('should return true when title is set', () => {
      setup();
      fixture.detectChanges();
      component.title = 'My Book';
      expect(component.hasCreateBookChanges()).toBe(true);
    });

    it('should return true when selectedGenreIds is non-empty', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1];
      expect(component.hasCreateBookChanges()).toBe(true);
    });

    it('should return true when releaseYear is set', () => {
      setup();
      fixture.detectChanges();
      component.releaseYear = 2020;
      expect(component.hasCreateBookChanges()).toBe(true);
    });
  });

  describe('toggleGenreDropdown()', () => {
    it('should open dropdown', () => {
      setup();
      fixture.detectChanges();
      component.genreDropdownOpen = false;

      component.toggleGenreDropdown();

      expect(component.genreDropdownOpen).toBe(true);
    });

    it('should close dropdown', () => {
      setup();
      fixture.detectChanges();
      component.genreDropdownOpen = true;

      component.toggleGenreDropdown();

      expect(component.genreDropdownOpen).toBe(false);
    });
  });

  describe('isGenreSelected()', () => {
    it('should return true for selected genre', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2];
      expect(component.isGenreSelected(1)).toBe(true);
    });

    it('should return false for unselected genre', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [2];
      expect(component.isGenreSelected(1)).toBe(false);
    });
  });

  describe('toggleGenre()', () => {
    it('should add genre when not selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [];

      component.toggleGenre(1);

      expect(component.selectedGenreIds).toContain(1);
    });

    it('should remove genre when already selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2];

      component.toggleGenre(1);

      expect(component.selectedGenreIds).not.toContain(1);
    });
  });

  describe('removeGenre()', () => {
    it('should remove genre from selectedGenreIds', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2, 3];

      component.removeGenre(2);

      expect(component.selectedGenreIds).toEqual([1, 3]);
    });
  });

  describe('getGenreName()', () => {
    it('should return genre name by id', () => {
      setup();
      fixture.detectChanges();
      expect(component.getGenreName(1)).toBe('Fantasy');
    });

    it('should return empty string for unknown id', () => {
      setup();
      fixture.detectChanges();
      expect(component.getGenreName(999)).toBe('');
    });
  });

  describe('getDropdownLabel()', () => {
    it('should return placeholder when no genres selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [];
      expect(component.getDropdownLabel()).toBe('Selecciona géneros...');
    });

    it('should return joined genre names when genres selected', () => {
      setup();
      fixture.detectChanges();
      component.selectedGenreIds = [1, 2];
      expect(component.getDropdownLabel()).toBe('Fantasy, Sci-Fi');
    });
  });

  describe('setImageFromUrl()', () => {
    it('should set filePreview from coverImage', () => {
      setup();
      fixture.detectChanges();
      component.coverImage = 'http://example.com/cover.jpg';

      component.setImageFromUrl();

      expect(component.filePreview).toBe('http://example.com/cover.jpg');
    });

    it('should do nothing when coverImage is empty', () => {
      setup();
      fixture.detectChanges();
      component.coverImage = '';

      component.setImageFromUrl();

      expect(component.filePreview).toBeNull();
    });
  });

  describe('clearForm()', () => {
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

  describe('submit()', () => {
    it('should set error when title is empty', () => {
      setup();
      fixture.detectChanges();
      component.title = '';
      component.author = 'An Author';

      component.submit();

      expect(component.error).toBeTruthy();
      expect(bookServiceMock.createBook).not.toHaveBeenCalled();
    });

    it('should set error when author is empty', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = '';

      component.submit();

      expect(component.error).toBeTruthy();
      expect(bookServiceMock.createBook).not.toHaveBeenCalled();
    });

    it('should set error when score is out of range', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      component.score = 6;

      component.submit();

      expect(component.error).toBeTruthy();
    });

    it('should set error when releaseYear is invalid', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      component.releaseYear = 500;

      component.submit();

      expect(component.error).toBeTruthy();
    });

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

    it('should set error on status 0 (no connection)', () => {
      setup();
      fixture.detectChanges();
      component.title = 'A Book';
      component.author = 'An Author';
      bookServiceMock.createBook.mockReturnValue(throwError(() => ({ status: 0 })));

      component.submit();

      expect(component.error).toContain('servidor');
    });

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
