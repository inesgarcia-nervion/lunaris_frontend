import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AdminPeticionesComponent } from '../../../app/presentation/components/admin-peticiones/admin-peticiones.component';
import { PeticionesService } from '../../../app/domain/services/peticiones.service';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { of, throwError } from 'rxjs';

/**
 * Tests para AdminPeticionesComponent, enfocándose en la lógica de carga, paginación y eliminación de peticiones.
 */
const sampleRequests = [
  { id: 1, title: 'Harry Potter', author: 'Rowling' },
  { id: 2, title: 'Harry Potter', author: 'Rowling' },
  { id: 3, title: 'Dune', author: 'Herbert' }
];

/**
 * Tests para AdminPeticionesComponent, enfocándose en la lógica de carga, paginación y eliminación de peticiones.
 */
describe('AdminPeticionesComponent', () => {
  let component: AdminPeticionesComponent;
  let fixture: ComponentFixture<AdminPeticionesComponent>;
  let peticionesMock: any;
  let confirmMock: any;

  /**
   * Configura el entorno de pruebas para AdminPeticionesComponent, permitiendo inyectar peticiones personalizadas.
   * @param requests Lista de peticiones a usar en las pruebas, por defecto se usa sampleRequests.
   */
  function setup(requests = sampleRequests) {
    peticionesMock = {
      getAll: vi.fn().mockReturnValue(of(requests)),
      delete: vi.fn().mockReturnValue(of({}))
    };
    confirmMock = { confirm: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      imports: [AdminPeticionesComponent],
      providers: [
        { provide: PeticionesService, useValue: peticionesMock },
        { provide: ConfirmService, useValue: confirmMock }
      ]
    });

    fixture = TestBed.createComponent(AdminPeticionesComponent);
    component = fixture.componentInstance;
  }

  /**
   * Limpia el entorno de pruebas después de cada test.
   */
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  /**
   * Pruebas para ngOnInit y load.
   */
  describe('ngOnInit / load()', () => {
    /**
     * Verifica que se cargan las peticiones y se construyen los grupos al inicializar.
     */
    it('should load requests and build groups on init', () => {
      setup();
      fixture.detectChanges();

      expect(component.requests).toHaveLength(3);
      expect(component.groupedRequests).toHaveLength(2);
    });

    /**
     * Verifica que loading se establece en false después de cargar las peticiones.
     */
    it('should set loading=false after load', () => {
      setup();
      fixture.detectChanges();

      expect(component.loading).toBe(false);
    });

    /**
     * Verifica que se establece un error cuando la carga falla.
     */
    it('should set error on load failure', () => {
      setup();
      peticionesMock.getAll.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();

      expect(component.error).toBeTruthy();
      expect(component.loading).toBe(false);
    });
  });

  /**
   * Pruebas para updatePagination.
   */
  describe('updatePagination()', () => {
    /**
     * Verifica que se establecen correctamente las peticiones paginadas.
     */
    it('should set pagedRequests correctly', () => {
      setup();
      fixture.detectChanges();

      expect(component.pagedRequests).toHaveLength(2);
    });

    /**
     * Verifica que currentPage se ajusta cuando excede el total de páginas.
     */
    it('should clamp currentPage when exceeding total pages', () => {
      setup();
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
     * Verifica que se actualiza currentPage y se llama a updatePagination.
     */
    it('should update currentPage and pagination', () => {
      setup();
      fixture.detectChanges();

      component.onPageChange(1);

      expect(component.currentPage).toBe(1);
    });
  });

  /**
   * Pruebas para remove.
   */
  describe('remove()', () => {
    /**
     * Verifica que se establece un error cuando se proporciona un ID inválido.
     */
    it('should set error for invalid id (always)', async () => {
      setup();
      fixture.detectChanges();

      await component.remove(1);

      expect(component.error).toBeTruthy();
    });

    /**
     * Verifica que se establece un error cuando no se proporciona un ID.
     */
    it('should set error when no id provided', async () => {
      setup();
      fixture.detectChanges();

      await component.remove(undefined);

      expect(component.error).toBeTruthy();
    });
  });

  /**
   * Pruebas para removeGroup.
   */
  describe('removeGroup()', () => {
    /**
     * Verifica que se eliminan todas las solicitudes en un grupo cuando se confirma.
     */
    it('should delete all requests in a group when confirmed', async () => {
      setup();
      fixture.detectChanges();
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(true);

      await component.removeGroup(group);

      expect(peticionesMock.delete).toHaveBeenCalledTimes(group.ids.length);
    });

    /**
     * Verifica que no se eliminan las solicitudes cuando el usuario cancela.
     */
    it('should not delete when user cancels', async () => {
      setup();
      fixture.detectChanges();
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(false);

      await component.removeGroup(group);

      expect(peticionesMock.delete).not.toHaveBeenCalled();
    });

    /**
     * Verifica que se establece un error cuando no se proporciona un grupo.
     */
    it('should set error when group is undefined', async () => {
      setup();
      fixture.detectChanges();

      await component.removeGroup(undefined);

      expect(component.error).toBeTruthy();
    });

    /**
     * Verifica que se reconstruyen los grupos y se actualiza la paginación después de la eliminación.
     */
    it('should rebuild groups and update pagination after deletion', async () => {
      setup();
      fixture.detectChanges();
      const initialGroupCount = component.groupedRequests.length;
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(true);

      await component.removeGroup(group);

      expect(component.groupedRequests.length).toBeLessThan(initialGroupCount);
    });

    /**
     * Verifica que se borra deletingGroupKey después de la operación.
     */
    it('should clear deletingGroupKey after operation', async () => {
      setup();
      fixture.detectChanges();
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(true);

      await component.removeGroup(group);

      expect(component.deletingGroupKey).toBeNull();
    });

    /**
     * Verifica que se continúa eliminando otros IDs si uno falla.
     */
    it('should continue deleting other ids if one delete fails', async () => {
      setup();
      fixture.detectChanges();
      peticionesMock.delete
        .mockReturnValueOnce(throwError(() => new Error('fail')))
        .mockReturnValue(of({}));
      const group = component.groupedRequests.find(g => g.ids.length >= 2);
      if (!group) return; 
      confirmMock.confirm.mockResolvedValue(true);

      await expect(component.removeGroup(group)).resolves.not.toThrow();
    });
  });
});
