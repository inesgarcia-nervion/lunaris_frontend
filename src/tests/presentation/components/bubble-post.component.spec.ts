import { TestBed, ComponentFixture } from '@angular/core/testing';
import { BubblePostComponent, BubblePost } from '../../../app/presentation/components/bubble-post/bubble-post.component';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';

/**
 * Helper para crear objetos de prueba de BubblePost con valores predeterminados, permitiendo anular solo los campos necesarios para cada prueba.
 * @param overrides Un objeto parcial de BubblePost para anular los valores predeterminados.
 * @returns Un objeto completo de BubblePost con los valores predeterminados y las anulaciones aplicadas.
 */
const makePost = (overrides: Partial<BubblePost> = {}): BubblePost => ({
  id: 1,
  user: { name: 'Alice' },
  text: 'Hello world',
  likes: 3,
  liked: false,
  comments: [],
  ...overrides
});

/**
 * Pruebas para BubblePostComponent.
 */
describe('BubblePostComponent', () => {
  let component: BubblePostComponent;
  let fixture: ComponentFixture<BubblePostComponent>;
  let confirmServiceMock: { confirm: ReturnType<typeof vi.fn> };

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(() => {
    confirmServiceMock = { confirm: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [BubblePostComponent],
      providers: [{ provide: ConfirmService, useValue: confirmServiceMock }]
    });

    fixture = TestBed.createComponent(BubblePostComponent);
    component = fixture.componentInstance;
  });

  /**
   * Limpieza después de cada prueba.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para el getter de imágenes.
   */
  describe('images getter', () => {
    it('should return imageUrls when present and non-empty', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg'] });
      expect(component.images).toEqual(['a.jpg', 'b.jpg']);
    });

    it('should return [imageUrl] when imageUrls is absent but imageUrl is set', () => {
      component.post = makePost({ imageUrl: 'single.jpg' });
      expect(component.images).toEqual(['single.jpg']);
    });

    it('should return [] when neither imageUrls nor imageUrl is set', () => {
      component.post = makePost();
      expect(component.images).toEqual([]);
    });

    it('should return [] when imageUrls is empty array', () => {
      component.post = makePost({ imageUrls: [] });
      expect(component.images).toEqual([]);
    });
  });

  /**
   * Pruebas para showNextImage.
   */
  describe('showNextImage()', () => {
    it('should advance currentImageIndex', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'] });
      component.currentImageIndex = 0;
      component.showNextImage();
      expect(component.currentImageIndex).toBe(1);
    });

    it('should wrap around to 0 at the end', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg'] });
      component.currentImageIndex = 1;
      component.showNextImage();
      expect(component.currentImageIndex).toBe(0);
    });

    it('should do nothing when there are no images', () => {
      component.post = makePost();
      component.currentImageIndex = 0;
      component.showNextImage();
      expect(component.currentImageIndex).toBe(0);
    });

    it('should stop propagation if event is provided', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg'] });
      const event = { stopPropagation: vi.fn() } as any;
      component.showNextImage(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para showPrevImage.
   */
  describe('showPrevImage()', () => {
    it('should go to previous image', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'] });
      component.currentImageIndex = 2;
      component.showPrevImage();
      expect(component.currentImageIndex).toBe(1);
    });

    it('should wrap around to last image from first', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'] });
      component.currentImageIndex = 0;
      component.showPrevImage();
      expect(component.currentImageIndex).toBe(2);
    });

    it('should do nothing when there are no images', () => {
      component.post = makePost();
      component.currentImageIndex = 0;
      component.showPrevImage();
      expect(component.currentImageIndex).toBe(0);
    });

    it('should stop propagation if event is provided', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg'] });
      const event = { stopPropagation: vi.fn() } as any;
      component.showPrevImage(event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  /**
   * Pruebas para currentImageSrc.
   */
  describe('currentImageSrc()', () => {
    it('should return the current image url', () => {
      component.post = makePost({ imageUrls: ['a.jpg', 'b.jpg'] });
      component.currentImageIndex = 1;
      expect(component.currentImageSrc()).toBe('b.jpg');
    });

    it('should return undefined when no images', () => {
      component.post = makePost();
      expect(component.currentImageSrc()).toBeUndefined();
    });
  });

  /**
   * Pruebas para firstImageSrc.
   */
  describe('firstImageSrc()', () => {
    it('should return the first image url', () => {
      component.post = makePost({ imageUrls: ['first.jpg', 'second.jpg'] });
      expect(component.firstImageSrc()).toBe('first.jpg');
    });

    it('should return undefined when no images', () => {
      component.post = makePost();
      expect(component.firstImageSrc()).toBeUndefined();
    });
  });

  /**
   * Pruebas para onDeleteConfirm.
   */
  describe('onDeleteConfirm()', () => {
    it('should emit delete event when user confirms', async () => {
      component.post = makePost({ id: 42 });
      confirmServiceMock.confirm.mockResolvedValue(true);
      const emitted: number[] = [];
      component.delete.subscribe((id: number) => emitted.push(id));

      await component.onDeleteConfirm();

      expect(emitted).toContain(42);
    });

    it('should not emit delete event when user cancels', async () => {
      component.post = makePost({ id: 42 });
      confirmServiceMock.confirm.mockResolvedValue(false);
      const emitted: number[] = [];
      component.delete.subscribe((id: number) => emitted.push(id));

      await component.onDeleteConfirm();

      expect(emitted).toHaveLength(0);
    });
  });

  /**
   * Pruebas para onToggleLike.
   */
  describe('onToggleLike()', () => {
    it('should emit like event with post id', () => {
      component.post = makePost({ id: 7 });
      const emitted: number[] = [];
      component.like.subscribe((id: number) => emitted.push(id));

      component.onToggleLike();

      expect(emitted).toContain(7);
    });
  });

  /**
   * Pruebas para onEdit.
   */
  describe('onEdit()', () => {
    it('should emit edit event with post id', () => {
      component.post = makePost({ id: 5 });
      const emitted: number[] = [];
      component.edit.subscribe((id: number) => emitted.push(id));

      component.onEdit();

      expect(emitted).toContain(5);
    });
  });

  /**
   * Pruebas para onDelete.
   */
  describe('onDelete()', () => {
    it('should emit delete event with post id', () => {
      component.post = makePost({ id: 9 });
      const emitted: number[] = [];
      component.delete.subscribe((id: number) => emitted.push(id));

      component.onDelete();

      expect(emitted).toContain(9);
    });
  });

  /**
   * Pruebas para onOpen.
   */
  describe('onOpen()', () => {
    it('should emit open event with post object', () => {
      const post = makePost({ id: 3 });
      component.post = post;
      const emitted: BubblePost[] = [];
      component.open.subscribe((p: BubblePost) => emitted.push(p));

      component.onOpen();

      expect(emitted).toContain(post);
    });
  });

  /**
   * Pruebas para onMaybeOpen.
   */
  describe('onMaybeOpen()', () => {
    it('should call onOpen when clicking on non-interactive element', () => {
      component.post = makePost({ id: 1 });
      const emitted: BubblePost[] = [];
      component.open.subscribe((p: BubblePost) => emitted.push(p));

      const div = document.createElement('div');
      const event = { target: div } as any;
      component.onMaybeOpen(event);

      expect(emitted).toHaveLength(1);
    });

    it('should not call onOpen when clicking a button', () => {
      component.post = makePost({ id: 1 });
      const emitted: BubblePost[] = [];
      component.open.subscribe((p: BubblePost) => emitted.push(p));

      const button = document.createElement('button');
      const event = { target: button } as any;
      component.onMaybeOpen(event);

      expect(emitted).toHaveLength(0);
    });

    it('should not call onOpen when clicking a link', () => {
      component.post = makePost({ id: 1 });
      const emitted: BubblePost[] = [];
      component.open.subscribe((p: BubblePost) => emitted.push(p));

      const a = document.createElement('a');
      const event = { target: a } as any;
      component.onMaybeOpen(event);

      expect(emitted).toHaveLength(0);
    });

    it('should not call onOpen when clicking input', () => {
      component.post = makePost({ id: 1 });
      const emitted: BubblePost[] = [];
      component.open.subscribe((p: BubblePost) => emitted.push(p));

      const input = document.createElement('input');
      const event = { target: input } as any;
      component.onMaybeOpen(event);

      expect(emitted).toHaveLength(0);
    });

    it('should not call onOpen when target is null', () => {
      component.post = makePost({ id: 1 });
      const emitted: BubblePost[] = [];
      component.open.subscribe((p: BubblePost) => emitted.push(p));

      const event = { target: null } as any;
      component.onMaybeOpen(event);

      expect(emitted).toHaveLength(0);
    });
  });
});
