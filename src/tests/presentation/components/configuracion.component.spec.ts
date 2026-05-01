import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ConfiguracionComponent } from '../../../app/presentation/components/configuracion/configuracion.component';
import { AuthService } from '../../../app/domain/services/auth.service';
import { Router } from '@angular/router';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { of, throwError } from 'rxjs';

/**
 * Pruebas para ConfiguracionComponent.
 */
describe('ConfiguracionComponent', () => {
  let component: ConfiguracionComponent;
  let fixture: ComponentFixture<ConfiguracionComponent>;
  let authMock: any;
  let routerSpy: any;
  let confirmMock: any;

  function setup() {
    authMock = {
      getCurrentUsername: vi.fn().mockReturnValue('alice'),
      getLocalAvatar: vi.fn().mockReturnValue(null),
      getUserTheme: vi.fn().mockReturnValue('light' as 'light' | 'dark'),
      setLocalAvatar: vi.fn(),
      setUserTheme: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn().mockReturnValue(of({ username: 'newuser' })),
      isAdmin$: { subscribe: vi.fn() }
    };
    routerSpy = { navigate: vi.fn() };
    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerSpy },
        { provide: ConfirmService, useValue: confirmMock }
      ]
    });

    fixture = TestBed.createComponent(ConfiguracionComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para ngOnInit.
   */
  describe('ngOnInit', () => {
    it('should load username, theme from auth service', () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('  alice  ');
      authMock.getUserTheme.mockReturnValue('dark');
      fixture.detectChanges();

      expect(component.username).toBe('alice');
      expect(component.newUsername).toBe('alice');
      expect(component.theme).toBe('dark');
    });

    it('should set username to null when empty', () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('');
      fixture.detectChanges();

      expect(component.username).toBeNull();
    });
  });

  /**
   * Pruebas para onUrlChange.
   */
  describe('onUrlChange()', () => {
    it('should clear file-related state when avatarUrl is set', () => {
      setup();
      fixture.detectChanges();
      component.useFile = new File([''], 'test.png');
      component.filePreviewDataUrl = 'data:..';
      component.avatarUrl = 'http://example.com/img.jpg';

      component.onUrlChange();

      expect(component.useFile).toBeNull();
      expect(component.filePreviewDataUrl).toBeNull();
    });

    it('should not clear anything when avatarUrl is empty', () => {
      setup();
      fixture.detectChanges();
      component.useFile = new File([''], 'test.png');
      component.avatarUrl = '';

      component.onUrlChange();

      expect(component.useFile).not.toBeNull();
    });
  });

  /**
   * Pruebas para setAvatarFromUrl.
   */
  describe('setAvatarFromUrl()', () => {
    it('should do nothing when avatarUrl is empty', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = '';

      component.setAvatarFromUrl();

      expect(component.avatarPreview).toBeNull();
    });

    it('should set avatarPreview to the url', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = 'http://example.com/avatar.png';

      component.setAvatarFromUrl();

      expect(component.avatarPreview).toBe('http://example.com/avatar.png');
    });

    it('should toggle off avatarPreview if already set to same url', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = 'http://example.com/avatar.png';
      component.avatarPreview = 'http://example.com/avatar.png';

      component.setAvatarFromUrl();

      expect(component.avatarPreview).toBeNull();
    });
  });

  /**
   * Pruebas para toggleFilePreview.
   */
  describe('toggleFilePreview()', () => {
    it('should do nothing when no file selected', () => {
      setup();
      fixture.detectChanges();
      component.useFile = null;

      component.toggleFilePreview();

      expect(component.avatarPreview).toBeNull();
    });

    it('should set avatarPreview to filePreviewDataUrl', () => {
      setup();
      fixture.detectChanges();
      component.useFile = new File([''], 'file.png');
      component.filePreviewDataUrl = 'data:abc';

      component.toggleFilePreview();

      expect(component.avatarPreview).toBe('data:abc');
    });

    it('should toggle off avatarPreview when already showing file preview', () => {
      setup();
      fixture.detectChanges();
      component.useFile = new File([''], 'file.png');
      component.filePreviewDataUrl = 'data:abc';
      component.avatarPreview = 'data:abc';

      component.toggleFilePreview();

      expect(component.avatarPreview).toBeNull();
    });
  });

  /**
   * Pruebas para toggleTheme.
   */
  describe('toggleTheme()', () => {
    it('should toggle from light to dark', () => {
      setup();
      fixture.detectChanges();
      component.theme = 'light';

      component.toggleTheme();

      expect(component.theme).toBe('dark');
      expect(authMock.setUserTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle from dark to light', () => {
      setup();
      fixture.detectChanges();
      component.theme = 'dark';

      component.toggleTheme();

      expect(component.theme).toBe('light');
      expect(authMock.setUserTheme).toHaveBeenCalledWith('light');
    });
  });

  /**
   * Pruebas para applyAvatar.
   */
  describe('applyAvatar()', () => {
    it('should call setLocalAvatar with avatarPreview', () => {
      setup();
      fixture.detectChanges();
      component.avatarPreview = 'http://example.com/img.png';

      component.applyAvatar();

      expect(authMock.setLocalAvatar).toHaveBeenCalledWith('http://example.com/img.png');
    });

    it('should do nothing when avatarPreview and avatarUrl and filePreviewDataUrl are all empty', () => {
      setup();
      fixture.detectChanges();
      component.avatarPreview = null;
      component.avatarUrl = '';
      component.filePreviewDataUrl = null;

      component.applyAvatar();

      expect(authMock.setLocalAvatar).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para applyUrlAvatar.
   */
  describe('applyUrlAvatar()', () => {
    it('should save avatar and clear avatar url', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = 'http://example.com/pic.jpg';

      component.applyUrlAvatar();

      expect(authMock.setLocalAvatar).toHaveBeenCalledWith('http://example.com/pic.jpg');
      expect(component.avatarUrl).toBe('');
    });

    it('should do nothing when avatarUrl is empty', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = '';

      component.applyUrlAvatar();

      expect(authMock.setLocalAvatar).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para applyFileAvatar.
   */
  describe('applyFileAvatar()', () => {
    it('should save file preview data url as avatar', () => {
      setup();
      fixture.detectChanges();
      component.useFile = new File([''], 'img.png');
      component.filePreviewDataUrl = 'data:img';

      component.applyFileAvatar();

      expect(authMock.setLocalAvatar).toHaveBeenCalledWith('data:img');
    });

    it('should do nothing when no file preview', () => {
      setup();
      fixture.detectChanges();
      component.useFile = null;
      component.filePreviewDataUrl = null;

      component.applyFileAvatar();

      expect(authMock.setLocalAvatar).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para applyAvatarUnified.
   */
  describe('applyAvatarUnified()', () => {
    it('should call applyUrlAvatar when avatarUrl is set', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = 'http://example.com/img.jpg';
      const spy = vi.spyOn(component, 'applyUrlAvatar');

      component.applyAvatarUnified();

      expect(spy).toHaveBeenCalled();
    });

    it('should call applyFileAvatar when filePreviewDataUrl is set', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = '';
      component.filePreviewDataUrl = 'data:img';
      const spy = vi.spyOn(component, 'applyFileAvatar');

      component.applyAvatarUnified();

      expect(spy).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para previewAvatar.
   */
  describe('previewAvatar()', () => {
    it('should call setAvatarFromUrl when avatarUrl is set', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = 'http://example.com/img.jpg';
      const spy = vi.spyOn(component, 'setAvatarFromUrl');

      component.previewAvatar();

      expect(spy).toHaveBeenCalled();
    });

    it('should call toggleFilePreview when file is selected', () => {
      setup();
      fixture.detectChanges();
      component.avatarUrl = '';
      component.useFile = new File([''], 'test.png');
      const spy = vi.spyOn(component, 'toggleFilePreview');

      component.previewAvatar();

      expect(spy).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para hasChanges getter.
   */
  describe('hasChanges getter', () => {
    it('should return false when nothing changed', () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'alice';

      expect(component.hasChanges).toBe(false);
    });

    it('should return true when username changed', () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'bob';

      expect(component.hasChanges).toBe(true);
    });

    it('should return true when file is selected', () => {
      setup();
      fixture.detectChanges();
      component.useFile = new File([''], 'img.png');

      expect(component.hasChanges).toBe(true);
    });
  });

  /**
   * Pruebas para isNameChanged getter.
   */
  describe('isNameChanged getter', () => {
    it('should return true when username changed (case insensitive)', () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'ALICE2';

      expect(component.isNameChanged).toBe(true);
    });

    it('should return false when username same (case insensitive)', () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'ALICE';

      expect(component.isNameChanged).toBe(false);
    });
  });

  /**
   * Pruebas para submitChanges.
   */
  describe('submitChanges()', () => {
    it('should set error when newUsername is blank', async () => {
      setup();
      fixture.detectChanges();
      component.newUsername = '  ';

      await component.submitChanges();

      expect(component.error).toBeTruthy();
    });

    it('should set error when no changes detected', async () => {
      vi.useFakeTimers();
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'alice';

      await component.submitChanges();
      expect(component.error).toBeTruthy();
      vi.advanceTimersByTime(5001);
      vi.useRealTimers();
    });

    it('should call auth.updateUser when confirmed', async () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'newname';
      confirmMock.confirm.mockResolvedValue(true);

      await component.submitChanges();

      expect(authMock.updateUser).toHaveBeenCalled();
    });

    it('should not call updateUser when confirm cancelled', async () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'newname';
      confirmMock.confirm.mockResolvedValue(false);

      await component.submitChanges();

      expect(authMock.updateUser).not.toHaveBeenCalled();
    });

    it('should navigate to /login on successful update', async () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'newname';
      authMock.updateUser.mockReturnValue(of({}));
      confirmMock.confirm.mockResolvedValue(true);

      await component.submitChanges();

      expect(authMock.logout).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should set error on 409 status', async () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'newname';
      authMock.updateUser.mockReturnValue(throwError(() => ({ status: 409 })));
      confirmMock.confirm.mockResolvedValue(true);

      await component.submitChanges();

      expect(component.error).toBeTruthy();
    });

    it('should set error on other http error', async () => {
      setup();
      authMock.getCurrentUsername.mockReturnValue('alice');
      fixture.detectChanges();
      component.newUsername = 'newname';
      authMock.updateUser.mockReturnValue(throwError(() => ({ status: 500, message: 'Server error' })));
      confirmMock.confirm.mockResolvedValue(true);

      await component.submitChanges();

      expect(component.error).toBeTruthy();
    });
  });
});
