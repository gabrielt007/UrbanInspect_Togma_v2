import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

import { ResultadoFoto } from '../models/incidencia.model';

/**
 * Servicio de integración con @capacitor/camera y @capacitor/filesystem
 * para captura, previsualización y almacenamiento persistente de fotos.
 *
 * Soporta:
 *  - R6: Captura de fotos con previsualización, manejo de permisos
 *        y almacenamiento persistente en el dispositivo.
 *
 * Flujo:
 *  1. Solicita permisos de cámara y sistema de archivos.
 *  2. Captura la foto desde la cámara o galería.
 *  3. Guarda la foto de forma persistente en el Filesystem de Capacitor.
 *  4. Retorna tanto el dataUrl (para previsualización) como la ruta persistente.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {
  /** Directorio donde se almacenan las fotos de incidencias */
  private readonly DIRECTORIO_FOTOS = 'incidencias_fotos';

  // ─── Captura principal ───────────────────────────────────────────────

  /**
   * Captura una foto desde la cámara del dispositivo.
   * Solicita permisos automáticamente si no los tiene.
   *
   * @returns Promise con el dataUrl para previsualización y la ruta persistente.
   * @throws Error si el usuario deniega permisos o cancela la captura.
   */
  async capturarFoto(): Promise<ResultadoFoto> {
    await this.verificarPermisos();

    const foto: Photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
      width: 1024,
    });

    const dataUrl = `data:image/${foto.format};base64,${foto.base64String}`;
    const rutaPersistente = await this.guardarFotoPersistente(foto);

    return { dataUrl, rutaPersistente };
  }

  /**
   * Selecciona una foto desde la galería del dispositivo.
   *
   * @returns Promise con el dataUrl para previsualización y la ruta persistente.
   */
  async seleccionarDeGaleria(): Promise<ResultadoFoto> {
    const foto: Photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      correctOrientation: true,
      width: 1024,
    });

    const dataUrl = `data:image/${foto.format};base64,${foto.base64String}`;
    const rutaPersistente = await this.guardarFotoPersistente(foto);

    return { dataUrl, rutaPersistente };
  }

  // ─── Gestión de permisos ─────────────────────────────────────────────

  /**
   * Verifica y solicita permisos de cámara si no están concedidos.
   * @throws Error si los permisos son denegados permanentemente.
   */
  private async verificarPermisos(): Promise<void> {
    const permisos = await Camera.checkPermissions();

    if (permisos.camera === 'denied') {
      throw new Error(
        'Permiso de cámara denegado permanentemente. ' +
        'Por favor, habilítalo en la configuración del dispositivo.',
      );
    }

    if (permisos.camera !== 'granted') {
      const solicitud = await Camera.requestPermissions({ permissions: ['camera'] });
      if (solicitud.camera !== 'granted') {
        throw new Error('Se requiere permiso de cámara para capturar fotos.');
      }
    }
  }

  // ─── Almacenamiento persistente ──────────────────────────────────────

  /**
   * Guarda la foto capturada de forma persistente en el Filesystem de Capacitor.
   * Usa Directory.Data para asegurar que los archivos no se borren con la caché.
   *
   * @param foto Objeto Photo de Capacitor con base64String.
   * @returns Ruta relativa del archivo guardado.
   */
  private async guardarFotoPersistente(foto: Photo): Promise<string> {
    const nombreArchivo = `${this.DIRECTORIO_FOTOS}/INC_${Date.now()}.${foto.format}`;

    await Filesystem.writeFile({
      path: nombreArchivo,
      data: foto.base64String!,
      directory: Directory.Data,
      recursive: true,
    });

    return nombreArchivo;
  }

  /**
   * Lee una foto persistente previamente guardada y devuelve su dataUrl.
   * Útil para mostrar fotos almacenadas en el detalle de una incidencia.
   *
   * @param ruta Ruta relativa de la foto en Directory.Data.
   * @returns dataUrl base64 para mostrar en <img>.
   */
  async leerFotoPersistente(ruta: string): Promise<string> {
    const resultado = await Filesystem.readFile({
      path: ruta,
      directory: Directory.Data,
    });

    // Extraer la extensión del nombre del archivo para el MIME type
    const extension = ruta.split('.').pop() ?? 'jpeg';
    return `data:image/${extension};base64,${resultado.data}`;
  }

  /**
   * Elimina una foto persistente del almacenamiento.
   *
   * @param ruta Ruta relativa de la foto en Directory.Data.
   */
  async eliminarFoto(ruta: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: ruta,
        directory: Directory.Data,
      });
    } catch {
      // Si el archivo no existe, no es un error crítico
      console.warn(`No se pudo eliminar la foto: ${ruta}`);
    }
  }
}
