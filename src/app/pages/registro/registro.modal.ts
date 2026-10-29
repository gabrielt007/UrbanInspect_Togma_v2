import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonIcon, IonSpinner, IonImg, IonNote,
  IonGrid, IonRow, IonCol, IonChip,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, cameraOutline, locationOutline,
  cloudOutline, saveOutline, imageOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../../services/incidencias.service';
import { CameraService } from '../../services/camera.service';
import { LocationService } from '../../services/location.service';
import { WeatherService } from '../../services/weather.service';
import { StorageService } from '../../services/storage.service';
import {
  CategoriaIncidencia,
  Coordenadas,
  DatosClima,
} from '../../models/incidencia.model';

/**
 * Modal de Registro de Incidencia
 *
 * Implementa:
 *  - R5: Creación de incidencias con todos los campos.
 *  - R6: Captura de foto con previsualización.
 *  - R7: Ubicación GPS automática o coordenadas manuales.
 *  - R8: Autoguardado de borrador para recuperación.
 *  - R4: Obtención automática del clima al fijar ubicación.
 */
@Component({
  selector: 'app-registro-modal',
  templateUrl: 'registro.modal.html',
  styleUrls: ['registro.modal.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
    IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
    IonTextarea, IonIcon, IonSpinner, IonImg, IonNote,
    IonGrid, IonRow, IonCol, IonChip,
  ],
})
export class RegistroModal {
  private readonly modalCtrl = inject(ModalController);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly cameraService = inject(CameraService);
  private readonly locationService = inject(LocationService);
  private readonly weatherService = inject(WeatherService);
  private readonly storageService = inject(StorageService);

  /** Campos del formulario */
  titulo = '';
  descripcion = '';
  categoria: CategoriaIncidencia = 'bache';

  /** Foto */
  fotoPreview: string | null = null;
  fotoData: string | null = null;

  /** Ubicación */
  coordenadas: Coordenadas | null = null;
  modoManual = false;
  latManual = '';
  lonManual = '';
  obteniendoGps = false;

  /** Clima */
  clima: DatosClima | null = null;
  obteniendoClima = false;

  /** Estado */
  guardando = false;
  borradorRecuperado = false;

  /** Categorías disponibles */
  readonly categorias: CategoriaIncidencia[] = [
    'bache', 'alumbrado', 'basura', 'señalización', 'otro',
  ];

  constructor() {
    addIcons({
      closeOutline, cameraOutline, locationOutline,
      cloudOutline, saveOutline, imageOutline,
    });
    this.intentarRecuperarBorrador();
  }

  // ─── R8: Recuperación de borrador ────────────────────────────────────

  /**
   * Intenta recuperar un borrador guardado previamente.
   */
  private async intentarRecuperarBorrador(): Promise<void> {
    const borrador = await this.storageService.recuperarBorrador();
    if (borrador?.datos) {
      this.titulo = borrador.datos.titulo ?? '';
      this.descripcion = borrador.datos.descripcion ?? '';
      this.categoria = borrador.datos.categoria ?? 'bache';
      if (borrador.datos.coordenadas) {
        this.coordenadas = borrador.datos.coordenadas;
      }
      this.borradorRecuperado = true;
    }
  }

  /**
   * Guarda el estado actual del formulario como borrador.
   */
  async guardarBorrador(): Promise<void> {
    await this.storageService.guardarBorrador({
      titulo: this.titulo,
      descripcion: this.descripcion,
      categoria: this.categoria,
      coordenadas: this.coordenadas ?? undefined,
    });
  }

  // ─── R7: Ubicación GPS ──────────────────────────────────────────────

  /**
   * Obtiene la ubicación GPS actual.
   * Si falla, activa el modo manual.
   */
  async obtenerUbicacion(): Promise<void> {
    this.obteniendoGps = true;
    this.modoManual = false;

    const coords = await this.locationService.obtenerUbicacionActual();

    if (coords) {
      this.coordenadas = coords;
      this.obtenerClima(coords.latitud, coords.longitud);
    } else {
      this.modoManual = true;
    }

    this.obteniendoGps = false;
    await this.guardarBorrador();
  }

  /**
   * Aplica coordenadas ingresadas manualmente.
   */
  async aplicarCoordenadasManuales(): Promise<void> {
    const lat = parseFloat(this.latManual);
    const lon = parseFloat(this.lonManual);

    if (!this.locationService.validarCoordenadas(lat, lon)) {
      return;
    }

    this.coordenadas = this.locationService.crearCoordenadasManuales(lat, lon);
    this.obtenerClima(lat, lon);
    await this.guardarBorrador();
  }

  // ─── R4: Clima ──────────────────────────────────────────────────────

  /**
   * Obtiene datos climáticos para las coordenadas dadas.
   */
  private obtenerClima(lat: number, lon: number): void {
    this.obteniendoClima = true;

    this.weatherService.obtenerClima(lat, lon).subscribe({
      next: (datos) => {
        this.clima = datos;
        this.obteniendoClima = false;
      },
      error: () => {
        this.clima = null;
        this.obteniendoClima = false;
      },
    });
  }

  // ─── R6: Captura de foto ────────────────────────────────────────────

  /**
   * Captura una foto desde la cámara.
   */
  async capturarFoto(): Promise<void> {
    try {
      const resultado = await this.cameraService.capturarFoto();
      this.fotoPreview = resultado.dataUrl;
      this.fotoData = resultado.dataUrl;
    } catch (error) {
      console.warn('Error al capturar foto:', error);
    }
  }

  /**
   * Selecciona una foto desde la galería.
   */
  async seleccionarFoto(): Promise<void> {
    try {
      const resultado = await this.cameraService.seleccionarDeGaleria();
      this.fotoPreview = resultado.dataUrl;
      this.fotoData = resultado.dataUrl;
    } catch (error) {
      console.warn('Error al seleccionar foto:', error);
    }
  }

  /**
   * Elimina la foto seleccionada.
   */
  eliminarFoto(): void {
    this.fotoPreview = null;
    this.fotoData = null;
  }

  // ─── R5: Envío del formulario ───────────────────────────────────────

  /**
   * Envía la incidencia al servidor.
   */
  guardar(): void {
    if (!this.formularioValido()) return;

    this.guardando = true;

    this.incidenciasService
      .crearIncidencia({
        titulo: this.titulo.trim(),
        descripcion: this.descripcion.trim(),
        categoria: this.categoria,
        coordenadas: this.coordenadas!,
        foto: this.fotoData ?? undefined,
        clima: this.clima ?? undefined,
      })
      .subscribe({
        next: async (creada) => {
          await this.storageService.limpiarBorrador();
          this.guardando = false;
          this.modalCtrl.dismiss(creada, 'confirm');
        },
        error: () => {
          this.guardando = false;
        },
      });
  }

  /**
   * Cierra el modal sin guardar, pero preserva el borrador.
   */
  async cancelar(): Promise<void> {
    if (this.titulo || this.descripcion) {
      await this.guardarBorrador();
    }
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /**
   * Valida que todos los campos obligatorios estén completos.
   * Las coordenadas son obligatorias siempre (especialmente para baches).
   */
  formularioValido(): boolean {
    return (
      this.titulo.trim().length > 0 &&
      this.descripcion.trim().length > 0 &&
      this.coordenadas !== null
    );
  }
}

