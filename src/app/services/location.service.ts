import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

import { Coordenadas } from '../models/incidencia.model';

/**
 * Coordenadas simuladas de respaldo para el Municipio de Quito (Distrito Metropolitano de Quito).
 * Utilizadas automáticamente si el GPS físico falla o en emulador/web.
 */
export const COORDENADAS_QUITO_DEFAULT: Coordenadas = {
  latitud: -0.180653,
  longitud: -78.467834,
};

/**
 * Servicio de integración con geolocalización.
 *
 * Implementa:
 *  - R7: Obtención de GPS actual o ingreso manual (obligatorio para baches).
 *  - Prevención de bloqueos con Capacitor.isNativePlatform() y try-catch exhaustivo.
 *  - Respaldo automático con coordenadas de Quito para entornos web o emuladores.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  /** Tiempo máximo de espera para obtener la posición por GPS (ms) */
  private readonly TIMEOUT_GPS = 5_000;

  // ─── Obtención de ubicación ──────────────────────────────────────────

  /**
   * Obtiene la posición GPS actual. Si se ejecuta en un navegador web o emulador
   * donde el plugin nativo falle, activa un respaldo automático con coordenadas
   * simuladas de Quito para evitar que la aplicación se detenga o lance excepciones fatales.
   *
   * @returns Coordenadas reales o de respaldo en Quito.
   */
  async obtenerUbicacionActual(): Promise<Coordenadas> {
    // 1. Intentar con Capacitor Geolocation si es plataforma nativa
    if (Capacitor.isNativePlatform()) {
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
        console.warn('Capacitor Geolocation nativo no disponible o falló:', capError);
      }
    }

    // 2. Si no es nativo o falló Capacitor, intentar con Geolocation nativo del navegador/WebView
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const coordsWeb = await new Promise<Coordenadas | null>((resolve) => {
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
              console.warn('navigator.geolocation fallback no respondió:', err.message);
              resolve(null);
            },
            {
              enableHighAccuracy: false,
              timeout: 4_000,
              maximumAge: 15_000,
            },
          );
        });

        if (coordsWeb) {
          return coordsWeb;
        }
      }
    } catch (webError) {
      console.warn('Error en fallback web de geolocalización:', webError);
    }

    // 3. Respaldo automático: Retorna coordenadas simuladas de Quito (Municipio de Quito)
    console.info('Activando respaldo automático: Coordenadas simuladas de Quito');
    return { ...COORDENADAS_QUITO_DEFAULT };
  }

  // ─── Validación de coordenadas manuales ──────────────────────────────

  /**
   * Valida que un par de coordenadas manuales sean geográficamente válidas.
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

  private async verificarPermisos(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const permisos = await Geolocation.checkPermissions();

      if (permisos.location !== 'granted') {
        await Geolocation.requestPermissions({
          permissions: ['location'],
        });
      }
    } catch (permError) {
      console.warn('No se pudieron verificar permisos de geolocalización de forma nativa:', permError);
    }
  }

  async gpsDisponible(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      const permisos = await Geolocation.checkPermissions();
      return permisos.location === 'granted';
    } catch {
      return false;
    }
  }
}
