import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import { BorradorFormulario, Incidencia } from '../models/incidencia.model';

/**
 * Servicio de integración con @capacitor/preferences para persistencia
 * local ligera (key-value) en el dispositivo.
 *
 * Soporta:
 *  - R1: Gestión del seguimiento local de códigos de incidencias.
 *        Almacena la lista de códigos que el usuario sigue para consultas rápidas.
 *  - R8: Recuperación de borradores de formularios incompletos.
 *        Persiste automáticamente datos parciales del formulario de creación
 *        para que el usuario no pierda el progreso si la app se cierra.
 *
 * Nota: Preferences almacena strings. Los objetos se serializan/deserializan con JSON.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Clave para la lista de códigos seguidos */
  private readonly KEY_CODIGOS_SEGUIDOS = 'urban_codigos_seguidos';

  /** Clave para el borrador del formulario de creación */
  private readonly KEY_BORRADOR = 'urban_borrador_formulario';

  // ─── R1: Seguimiento de códigos ──────────────────────────────────────

  /**
   * Obtiene la lista de códigos de incidencias que el usuario sigue.
   *
   * @returns Arreglo de códigos (ej: ['INC-A1B2C3', 'INC-D4E5F6']).
   */
  async obtenerCodigosSeguidos(): Promise<string[]> {
    const { value } = await Preferences.get({ key: this.KEY_CODIGOS_SEGUIDOS });
    if (!value) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }

  /**
   * Agrega un código a la lista de seguimiento.
   * Evita duplicados automáticamente.
   *
   * @param codigo Código de incidencia a seguir.
   */
  async agregarCodigoSeguido(codigo: string): Promise<void> {
    const codigos = await this.obtenerCodigosSeguidos();

    if (!codigos.includes(codigo)) {
      codigos.push(codigo);
      await Preferences.set({
        key: this.KEY_CODIGOS_SEGUIDOS,
        value: JSON.stringify(codigos),
      });
    }
  }

  /**
   * Elimina un código de la lista de seguimiento.
   *
   * @param codigo Código de incidencia a dejar de seguir.
   */
  async eliminarCodigoSeguido(codigo: string): Promise<void> {
    const codigos = await this.obtenerCodigosSeguidos();
    const filtrados = codigos.filter((c) => c !== codigo);

    await Preferences.set({
      key: this.KEY_CODIGOS_SEGUIDOS,
      value: JSON.stringify(filtrados),
    });
  }

  /**
   * Verifica si un código está en la lista de seguimiento.
   *
   * @param codigo Código a verificar.
   * @returns `true` si el código está siendo seguido.
   */
  async codigoEstaSeguido(codigo: string): Promise<boolean> {
    const codigos = await this.obtenerCodigosSeguidos();
    return codigos.includes(codigo);
  }

  // ─── R8: Borradores de formularios ───────────────────────────────────

  /**
   * Guarda un borrador del formulario de creación de incidencia.
   * Se invoca periódicamente o al cambiar datos para no perder el progreso.
   *
   * @param datos Datos parciales del formulario.
   */
  async guardarBorrador(datos: Partial<Incidencia>): Promise<void> {
    const borrador: BorradorFormulario = {
      datos,
      timestamp: Date.now(),
    };

    await Preferences.set({
      key: this.KEY_BORRADOR,
      value: JSON.stringify(borrador),
    });
  }

  /**
   * Recupera el borrador del formulario, si existe y no ha expirado.
   * Los borradores expiran después de 24 horas.
   *
   * @returns Borrador guardado o `null` si no existe o expiró.
   */
  async recuperarBorrador(): Promise<BorradorFormulario | null> {
    const { value } = await Preferences.get({ key: this.KEY_BORRADOR });
    if (!value) {
      return null;
    }

    try {
      const borrador: BorradorFormulario = JSON.parse(value) as BorradorFormulario;
      const EXPIRACION_MS = 24 * 60 * 60 * 1000; // 24 horas

      if (Date.now() - borrador.timestamp > EXPIRACION_MS) {
        await this.limpiarBorrador();
        return null;
      }

      return borrador;
    } catch {
      await this.limpiarBorrador();
      return null;
    }
  }

  /**
   * Elimina el borrador guardado.
   * Se invoca al enviar exitosamente el formulario.
   */
  async limpiarBorrador(): Promise<void> {
    await Preferences.remove({ key: this.KEY_BORRADOR });
  }

  /**
   * Verifica si existe un borrador pendiente de recuperar.
   *
   * @returns `true` si hay un borrador válido (no expirado).
   */
  async tieneBorradorPendiente(): Promise<boolean> {
    const borrador = await this.recuperarBorrador();
    return borrador !== null;
  }

  // ─── Utilidades generales ────────────────────────────────────────────

  /**
   * Limpia todos los datos almacenados por la app en Preferences.
   * Usar con precaución (ej: cierre de sesión o reset completo).
   */
  async limpiarTodo(): Promise<void> {
    await Preferences.clear();
  }
}
