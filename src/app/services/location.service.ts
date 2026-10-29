import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';

import { Coordenadas } from '../models/incidencia.model';

/**
 * Servicio de integración con @capacitor/geolocation para obtener
 * la ubicación GPS del dispositivo.
 *
 * Soporta:
 *  - R7: Obtención del GPS actual con fallback a coordenadas manuales
 *        (obligatorio para incidencias de tipo 'bache').
 *
 * Flujo:
 *  1. Intenta obtener la posición GPS actual.
 *  2. Si falla (permisos denegados, GPS apagado, timeout), retorna null.
 *  3. El componente consumidor puede entonces solicitar coordenadas manuales.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  /** Tiempo máximo de espera para obtener la posición (ms) */
  private readonly TIMEOUT_GPS = 15_000;

  // ─── Obtención de ubicación ──────────────────────────────────────────

  /**
   * Obtiene la posición GPS actual del dispositivo.
   * Solicita permisos automáticamente si no los tiene.
   *
   * @returns Coordenadas del dispositivo o `null` si no se pudo obtener.
   */
  async obtenerUbicacionActual(): Promise<Coordenadas | null> {
    try {
      await this.verificarPermisos();

      const posicion: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: this.TIMEOUT_GPS,
      });

      return {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      };
    } catch (error) {
      console.warn('No se pudo obtener la ubicación GPS:', error);
      return null;
    }
  }

  // ─── Validación de coordenadas manuales ──────────────────────────────

  /**
   * Valida que un par de coordenadas manuales sean geográficamente válidas.
   *
   * @param lat Latitud ingresada manualmente.
   * @param lon Longitud ingresada manualmente.
   * @returns `true` si las coordenadas están en rangos válidos.
   */
  validarCoordenadas(lat: number, lon: number): boolean {
    return (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  /**
   * Crea un objeto Coordenadas a partir de valores manuales, validándolos.
   *
   * @param lat Latitud manual.
   * @param lon Longitud manual.
   * @returns Coordenadas válidas.
   * @throws Error si las coordenadas no son válidas.
   */
  crearCoordenadasManuales(lat: number, lon: number): Coordenadas {
    if (!this.validarCoordenadas(lat, lon)) {
      throw new Error(
        'Coordenadas inválidas. La latitud debe estar entre -90 y 90, ' +
        'y la longitud entre -180 y 180.',
      );
    }

    return { latitud: lat, longitud: lon };
  }

  // ─── Gestión de permisos ─────────────────────────────────────────────

  /**
   * Verifica y solicita permisos de geolocalización.
   * @throws Error si los permisos son denegados permanentemente.
   */
  private async verificarPermisos(): Promise<void> {
    const permisos = await Geolocation.checkPermissions();

    if (permisos.location === 'denied') {
      throw new Error(
        'Permiso de ubicación denegado permanentemente. ' +
        'Por favor, habilítalo en la configuración del dispositivo.',
      );
    }

    if (permisos.location !== 'granted') {
      const solicitud = await Geolocation.requestPermissions({
        permissions: ['location'],
      });
      if (solicitud.location !== 'granted') {
        throw new Error('Se requiere permiso de ubicación para registrar incidencias.');
      }
    }
  }

  /**
   * Verifica si el GPS está disponible y los permisos concedidos.
   * Útil para mostrar indicadores de estado en la UI.
   *
   * @returns `true` si se puede intentar obtener la ubicación.
   */
  async gpsDisponible(): Promise<boolean> {
    try {
      const permisos = await Geolocation.checkPermissions();
      return permisos.location === 'granted';
    } catch {
      return false;
    }
  }
}
