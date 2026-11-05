import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

import type { ResultadoFoto } from '../models/incidencia.model';

/**
 * Servicio de captura de imágenes que se previsualizan y suben a Cloudinary.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  // ─── Captura desde Cámara ──────────────────────────────────────────

  /**
   * Captura una fotografía desde la cámara del dispositivo.
   * Retorna un DataUrl temporal para la previsualización y la subida a Cloudinary.
   */
  async capturarFoto(): Promise<ResultadoFoto> {
    try {
      if (Capacitor.isNativePlatform()) {
        await this.verificarPermisos();
      }

      const foto: Photo = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
        width: 600,
      });

      if (foto?.dataUrl) {
        return { dataUrl: foto.dataUrl };
      }

      return { dataUrl: '' };
    } catch (error) {
      console.warn('Captura de foto cancelada o no disponible en este entorno:', error);
      return { dataUrl: '' };
    }
  }

  // ─── Selección desde Galería ────────────────────────────────────────

  /**
   * Selecciona una fotografía desde la galería del dispositivo.
   */
  async seleccionarDeGaleria(): Promise<ResultadoFoto> {
    try {
      const foto: Photo = await Camera.getPhoto({
        quality: 60,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
        width: 600,
      });

      if (foto?.dataUrl) {
        return { dataUrl: foto.dataUrl };
      }

      return { dataUrl: '' };
    } catch (error) {
      console.warn('Selección de galería cancelada o no disponible:', error);
      return { dataUrl: '' };
    }
  }

  // ─── Gestión de permisos ───────────────────────────────────────────

  private async verificarPermisos(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const permisos = await Camera.checkPermissions();
      if (permisos.camera !== 'granted') {
        await Camera.requestPermissions({ permissions: ['camera'] });
      }
    } catch (err) {
      console.warn('Verificación de permisos de cámara omitida:', err);
    }
  }

}
