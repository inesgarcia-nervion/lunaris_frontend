import { TestBed, ComponentFixture } from '@angular/core/testing';
import { BubbleFeedComponent } from '../../../app/presentation/components/bubble-feed/bubble-feed.component';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from '../../../app/domain/services/auth.service';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { Subject } from 'rxjs';

/**
 * Tests para BubbleFeedComponent, enfocándose en la lógica de carga, paginación, selección de posts y manejo de comentarios.
 */
const STORAGE_KEY = 'lunaris.bubble.posts.v1';

/**
 * Crea un objeto de post con valores predeterminados, permitiendo anular propiedades específicas para pruebas.
 * @param id ID del post, por defecto es 1.
 * @param overrides Objeto con propiedades a anular en el post generado.
 * @returns Un objeto de post con las propiedades combinadas.
 */
const makePost = (id = 1, overrides: any = {}) => ({
  id,
  user: { name: 'Alice' },
  text: 'Hello',
  likes: 0,
  liked: false,
  comments: [],
  ...overrides
});

/**
 * Tests para BubbleFeedComponent, enfocándose en la lógica de carga, paginación, selección de posts y manejo de comentarios.
 */
describe('BubbleFeedComponent', () => {
  let component: BubbleFeedComponent;
  let fixture: ComponentFixture<BubbleFeedComponent>;
  let authMock: any;
  let confirmMock: any;
  let routerSpy: any;
  let locationMock: any;
  let paramsSubject: Subject<any>;

  /**
   * Configura el entorno de pruebas para BubbleFeedComponent, permitiendo inyectar posts en localStorage. 
   * @param postsInStorage Array de posts a almacenar en localStorage antes de la inicialización del componente.
   */
  function setup(postsInStorage: any[] = []) {
    localStorage.clear();
    if (postsInStorage.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(postsInStorage));
    }

    paramsSubject = new Subject();
    authMock = {
      getCurrentUsername: vi.fn().mockReturnValue('Alice'),
      getLocalAvatar: vi.fn().mockReturnValue(null),
      isAdmin: vi.fn().mockReturnValue(false)
    };
    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };
    routerSpy = { navigate: vi.fn() };
    locationMock = { go: vi.fn() };

    TestBed.configureTestingModule({
      imports: [BubbleFeedComponent],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: ConfirmService, useValue: confirmMock },
        { provide: Router, useValue: routerSpy },
        { provide: Location, useValue: locationMock },
        { provide: ActivatedRoute, useValue: { params: paramsSubject.asObservable() } }
      ]
    });

    fixture = TestBed.createComponent(BubbleFeedComponent);
    component = fixture.componentInstance;
  }

  /**
   * Limpia el entorno de pruebas después de cada test, restableciendo el módulo de pruebas, limpiando el localStorage y restableciendo los mocks.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para ngOnInit.
   */
  describe('ngOnInit', () => {
    /**
     * Verifica que se cargan los posts desde el localStorage.
     */
    it('should load posts from localStorage', () => {
      const stored = [makePost(1), makePost(2)];
      setup(stored);
      fixture.detectChanges();

      expect(component.posts).toHaveLength(2);
    });

    /**
     * Verifica que se establece el post seleccionado a partir del parámetro de la ruta.
     */
    it('should set selected post from route param', () => {
      const stored = [makePost(10)];
      setup(stored);
      fixture.detectChanges();

      paramsSubject.next({ id: '10' });

      expect(component.selected?.id).toBe(10);
    });

    /**
     * Verifica que se borra el post seleccionado cuando no hay un ID en los parámetros de la ruta.
     */
    it('should clear selected when route param id is absent', () => {
      setup([makePost(1)]);
      fixture.detectChanges();
      component.selected = makePost(1) as any;

      paramsSubject.next({});

      expect(component.selected).toBeUndefined();
    });
  });

  /**
   * Pruebas para ngOnDestroy.
   */
  describe('ngOnDestroy', () => {
    /**
     * Verifica que se restablece el overflow del body al destruir el componente.
     */
    it('should reset body overflow on destroy', () => {
      setup();
      fixture.detectChanges();
      document.body.style.overflow = 'hidden';

      component.ngOnDestroy();

      expect(document.body.style.overflow).toBe('');
    });
  });

  /**
   * Pruebas para updatePagination.
   */
  describe('updatePagination()', () => {
    /**
     * Verifica que se establecen correctamente los posts paginados.
     */
    it('should set pagedPosts correctly', () => {
      setup([makePost(1), makePost(2)]);
      fixture.detectChanges();

      expect(component.pagedPosts).toHaveLength(2);
    });

    /**
     * Verifica que se ajusta currentPage si excede el total de páginas.
     */
    it('should clamp currentPage if it exceeds total pages', () => {
      setup([makePost(1)]);
      fixture.detectChanges();
      component.currentPage = 99;
      component.updatePagination();

      expect(component.currentPage).toBe(1);
    });
  });

  /**
   * Pruebas para onPageChange.
   */
  describe('onPageChange()', () => {
    /**
     * Verifica que se actualiza currentPage y la paginación.
     */
    it('should update currentPage and pagination', () => {
      setup(Array.from({ length: 10 }, (_, i) => makePost(i + 1)));
      fixture.detectChanges();
      component.pageSize = 5;

      component.onPageChange(2);

      expect(component.currentPage).toBe(2);
    });
  });

  /**
   * Pruebas para toggleLike.
   */
  describe('toggleLike()', () => {
    /**
     * Verifica que se incrementan los likes al activar el toggle.
     */
    it('should increment likes when toggling on', () => {
      setup([makePost(1, { liked: false, likes: 0 })]);
      fixture.detectChanges();

      component.toggleLike(1);

      expect(component.posts[0].liked).toBe(true);
      expect(component.posts[0].likes).toBe(1);
    });

    /**
     * Verifica que se decrementan los likes al desactivar el toggle.
     */
    it('should decrement likes when toggling off', () => {
      setup([makePost(1, { liked: true, likes: 3 })]);
      fixture.detectChanges();

      component.toggleLike(1);

      expect(component.posts[0].liked).toBe(false);
      expect(component.posts[0].likes).toBe(2);
    });

    /**
     * Verifica que no ocurre nada cuando se pasa un postId desconocido.
     */
    it('should do nothing for unknown postId', () => {
      setup([makePost(1)]);
      fixture.detectChanges();

      expect(() => component.toggleLike(999)).not.toThrow();
    });
  });

  /**
   * Pruebas para openPost.
   */
  describe('openPost()', () => {
    /**
     * Verifica que se establece el post seleccionado correctamente.
     */
    it('should set selected to the given post', () => {
      setup();
      fixture.detectChanges();
      const post = makePost(5) as any;

      component.openPost(post);

      expect(component.selected).toBe(post);
    });
  });

  /**
   * Pruebas para closeDetail.
   */
  describe('closeDetail()', () => {
    /**
     * Verifica que se limpia el post seleccionado.
     */
    it('should clear selected', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1) as any;

      component.closeDetail();

      expect(component.selected).toBeUndefined();
    });
  });

  /**
   * Pruebas para selectedImages getter.
   */
  describe('selectedImages getter', () => {
    /**
     * Verifica que se devuelven las imageUrls cuando están presentes.
     */
    it('should return imageUrls when present', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1, { imageUrls: ['a.jpg', 'b.jpg'] }) as any;

      expect(component.selectedImages).toEqual(['a.jpg', 'b.jpg']);
    });

    /**
     * Verifica que se devuelve [imageUrl] cuando imageUrls está ausente.
     */
    it('should return [imageUrl] when imageUrls absent', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1, { imageUrl: 'x.jpg' }) as any;

      expect(component.selectedImages).toEqual(['x.jpg']);
    });

    /**
     * Verifica que se devuelve [] cuando no hay post seleccionado.
     */
    it('should return [] when no selected', () => {
      setup();
      fixture.detectChanges();
      component.selected = undefined;

      expect(component.selectedImages).toEqual([]);
    });
  });

  /**
   * Pruebas para showNextSelectedImage.
   */
  describe('showNextSelectedImage()', () => {
    /**
     * Verifica que se avanza al siguiente índice de imagen seleccionada.
     */
    it('should advance selectedImageIndex', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1, { imageUrls: ['a.jpg', 'b.jpg'] }) as any;
      component.selectedImageIndex = 0;

      component.showNextSelectedImage();

      expect(component.selectedImageIndex).toBe(1);
    });

    /**
     * Verifica que no ocurre nada cuando no hay imágenes.
     */
    it('should do nothing when no images', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1) as any;
      component.selectedImageIndex = 0;

      component.showNextSelectedImage();

      expect(component.selectedImageIndex).toBe(0);
    });
  });

  /**
   * Pruebas para showPrevSelectedImage.
   */
  describe('showPrevSelectedImage()', () => {
    /**
     * Verifica que se retrocede al índice de imagen anterior.
     */
    it('should go to last image when wrapping from first', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1, { imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'] }) as any;
      component.selectedImageIndex = 0;

      component.showPrevSelectedImage();

      expect(component.selectedImageIndex).toBe(2);
    });

    /**
     * Verifica que no ocurre nada cuando no hay imágenes.
     */
    it('should do nothing when no images', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1) as any;

      component.showPrevSelectedImage();

      expect(component.selectedImageIndex).toBe(0);
    });
  });

  /**
   * Pruebas para selectedImageSrc.
   */
  describe('selectedImageSrc()', () => {
    /**
     * Verifica que se devuelve la imagen seleccionada actual.
     */
    it('should return current selected image', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1, { imageUrls: ['a.jpg', 'b.jpg'] }) as any;
      component.selectedImageIndex = 1;

      expect(component.selectedImageSrc()).toBe('b.jpg');
    });

    /**
     * Verifica que se devuelve undefined cuando no hay imágenes.
     */
    it('should return undefined when no images', () => {
      setup();
      fixture.detectChanges();
      component.selected = makePost(1) as any;

      expect(component.selectedImageSrc()).toBeUndefined();
    });
  });

  /**
   * Pruebas para addComment.
   */
  describe('addComment()', () => {
    /**
     * Verifica que se agrega un comentario al post seleccionado.
     */
    it('should add comment to selected post', () => {
      setup([makePost(1)]);
      fixture.detectChanges();
      component.selected = component.posts[0];
      component.newCommentText = 'Great post!';

      component.addComment();

      expect(component.selected.comments).toHaveLength(1);
      expect(component.selected.comments![0].text).toBe('Great post!');
    });

    /**
     * Verifica que no se agrega un comentario cuando newCommentText está vacío.
     */
    it('should not add when newCommentText is empty', () => {
      setup([makePost(1)]);
      fixture.detectChanges();
      component.selected = component.posts[0];
      component.newCommentText = '';

      component.addComment();

      expect(component.selected.comments).toHaveLength(0);
    });

    /**
     * Verifica que no se agrega un comentario cuando no hay un post seleccionado.
     */
    it('should not add when selected is undefined', () => {
      setup();
      fixture.detectChanges();
      component.selected = undefined;
      component.newCommentText = 'Test';

      expect(() => component.addComment()).not.toThrow();
    });
  });

  /**
   * Pruebas para deleteComment.
   */
  describe('deleteComment()', () => {
    /**
     * Verifica que se elimina un comentario cuando el usuario es el autor.
     */
    it('should remove comment when user is author', async () => {
      const comment = { id: 100, user: { name: 'Alice' }, text: 'hello' };
      const post = makePost(1, { comments: [comment] });
      setup([post]);
      fixture.detectChanges();
      authMock.getCurrentUsername.mockReturnValue('Alice');
      component.selected = component.posts[0];

      await component.deleteComment(100);

      expect(component.selected!.comments).toHaveLength(0);
    });

    /**
     * Verifica que no se elimina un comentario cuando el usuario no es el autor ni administrador.
     */
    it('should not remove comment when user is not author and not admin', async () => {
      const comment = { id: 100, user: { name: 'Bob' }, text: 'hi' };
      const post = makePost(1, { comments: [comment] });
      setup([post]);
      fixture.detectChanges();
      authMock.getCurrentUsername.mockReturnValue('Alice');
      authMock.isAdmin.mockReturnValue(false);
      component.selected = component.posts[0];

      await component.deleteComment(100);

      expect(component.selected!.comments).toHaveLength(1);
    });

    /**
     * Verifica que no se lanza una excepción cuando el comentario no se encuentra.
     */
    it('should not throw when comment not found', async () => {
      setup([makePost(1)]);
      fixture.detectChanges();
      component.selected = component.posts[0];

      await expect(component.deleteComment(999)).resolves.not.toThrow();
    });

    /**
     * Verifica que no se lanza una excepción cuando no hay un post seleccionado.
     */
    it('should do nothing when selected is null', async () => {
      setup();
      fixture.detectChanges();
      component.selected = undefined;

      await expect(component.deleteComment(1)).resolves.not.toThrow();
    });
  });

  /**
   * Pruebas para confirmRemovePost y cancelRemovePost.
   */
  describe('confirmRemovePost() / cancelRemovePost()', () => {
    /**
     * Verifica que se establece el ID del post pendiente de eliminar.
     */
    it('should set pendingDeleteId', () => {
      setup();
      fixture.detectChanges();

      component.confirmRemovePost(42);

      expect(component.pendingDeleteId).toBe(42);
    });

    /**
     * Verifica que se limpia el ID del post pendiente de eliminar al cancelar.
     */
    it('should clear pendingDeleteId on cancel', () => {
      setup();
      fixture.detectChanges();
      component.pendingDeleteId = 42;

      component.cancelRemovePost();

      expect(component.pendingDeleteId).toBeNull();
    });
  });

  /**
   * Pruebas para removeConfirmedPost.
   */
  describe('removeConfirmedPost()', () => {
    /**
     * Verifica que se elimina un post cuando el usuario es el autor.
     */
    it('should remove post when user is author', () => {
      setup([makePost(1, { user: { name: 'Alice' } })]);
      fixture.detectChanges();
      authMock.getCurrentUsername.mockReturnValue('Alice');
      authMock.isAdmin.mockReturnValue(false);

      component.removeConfirmedPost(1);

      expect(component.posts.find(p => p.id === 1)).toBeUndefined();
    });

    /**
     * Verifica que se elimina un post cuando el usuario es administrador, incluso si no es el autor.
     */
    it('should remove post as admin even if not author', () => {
      setup([makePost(1, { user: { name: 'Bob' } })]);
      fixture.detectChanges();
      authMock.getCurrentUsername.mockReturnValue('Alice');
      authMock.isAdmin.mockReturnValue(true);

      component.removeConfirmedPost(1);

      expect(component.posts.find(p => p.id === 1)).toBeUndefined();
    });

    /**
     * Verifica que no se elimina un post cuando el usuario no es el autor ni administrador.
     */
    it('should not remove post when neither author nor admin', () => {
      setup([makePost(1, { user: { name: 'Bob' } })]);
      fixture.detectChanges();
      authMock.getCurrentUsername.mockReturnValue('Alice');
      authMock.isAdmin.mockReturnValue(false);

      component.removeConfirmedPost(1);

      expect(component.posts.find(p => p.id === 1)).toBeDefined();
    });

    /**
     * Verifica que se limpia el post seleccionado si coincide con el post eliminado.
     */
    it('should clear selected if it matches the removed post', () => {
      setup([makePost(1, { user: { name: 'Alice' } })]);
      fixture.detectChanges();
      authMock.getCurrentUsername.mockReturnValue('Alice');
      component.selected = component.posts[0];

      component.removeConfirmedPost(1);

      expect(component.selected).toBeUndefined();
    });

    /**
     * Verifica que no se lanza una excepción cuando se intenta eliminar un post desconocido.
     */
    it('should do nothing for unknown post id', () => {
      setup([makePost(1)]);
      fixture.detectChanges();

      expect(() => component.removeConfirmedPost(999)).not.toThrow();
    });
  });

  /**
   * Pruebas para openCreate y cancelCreate.
   */
  describe('openCreate() / cancelCreate()', () => {
    /**
     * Verifica que se establece creating en true al abrir la creación.
     */
    it('should set creating to true on openCreate', () => {
      vi.useFakeTimers();
      setup();
      fixture.detectChanges();

      component.openCreate();
      vi.advanceTimersByTime(55);

      expect(component.creating).toBe(true);
      vi.useRealTimers();
    });

    /**
     * Verifica que se establece creating en false al cancelar la creación.
     */
    it('should set creating to false on cancelCreate', () => {
      setup();
      fixture.detectChanges();
      component.creating = true;

      component.cancelCreate();

      expect(component.creating).toBe(false);
    });
  });

  /**
   * Pruebas para deleteImage.
   */
  describe('deleteImage()', () => {
    /**
     * Verifica que se elimina una imagen en el índice especificado.
     */
    it('should remove image at index', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg', 'b.jpg', 'c.jpg'];

      component.deleteImage(1);

      expect(component.newImagePreviews).toEqual(['a.jpg', 'c.jpg']);
    });

    /**
     * Verifica que no se realiza ninguna acción cuando el índice está fuera de los límites.
     */
    it('should do nothing for out-of-bounds index', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg'];

      component.deleteImage(5);

      expect(component.newImagePreviews).toEqual(['a.jpg']);
    });
  });

  /**
   * Pruebas para selectNewImage.
   */
  describe('selectNewImage()', () => {
    /**
     * Verifica que se establece newImagePreviewIndex al seleccionar una nueva imagen.
     */
    it('should set newImagePreviewIndex', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg', 'b.jpg'];

      component.selectNewImage(1);

      expect(component.newImagePreviewIndex).toBe(1);
    });

    /**
     * Verifica que no se actualiza newImagePreviewIndex para un índice fuera de los límites.
     */
    it('should not update for out-of-bounds index', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg'];
      component.newImagePreviewIndex = 0;

      component.selectNewImage(5);

      expect(component.newImagePreviewIndex).toBe(0);
    });
  });

  /**
   * Pruebas para showNextNewImage y showPrevNewImage.
   */
  describe('showNextNewImage() / showPrevNewImage()', () => {
    /**
     * Verifica que se avanza el índice de la vista previa de la nueva imagen.
     */
    it('should advance newImagePreviewIndex', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg', 'b.jpg'];
      component.newImagePreviewIndex = 0;

      component.showNextNewImage();

      expect(component.newImagePreviewIndex).toBe(1);
    });

    /**
     * Verifica que el índice no cambia cuando solo hay una imagen.
     */
    it('should not change index when only one image', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg'];
      component.newImagePreviewIndex = 0;

      component.showNextNewImage();

      expect(component.newImagePreviewIndex).toBe(0);
    });

    /**
     * Verifica que se retrocede el índice de la vista previa de la nueva imagen.
     */
    it('showPrevNewImage should go back', () => {
      setup();
      fixture.detectChanges();
      component.newImagePreviews = ['a.jpg', 'b.jpg'];
      component.newImagePreviewIndex = 1;

      component.showPrevNewImage();

      expect(component.newImagePreviewIndex).toBe(0);
    });
  });

  /**
   * Pruebas para onPostInput.
   */
  describe('onPostInput()', () => {
    /**
     * Verifica que se actualiza newText desde el elemento.
     */
    it('should update newText from element', () => {
      setup();
      fixture.detectChanges();
      const el = document.createElement('div');
      el.textContent = 'Some text';

      component.onPostInput(el);

      expect(component.newText).toBe('Some text');
    });
  });

  /**
   * Pruebas para onCommentInput.
   */
  describe('onCommentInput()', () => {
    /**
     * Verifica que se actualiza newCommentText desde el elemento.
     */
    it('should update newCommentText from element', () => {
      setup();
      fixture.detectChanges();
      const el = document.createElement('div');
      el.textContent = 'A comment';

      component.onCommentInput(el);

      expect(component.newCommentText).toBe('A comment');
    });
  });

  /**
   * Pruebas para canSendComment.
   */
  describe('canSendComment()', () => {
    /**
     * Verifica que canSendComment devuelve false cuando newCommentText está vacío.
     */
    it('should return false when newCommentText is empty', () => {
      setup();
      fixture.detectChanges();
      component.newCommentText = '';
      expect(component.canSendComment()).toBe(false);
    });

    /**
     * Verifica que canSendComment devuelve true cuando newCommentText tiene contenido.
     */
    it('should return true when newCommentText has content', () => {
      setup();
      fixture.detectChanges();
      component.newCommentText = 'hello';
      expect(component.canSendComment()).toBe(true);
    });

    /**
     * Verifica que canSendComment devuelve false cuando newCommentText solo contiene espacios en blanco.
     */
    it('should return false for whitespace only', () => {
      setup();
      fixture.detectChanges();
      component.newCommentText = '   ';
      expect(component.canSendComment()).toBe(false);
    });
  });

  /**
   * Pruebas para onPostKeydown.
   */
  describe('onPostKeydown()', () => {
    /**
     * Verifica que se previene la acción por defecto si la longitud del texto excede 1000 y no es una tecla de control.
     */
    it('should prevent default if text length exceeds 1000 and not control key', () => {
      setup();
      fixture.detectChanges();
      component.newText = 'a'.repeat(1001);
      const el = document.createElement('div');
      el.textContent = component.newText;
      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      const preventDefault = vi.spyOn(event, 'preventDefault');

      component.onPostKeydown(event, el);

      expect(preventDefault).toHaveBeenCalled();
    });

    /**
     * Verifica que no se previene la acción por defecto para las teclas de control.
     */
    it('should not prevent default for control keys', () => {
      setup();
      fixture.detectChanges();
      component.newText = 'a'.repeat(1001);
      const el = document.createElement('div');
      el.textContent = component.newText;
      const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
      const preventDefault = vi.spyOn(event, 'preventDefault');

      component.onPostKeydown(event, el);

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para onCommentKeydown.
   */
  describe('onCommentKeydown()', () => {
    /**
     * Verifica que no se lanza ninguna excepción al llamar a onCommentKeydown.
     */
    it('should not throw', () => {
      setup();
      fixture.detectChanges();
      const el = document.createElement('div');
      const event = new KeyboardEvent('keydown');

      expect(() => component.onCommentKeydown(event, el)).not.toThrow();
    });
  });

  /**
   * Pruebas para publish.
   */
  describe('publish()', () => {
    /**
     * Verifica que se crea un nuevo post cuando no se está editando.
     */
    it('should create a new post when not editing', () => {
      setup();
      fixture.detectChanges();
      component.newText = 'New post text';
      component.creating = true;
      component.editingId = null;

      component.publish();

      expect(component.posts).toHaveLength(1);
      expect(component.posts[0].text).toBe('New post text');
      expect(component.creating).toBe(false);
    });

    /**
     * Verifica que se actualiza un post existente cuando se está editando.
     */
    it('should update existing post when editing', () => {
      setup([makePost(1, { text: 'Old' })]);
      fixture.detectChanges();
      component.editingId = 1;
      component.newText = 'Updated';
      component.newImagePreviews = [];

      component.publish();

      expect(component.posts[0].text).toBe('Updated');
      expect(component.editingId).toBeNull();
    });

    /**
     * Verifica que no se hace nada cuando se está editando y no se encuentra el post.
     */
    it('should do nothing when editing and post not found', () => {
      setup();
      fixture.detectChanges();
      component.editingId = 999;
      component.newText = 'X';

      expect(() => component.publish()).not.toThrow();
    });
  });

  /**
   * Pruebas para startEdit.
   */
  describe('startEdit()', () => {
    /**
     * Verifica que se llenan los campos del formulario a partir del post.
     */
    it('should populate form fields from post', () => {
      vi.useFakeTimers();
      setup([makePost(1, { text: 'Edit me', imageUrls: ['a.jpg'] })]);
      fixture.detectChanges();

      component.startEdit(1);
      vi.advanceTimersByTime(55);

      expect(component.editingId).toBe(1);
      expect(component.newText).toBe('Edit me');
      expect(component.creating).toBe(true);
      vi.useRealTimers();
    });

    /**
     * Verifica que no se hace nada cuando no se encuentra el post.
     */
    it('should do nothing when post not found', () => {
      setup();
      fixture.detectChanges();

      expect(() => component.startEdit(999)).not.toThrow();
    });
  });

  /**
   * Pruebas para editHasChanges.
   */
  describe('editHasChanges()', () => {
    /**
     * Verifica que devuelve false cuando no se está editando.
     */
    it('should return false when not editing', () => {
      setup();
      fixture.detectChanges();
      component.editingId = null;

      expect(component.editHasChanges()).toBe(false);
    });

    /**
     * Verifica que devuelve true cuando el texto ha cambiado.
     */
    it('should return true when text changed', () => {
      setup([makePost(1, { text: 'Original' })]);
      fixture.detectChanges();
      component.editingId = 1;
      component.editOriginalText = 'Original';
      component.newText = 'Changed';

      expect(component.editHasChanges()).toBe(true);
    });

    /**
     * Verifica que devuelve false cuando no hay cambios.
     */
    it('should return false when nothing changed', () => {
      setup([makePost(1, { text: 'Same' })]);
      fixture.detectChanges();
      component.editingId = 1;
      component.editOriginalText = 'Same';
      component.newText = 'Same';
      component.editOriginalImagePreviews = [];
      component.newImagePreviews = [];

      expect(component.editHasChanges()).toBe(false);
    });
  });
});
