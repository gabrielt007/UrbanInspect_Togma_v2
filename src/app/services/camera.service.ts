import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

import { ResultadoFoto } from '../models/incidencia.model';

/**
 * Servicio de integración con @capacitor/camera y @capacitor/filesystem
 * para captura, previsualización y persistencia de fotos de incidencias.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  private readonly DIRECTORIO_FOTOS = 'incidencias_fotos';

  // ─── Captura desde Cámara ──────────────────────────────────────────

  /**
   * Captura una fotografía desde la cámara del dispositivo.
   * Retorna el dataUrl de la imagen real para su uso directo en la vista y en el payload.
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
        let rutaPersistente: string | undefined;
        if (Capacitor.isNativePlatform() && foto.base64String) {
          rutaPersistente = await this.guardarFotoPersistente(foto);
        }
        return {
          dataUrl: foto.dataUrl,
          rutaPersistente,
        };
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
        let rutaPersistente: string | undefined;
        if (Capacitor.isNativePlatform() && foto.base64String) {
          rutaPersistente = await this.guardarFotoPersistente(foto);
        }
        return {
          dataUrl: foto.dataUrl,
          rutaPersistente,
        };
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

  // ─── Persistencia opcional nativa ──────────────────────────────────

  private async guardarFotoPersistente(foto: Photo): Promise<string> {
    const nombreArchivo = `${this.DIRECTORIO_FOTOS}/INC_${Date.now()}.${foto.format || 'jpeg'}`;
    if (!Capacitor.isNativePlatform() || !foto.base64String) {
      return nombreArchivo;
    }

    try {
      await Filesystem.writeFile({
        path: nombreArchivo,
        data: foto.base64String,
        directory: Directory.Data,
        recursive: true,
      });
    } catch (fsErr) {
      console.warn('Filesystem no pudo persistir el archivo nativamente:', fsErr);
    }

    return nombreArchivo;
  }
}
