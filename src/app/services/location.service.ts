import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';

import { Coordenadas } from '../models/incidencia.model';

/**
 * Servicio de integración con geolocalización.
 *
 * Soporta:
 *  - R7: Obtención del GPS actual con fallback a coordenadas manuales
 *        (obligatorio para incidencias de tipo 'bache').
 *  - Manejo de errores robusto (try/catch) compatible con entornos web y emuladores.
 *  - Fallback a la API de Geolocation estándar del navegador si Capacitor falla.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  /** Tiempo máximo de espera para obtener la posición por GPS (ms) */
  private readonly TIMEOUT_GPS = 8_000;

  // ─── Obtención de ubicación ──────────────────────────────────────────

  /**
   * Obtiene la posición GPS actual del dispositivo o emulador.
   * Maneja errores exhaustivamente y retorna null si el GPS no está disponible,
   * permitiendo al componente activar de inmediato el ingreso manual.
   *
   * @returns Coordenadas del dispositivo o `null` si falla.
   */
  async obtenerUbicacionActual(): Promise<Coordenadas | null> {
    // 1. Intentar primero con Capacitor Geolocation
    try {
      await this.verificarPermisos();

      const posicion: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: this.TIMEOUT_GPS,
        maximumAge: 10_000,
      });

      if (posicion?.coords?.latitude !== undefined && posicion?.coords?.longitude !== undefined) {
        return {
          latitud: Number(posicion.coords.latitude.toFixed(6)),
          longitud: Number(posicion.coords.longitude.toFixed(6)),
        };
      }
    } catch (capError) {
      console.warn('Capacitor Geolocation no disponible o falló en este entorno:', capError);
    }

    // 2. Fallback robusto para navegador web y emuladores usando navigator.geolocation nativo
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const coordsNativas = await new Promise<Coordenadas | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (pos?.coords) {
                resolve({
                  latitud: Number(pos.coords.latitude.toFixed(6)),
                  longitud: Number(pos.coords.longitude.toFixed(6)),
                });
              } else {
                resolve(null);
              }
            },
            (err) => {
              console.warn('navigator.geolocation fallback también falló:', err.message);
              resolve(null);
            },
            {
              enableHighAccuracy: false,
              timeout: 6_000,
              maximumAge: 15_000,
            },
          );
        });

        if (coordsNativas) {
          return coordsNativas;
        }
      }
    } catch (webError) {
      console.warn('Error en fallback web de geolocalización:', webError);
    }

    // Si fallan ambos, retorna null de forma segura para activar el modo manual
    return null;
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
      typeof lat === 'number' &&
      typeof lon === 'number' &&
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

    return {
      latitud: Number(lat.toFixed(6)),
      longitud: Number(lon.toFixed(6)),
    };
  }

  // ─── Gestión de permisos ─────────────────────────────────────────────

  /**
   * Verifica y solicita permisos de geolocalización de forma segura.
   * Atrapa excepciones para entornos que no implementan checkPermissions.
   */
  private async verificarPermisos(): Promise<void> {
    try {
      const permisos = await Geolocation.checkPermissions();

      if (permisos.location === 'denied') {
        throw new Error('Permiso de ubicación denegado en el dispositivo.');
      }

      if (permisos.location !== 'granted') {
        const solicitud = await Geolocation.requestPermissions({
          permissions: ['location'],
        });
        if (solicitud.location !== 'granted') {
          throw new Error('Permiso de ubicación no concedido por el usuario.');
        }
      }
    } catch (permError) {
      // Dejar propagar para que obtenerUbicacionActual pase al fallback web
      throw permError;
    }
  }

  /**
   * Verifica si el GPS está disponible y los permisos concedidos.
   */
  async gpsDisponible(): Promise<boolean> {
    try {
      const permisos = await Geolocation.checkPermissions();
      return permisos.location === 'granted';
    } catch {
      return typeof navigator !== 'undefined' && 'geolocation' in navigator;
    }
  }
}
