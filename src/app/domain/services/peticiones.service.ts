import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Este servicio gestiona las peticiones de libros en la aplicación, permitiendo crear 
 * nuevas peticiones, obtener todas las peticiones existentes y eliminar una petición 
 * por su ID.
 * 
 * Cada petición de libro tiene un ID único, título y autor. El servicio se comunica 
 * con un backend a través de HTTP para realizar las operaciones CRUD (Crear, Leer, Eliminar) 
 * relacionadas con las peticiones de libros.
 */
export interface BookRequestDto {
  id?: number;
  title: string;
  author: string;
}

/**
 * El servicio PeticionesService utiliza el HttpClient de Angular para realizar solicitudes HTTP al backend.
 * 
 * El método create() envía una solicitud POST para crear una nueva petición de libro, getAll() realiza una 
 * solicitud GET para obtener todas las peticiones existentes, y delete() envía una solicitud DELETE para 
 * eliminar una petición específica por su ID.
 */
@Injectable({ providedIn: 'root' })
export class PeticionesService {
  private base = '/requests';

  constructor(private http: HttpClient) {}

  /**
   * Crea una nueva petición de libro enviando una solicitud POST al backend. El objeto request debe contener 
   * el título y el autor del libro.
   * El método devuelve un Observable que emite el objeto BookRequestDto creado, incluyendo su ID asignado por 
   * el backend.
   * @param request El objeto que contiene el título y el autor del libro.
   * @returns Un Observable que emite el objeto BookRequestDto creado.
   */
  create(request: { title: string; author: string }): Observable<BookRequestDto> {
    return this.http.post<BookRequestDto>(this.base, request);
  }

  /**
   * Obtiene todas las peticiones de libros existentes enviando una solicitud GET al backend. El método devuelve un 
   * Observable que emite un array de objetos BookRequestDto, representando todas las peticiones de libros almacenadas 
   * en el backend.
   * @returns Un Observable que emite un array de objetos BookRequestDto.
   */
  getAll(): Observable<BookRequestDto[]> {
    return this.http.get<BookRequestDto[]>(this.base);
  }

  /**
   * Elimina una petición de libro específica por su ID enviando una solicitud DELETE al backend. El método devuelve un 
   * Observable que emite void, indicando que la operación de eliminación se ha completado.
   * @param id El ID de la petición de libro que se desea eliminar.
   * @returns Un Observable que emite void al completar la eliminación de la petición de libro.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
