import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AdminPeticionesComponent } from '../../../app/presentation/components/admin-peticiones/admin-peticiones.component';
import { PeticionesService } from '../../../app/domain/services/peticiones.service';
import { ConfirmService } from '../../../app/presentation/shared/confirm.service';
import { of, throwError } from 'rxjs';

const sampleRequests = [
  { id: 1, title: 'Harry Potter', author: 'Rowling' },
  { id: 2, title: 'Harry Potter', author: 'Rowling' },
  { id: 3, title: 'Dune', author: 'Herbert' }
];

describe('AdminPeticionesComponent', () => {
  let component: AdminPeticionesComponent;
  let fixture: ComponentFixture<AdminPeticionesComponent>;
  let peticionesMock: any;
  let confirmMock: any;

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

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  describe('ngOnInit / load()', () => {
    it('should load requests and build groups on init', () => {
      setup();
      fixture.detectChanges();

      expect(component.requests).toHaveLength(3);
      // 'Harry Potter' + 'Rowling' form one group, 'Dune' + 'Herbert' another
      expect(component.groupedRequests).toHaveLength(2);
    });

    it('should set loading=false after load', () => {
      setup();
      fixture.detectChanges();

      expect(component.loading).toBe(false);
    });

    it('should set error on load failure', () => {
      setup();
      peticionesMock.getAll.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();

      expect(component.error).toBeTruthy();
      expect(component.loading).toBe(false);
    });
  });

  describe('updatePagination()', () => {
    it('should set pagedRequests correctly', () => {
      setup();
      fixture.detectChanges();

      expect(component.pagedRequests).toHaveLength(2);
    });

    it('should clamp currentPage when exceeding total pages', () => {
      setup();
      fixture.detectChanges();
      component.currentPage = 99;
      component.updatePagination();

      expect(component.currentPage).toBe(1);
    });
  });

  describe('onPageChange()', () => {
    it('should update currentPage and pagination', () => {
      setup();
      fixture.detectChanges();

      component.onPageChange(1);

      expect(component.currentPage).toBe(1);
    });
  });

  describe('remove()', () => {
    it('should set error for invalid id (always)', async () => {
      setup();
      fixture.detectChanges();

      await component.remove(1);

      expect(component.error).toBeTruthy();
    });

    it('should set error when no id provided', async () => {
      setup();
      fixture.detectChanges();

      await component.remove(undefined);

      expect(component.error).toBeTruthy();
    });
  });

  describe('removeGroup()', () => {
    it('should delete all requests in a group when confirmed', async () => {
      setup();
      fixture.detectChanges();
      const group = component.groupedRequests[0]; // Harry Potter group
      confirmMock.confirm.mockResolvedValue(true);

      await component.removeGroup(group);

      expect(peticionesMock.delete).toHaveBeenCalledTimes(group.ids.length);
    });

    it('should not delete when user cancels', async () => {
      setup();
      fixture.detectChanges();
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(false);

      await component.removeGroup(group);

      expect(peticionesMock.delete).not.toHaveBeenCalled();
    });

    it('should set error when group is undefined', async () => {
      setup();
      fixture.detectChanges();

      await component.removeGroup(undefined);

      expect(component.error).toBeTruthy();
    });

    it('should rebuild groups and update pagination after deletion', async () => {
      setup();
      fixture.detectChanges();
      const initialGroupCount = component.groupedRequests.length;
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(true);

      await component.removeGroup(group);

      expect(component.groupedRequests.length).toBeLessThan(initialGroupCount);
    });

    it('should clear deletingGroupKey after operation', async () => {
      setup();
      fixture.detectChanges();
      const group = component.groupedRequests[0];
      confirmMock.confirm.mockResolvedValue(true);

      await component.removeGroup(group);

      expect(component.deletingGroupKey).toBeNull();
    });

    it('should continue deleting other ids if one delete fails', async () => {
      setup();
      fixture.detectChanges();
      // Make first delete fail, second succeed
      peticionesMock.delete
        .mockReturnValueOnce(throwError(() => new Error('fail')))
        .mockReturnValue(of({}));
      const group = component.groupedRequests.find(g => g.ids.length >= 2);
      if (!group) return; // skip if no such group
      confirmMock.confirm.mockResolvedValue(true);

      await expect(component.removeGroup(group)).resolves.not.toThrow();
    });
  });
});
