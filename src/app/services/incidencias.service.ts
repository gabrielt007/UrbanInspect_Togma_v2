import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  Incidencia,
  EstadoIncidencia,
  CambioEstado,
} from '../models/incidencia.model';

/**
 * Servicio de conexión HTTP con el MockAPI para gestionar incidencias.
 *
 * Soporta:
 *  - R3: Obtención con paginación desde el servidor.
 *  - R5: Creación de nuevas incidencias.
 *  - R9: Actualización de estados con observaciones.
 */
@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.mockApiUrl;

  // ─── R3: Obtención paginada ──────────────────────────────────────────

  /**
   * Obtiene incidencias con paginación desde el servidor (MockAPI).
   * MockAPI acepta `page` y `limit` como query params.
   *
   * @param page  Número de página (1-indexed).
   * @param limit Cantidad de items por página.
   * @returns Observable con el arreglo de incidencias de esa página.
   */
  obtenerIncidencias(page: number = 1, limit: number = 10): Observable<Incidencia[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<Incidencia[]>(this.apiUrl, { params });
  }

  /**
   * Obtiene una incidencia individual por su ID.
   */
  obtenerPorId(id: string): Observable<Incidencia> {
    return this.http.get<Incidencia>(`${this.apiUrl}/${id}`);
  }

  /**
   * Busca incidencias filtrando por código (búsqueda exacta en MockAPI).
   */
  buscarPorCodigo(codigo: string): Observable<Incidencia[]> {
    const params = new HttpParams().set('codigo', codigo);
    return this.http.get<Incidencia[]>(this.apiUrl, { params });
  }

  // ─── R5: Creación de incidencias ─────────────────────────────────────

  /**
   * Crea una nueva incidencia en el servidor.
   * Genera automáticamente un código único con prefijo 'INC-' y timestamp,
   * establece estado inicial 'pendiente' y marca fecha de creación.
   *
   * @param datos Datos parciales de la incidencia (sin id, código ni estado).
   * @returns Observable con la incidencia creada (incluye id del servidor).
   */
  crearIncidencia(datos: Omit<Incidencia, 'id' | 'codigo' | 'estado' | 'fechaCreacion'>): Observable<Incidencia> {
    const nuevaIncidencia: Omit<Incidencia, 'id'> = {
      ...datos,
      codigo: this.generarCodigo(),
      estado: 'pendiente',
      fechaCreacion: new Date().toISOString(),
      cambiosEstado: [],
    };

    return this.http.post<Incidencia>(this.apiUrl, nuevaIncidencia);
  }

  // ─── R9: Actualización de estados con observaciones ──────────────────

  /**
   * Actualiza el estado de una incidencia y registra la transición con una
   * observación en el historial de cambios.
   *
   * Flujo reactivo:
   *  1. GET la incidencia actual → conservar historial de cambios.
   *  2. Construir el nuevo CambioEstado con observación.
   *  3. PUT al servidor con estado, fecha y historial actualizados.
   *
   * @param id           ID de la incidencia.
   * @param nuevoEstado  Nuevo estado a asignar.
   * @param observacion  Justificación del cambio de estado.
   * @returns Observable con la incidencia actualizada desde el servidor.
   */
  actualizarEstado(
    id: string,
    nuevoEstado: EstadoIncidencia,
    observacion: string,
  ): Observable<Incidencia> {
    return this.obtenerPorId(id).pipe(
      map((incidencia) => {
        const cambio: CambioEstado = {
          estadoAnterior: incidencia.estado,
          estadoNuevo: nuevoEstado,
          observacion,
          fecha: new Date().toISOString(),
        };

        return {
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString(),
          cambiosEstado: [...(incidencia.cambiosEstado ?? []), cambio],
        };
      }),
      switchMap((payload) =>
        this.http.put<Incidencia>(`${this.apiUrl}/${id}`, payload),
      ),
    );
  }

  // ─── Utilidades privadas ─────────────────────────────────────────────

  /**
   * Genera un código único con formato INC-XXXXXXXXX (timestamp base36).
   */
  private generarCodigo(): string {
    return `INC-${Date.now().toString(36).toUpperCase()}`;
  }
}
