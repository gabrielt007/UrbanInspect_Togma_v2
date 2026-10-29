import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, map, tap, Subject } from 'rxjs';

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
 *  - R2, R3: Obtención paginada y reactividad del listado general.
 *  - R5: Creación de incidencias con todos los campos requeridos por MockAPI.
 *  - R9: Actualización de estados con observaciones e historial.
 */
@Injectable({ providedIn: 'root' })
export class IncidenciasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.mockApiUrl;

  /** Canal reactivo para notificar la creación de nuevas incidencias en tiempo real */
  private readonly incidenciaCreadaSubject = new Subject<Incidencia>();
  readonly incidenciaCreada$ = this.incidenciaCreadaSubject.asObservable();

  // ─── R3: Obtención paginada ──────────────────────────────────────────

  /**
   * Obtiene incidencias con paginación desde el servidor (MockAPI).
   *
   * @param page  Número de página (1-indexed).
   * @param limit Cantidad de items por página.
   * @returns Observable con el arreglo de incidencias.
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
   * Busca incidencias filtrando por código en MockAPI.
   */
  buscarPorCodigo(codigo: string): Observable<Incidencia[]> {
    const params = new HttpParams().set('codigo', codigo);
    return this.http.get<Incidencia[]>(this.apiUrl, { params });
  }

  // ─── R5: Creación de incidencias ─────────────────────────────────────

  /**
   * Envía una petición POST a la URL de MockAPI con todos los campos obligatorios:
   *  - codigo generado (INC-XXXXX)
   *  - tipo
   *  - descripcion
   *  - direccion
   *  - sector
   *  - fecha actual
   *  - estado ("pendiente")
   *  - prioridad ('alta' | 'media' | 'baja')
   *  - fotografia
   *  - coordenadas y clima (si aplican)
   *
   * Al finalizar con éxito, emite por `incidenciaCreada$` para actualizar
   * de forma inmediata el listado general en la aplicación.
   *
   * @param datos Datos de la nueva incidencia.
   * @returns Observable con la incidencia creada.
   */
  crearIncidencia(datos: Partial<Incidencia>): Observable<Incidencia> {
    const ahora = new Date().toISOString();
    const codigoGenerado = datos.codigo || this.generarCodigo();
    const tipo = datos.tipo || datos.categoria || 'otro';

    const nuevaIncidencia: Incidencia = {
      codigo: codigoGenerado,
      tipo: tipo,
      categoria: (datos.categoria || tipo) as any,
      titulo: datos.titulo || `${tipo.toUpperCase()} - ${datos.direccion || datos.sector || 'Incidencia'}`,
      descripcion: (datos.descripcion || '').trim(),
      direccion: (datos.direccion || '').trim(),
      sector: (datos.sector || '').trim(),
      fecha: datos.fecha || ahora,
      fechaCreacion: datos.fechaCreacion || datos.fecha || ahora,
      estado: 'pendiente',
      prioridad: datos.prioridad || 'media',
      fotografia: datos.fotografia || datos.foto || '',
      foto: datos.foto || datos.fotografia || '',
      coordenadas: datos.coordenadas,
      clima: datos.clima,
      cambiosEstado: [],
    };

    return this.http.post<Incidencia>(this.apiUrl, nuevaIncidencia).pipe(
      tap((creada) => {
        // Notificar a las pestañas suscritas (Listado General Tab2, Dashboard Tab1)
        this.notificarNuevaIncidencia(creada);
      }),
    );
  }

  /**
   * Notifica manualmente la creación de una incidencia a los suscriptores.
   */
  notificarNuevaIncidencia(incidencia: Incidencia): void {
    this.incidenciaCreadaSubject.next(incidencia);
  }

  // ─── R9: Actualización de estados con observaciones ──────────────────

  /**
   * Actualiza el estado de una incidencia y registra la transición con una
   * observación en el historial de cambios.
   *
   * @param id           ID de la incidencia.
   * @param nuevoEstado  Nuevo estado a asignar.
   * @param observacion  Justificación del cambio de estado.
   * @returns Observable con la incidencia actualizada.
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

  // ─── Utilidades ──────────────────────────────────────────────────────

  /**
   * Genera un código único con formato INC-XXXXXXXXX (timestamp base36).
   */
  generarCodigo(): string {
    return `INC-${Date.now().toString(36).toUpperCase()}`;
  }
}
