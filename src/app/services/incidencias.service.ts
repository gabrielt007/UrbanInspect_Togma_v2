import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, map, tap, Subject, of, timeout, catchError } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Incidencia,
  EstadoIncidencia,
  CambioEstado,
  CategoriaIncidencia,
} from '../models/incidencia.model';

/**
 * Servicio de conexión HTTP con MockAPI para gestionar incidencias.
 *
 * Flujo de creación:
 * Formulario -> Payload -> MockAPI
 * Conserva íntegramente los datos y la fotografía sin transformaciones redundantes.
 */
@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.mockApiUrl;

  /** Canal reactivo para notificar la creación de nuevas incidencias en tiempo real */
  private readonly incidenciaCreadaSubject = new Subject<Incidencia>();
  readonly incidenciaCreada$ = this.incidenciaCreadaSubject.asObservable();

  /** Canal reactivo para notificar la actualización de estados en tiempo real */
  private readonly incidenciaActualizadaSubject = new Subject<Incidencia>();
  readonly incidenciaActualizada$ = this.incidenciaActualizadaSubject.asObservable();

  // ─── Obtención de Incidencias ────────────────────────────────────────

  obtenerIncidencias(page: number = 1, limit: number = 10): Observable<Incidencia[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<Incidencia[]>(this.apiUrl, { params }).pipe(
      timeout(8_000),
      map((items) =>
        (items || []).map((i) => ({
          ...i,
          categoria: i.categoria || i.tipo,
          foto: i.foto || i.fotografia,
        })),
      ),
      catchError((error) => {
        console.warn('Error al obtener incidencias desde MockAPI:', error);
        return of([] as Incidencia[]);
      }),
    );
  }

  obtenerPorId(id: string): Observable<Incidencia> {
    return this.http.get<Incidencia>(`${this.apiUrl}/${id}`).pipe(
      timeout(8_000),
      map((i) =>
        i
          ? {
              ...i,
              categoria: i.categoria || i.tipo,
              foto: i.foto || i.fotografia,
            }
          : (null as unknown as Incidencia),
      ),
      catchError((error) => {
        console.warn(`Error al consultar incidencia ${id}:`, error);
        return of(null as unknown as Incidencia);
      }),
    );
  }

  buscarPorCodigo(codigo: string): Observable<Incidencia[]> {
    const termino = (codigo || '').trim();
    if (!termino) {
      return of([] as Incidencia[]);
    }

    const params = new HttpParams().set('search', termino);
    return this.http.get<Incidencia[]>(this.apiUrl, { params }).pipe(
      timeout(8_000),
      map((items) =>
        (items || [])
          .map((i) => ({
            ...i,
            categoria: i.categoria || i.tipo,
            foto: i.foto || i.fotografia,
          }))
          .filter((i) => {
            const termLower = termino.toLowerCase();
            return (
              i.codigo?.toLowerCase().includes(termLower) ||
              i.id?.toString() === termino ||
              (i.tipo || i.categoria)?.toLowerCase().includes(termLower)
            );
          }),
      ),
      catchError((error) => {
        console.warn('Error al buscar por código en MockAPI:', error);
        return of([] as Incidencia[]);
      }),
    );
  }

  // ─── Creación de Incidencias (Flujo directo sin duplicados) ──────────

  /**
   * Envía la incidencia a MockAPI conservando la fotografía capturada
   * y los campos unificados sin duplicaciones innecesarias:
   *  - tipo (único campo de categoría)
   *  - fotografia (único campo de imagen)
   *  - fecha (único campo temporal)
   */
  crearIncidencia(datos: Partial<Incidencia>): Observable<Incidencia> {
    const payload: Incidencia = {
      codigo: datos.codigo || this.generarCodigo(),
      tipo: (datos.tipo || datos.categoria || 'otro') as CategoriaIncidencia,
      descripcion: (datos.descripcion || '').trim(),
      direccion: (datos.direccion || '').trim(),
      sector: (datos.sector || '').trim(),
      fecha: datos.fecha || new Date().toISOString(),
      estado: 'pendiente',
      prioridad: datos.prioridad || 'media',
      fotografia: datos.fotografia || datos.foto || '',
      coordenadas: datos.coordenadas,
      clima: datos.clima,
      cambiosEstado: [],
    };

    return this.http.post<Incidencia>(this.apiUrl, payload).pipe(
      timeout(10_000),
      map((creada) => ({
        ...creada,
        categoria: creada.categoria || creada.tipo,
        foto: creada.foto || creada.fotografia,
      })),
      tap((creada) => {
        this.notificarNuevaIncidencia(creada);
      }),
    );
  }

  notificarNuevaIncidencia(incidencia: Incidencia): void {
    this.incidenciaCreadaSubject.next(incidencia);
  }

  // ─── Actualización de estados (R9) ───────────────────────────────────

  actualizarEstado(
    id: string,
    nuevoEstado: EstadoIncidencia,
    observacion: string,
  ): Observable<Incidencia> {
    return this.obtenerPorId(id).pipe(
      switchMap((incidencia) => {
        if (!incidencia) {
          throw new Error(`Incidencia ${id} no encontrada`);
        }

        const cambio: CambioEstado = {
          estadoAnterior: incidencia.estado || 'pendiente',
          estadoNuevo: nuevoEstado,
          observacion: observacion.trim(),
          fecha: new Date().toISOString(),
        };

        const payloadCompleto: Incidencia = {
          ...incidencia,
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString(),
          cambiosEstado: [...(incidencia.cambiosEstado ?? []), cambio],
        };

        return this.http.put<Incidencia>(`${this.apiUrl}/${id}`, payloadCompleto);
      }),
      timeout(10_000),
      map((actualizada) => ({
        ...actualizada,
        categoria: actualizada.categoria || actualizada.tipo,
        foto: actualizada.foto || actualizada.fotografia,
      })),
      tap((actualizada) => {
        this.notificarIncidenciaActualizada(actualizada);
      }),
    );
  }

  notificarIncidenciaActualizada(incidencia: Incidencia): void {
    this.incidenciaActualizadaSubject.next(incidencia);
  }

  generarCodigo(): string {
    return `INC-${Date.now().toString(36).toUpperCase()}`;
  }
}
