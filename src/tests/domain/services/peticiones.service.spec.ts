import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PeticionesService, BookRequestDto } from '../../../app/domain/services/peticiones.service';

/**
 * Pruebas unitarias para PeticionesService.
 */
describe('PeticionesService', () => {
  let service: PeticionesService;
  let httpMock: HttpTestingController;

  /**
   * Configuración antes de cada prueba.
   */
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PeticionesService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PeticionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  /**
   * Verificación después de cada prueba.
   */
  afterEach(() => {
    httpMock.verify();
  });

  /**
   * Verifica que el servicio se crea correctamente.
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Verifica que create realiza un POST a /requests.
   */
  it('create should POST to /requests', () => {
    let result: BookRequestDto | null = null;
    service.create({ title: 'Dune', author: 'Herbert' }).subscribe(r => (result = r));
    const req = httpMock.expectOne('/requests');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Dune', author: 'Herbert' });
    req.flush({ id: 1, title: 'Dune', author: 'Herbert' });
    expect(result).toEqual({ id: 1, title: 'Dune', author: 'Herbert' });
  });

  /**
   * Verifica que getAll realiza un GET a /requests.
   */
  it('getAll should GET from /requests', () => {
    const mockRequests: BookRequestDto[] = [
      { id: 1, title: 'Dune', author: 'Herbert' },
      { id: 2, title: '1984', author: 'Orwell' },
    ];
    let result: BookRequestDto[] | null = null;
    service.getAll().subscribe(r => (result = r));
    const req = httpMock.expectOne('/requests');
    expect(req.request.method).toBe('GET');
    req.flush(mockRequests);
    expect(result).toEqual(mockRequests);
  });

  /**
   * Verifica que delete realiza un DELETE a /requests/:id.
   */
  it('delete should DELETE /requests/:id', () => {
    let completed = false;
    service.delete(5).subscribe(() => (completed = true));
    const req = httpMock.expectOne('/requests/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expect(completed).toBe(true);
  });
});
