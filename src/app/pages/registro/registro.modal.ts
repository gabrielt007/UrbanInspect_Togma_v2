import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonList, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonTextarea, IonIcon, IonSpinner, IonImg, IonNote,
  IonGrid, IonRow, IonCol, IonChip,
  ModalController, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  closeOutline, cameraOutline, locationOutline,
  cloudOutline, saveOutline, imageOutline, warningOutline,
  informationCircleOutline, checkmarkCircleOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../../services/incidencias.service';
import { CameraService } from '../../services/camera.service';
import { LocationService, COORDENADAS_QUITO_DEFAULT } from '../../services/location.service';
import { WeatherService } from '../../services/weather.service';
import { StorageService } from '../../services/storage.service';
import {
  CategoriaIncidencia,
  PrioridadIncidencia,
  Coordenadas,
  DatosClima,
  Incidencia,
} from '../../models/incidencia.model';

/**
 * Modal de Registro de Incidencia
 *
 * Flujo optimizado:
 *  Formulario -> Payload -> MockAPI
 *  - Sin duplicación tipo/categoría ni foto/fotografía.
 *  - Preserva íntegramente la imagen capturada.
 *  - Validación limpia sin redundancias.
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
export class RegistroModal implements OnInit {
  private readonly modalCtrl = inject(ModalController);
  private readonly toastCtrl = inject(ToastController);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly cameraService = inject(CameraService);
  private readonly locationService = inject(LocationService);
  private readonly weatherService = inject(WeatherService);
  private readonly storageService = inject(StorageService);

  /** Campos del formulario (canónicos y sin duplicados) */
  tipo: CategoriaIncidencia = 'bache';
  descripcion = '';
  direccion = '';
  sector = '';
  prioridad: PrioridadIncidencia = 'alta';

  /** Fotografía capturada (única fuente de verdad) */
  fotografia = '';

  /** Ubicación (R7) */
  coordenadas: Coordenadas | null = null;
  modoManual = false;
  latManual = '';
  lonManual = '';
  obteniendoGps = false;
  mensajeGpsError: string | null = null;

  /** Clima (R4) */
  clima: DatosClima | null = null;
  obteniendoClima = false;
  errorClima: string | null = null;

  /** Estado */
  guardando = false;
  borradorRecuperado = false;

  readonly categorias: CategoriaIncidencia[] = [
    'bache', 'alumbrado', 'basura', 'señalización', 'otro',
  ];

  readonly prioridades: PrioridadIncidencia[] = [
    'alta', 'media', 'baja',
  ];

  constructor() {
    addIcons({
      closeOutline, cameraOutline, locationOutline,
      cloudOutline, saveOutline, imageOutline, warningOutline,
      informationCircleOutline, checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    this.intentarRecuperarBorrador();
  }

  // ─── R8: Borradores ──────────────────────────────────────────────────

  private async intentarRecuperarBorrador(): Promise<void> {
    try {
      const borrador = await this.storageService.recuperarBorrador();
      if (borrador?.datos) {
        const d = borrador.datos;
        this.tipo = (d.tipo || d.categoria || 'bache') as CategoriaIncidencia;
        this.descripcion = d.descripcion ?? '';
        this.direccion = d.direccion ?? '';
        this.sector = d.sector ?? '';
        this.prioridad = d.prioridad ?? (this.tipo === 'bache' ? 'alta' : 'media');
        this.fotografia = d.fotografia || d.foto || '';

        if (d.coordenadas) {
          this.coordenadas = d.coordenadas;
          this.latManual = d.coordenadas.latitud.toString();
          this.lonManual = d.coordenadas.longitud.toString();
          this.obtenerClima(d.coordenadas.latitud, d.coordenadas.longitud);
        }
        this.borradorRecuperado = true;
      }
    } catch (e) {
      console.warn('No se pudo recuperar borrador:', e);
    }
  }

  async guardarBorrador(): Promise<void> {
    await this.storageService.guardarBorrador({
      tipo: this.tipo,
      descripcion: this.descripcion,
      direccion: this.direccion,
      sector: this.sector,
      prioridad: this.prioridad,
      fotografia: this.fotografia,
      coordenadas: this.coordenadas ?? undefined,
    });
  }

  // ─── R7: Ubicación GPS y Manual ─────────────────────────────────────

  async obtenerUbicacion(): Promise<void> {
    this.obteniendoGps = true;
    this.mensajeGpsError = null;

    try {
      const coords = await this.locationService.obtenerUbicacionActual();
      this.coordenadas = coords;
      this.latManual = coords.latitud.toString();
      this.lonManual = coords.longitud.toString();
      this.obtenerClima(coords.latitud, coords.longitud);
    } catch (err) {
      console.warn('Error al solicitar ubicación, usando respaldo Quito:', err);
      this.coordenadas = { ...COORDENADAS_QUITO_DEFAULT };
      this.latManual = COORDENADAS_QUITO_DEFAULT.latitud.toString();
      this.lonManual = COORDENADAS_QUITO_DEFAULT.longitud.toString();
      this.modoManual = true;
      this.obtenerClima(this.coordenadas.latitud, this.coordenadas.longitud);
    } finally {
      this.obteniendoGps = false;
      await this.guardarBorrador();
    }
  }

  onCoordenadasManualesChange(): void {
    const lat = parseFloat(this.latManual);
    const lon = parseFloat(this.lonManual);

    if (this.locationService.validarCoordenadas(lat, lon)) {
      this.coordenadas = { latitud: lat, longitud: lon };
      this.mensajeGpsError = null;
      this.obtenerClima(lat, lon);
      this.guardarBorrador();
    }
  }

  aplicarCoordenadasManuales(): void {
    this.onCoordenadasManualesChange();
  }

  tieneUbicacionValida(): boolean {
    if (this.coordenadas) return true;
    const lat = parseFloat(this.latManual);
    const lon = parseFloat(this.lonManual);
    return this.locationService.validarCoordenadas(lat, lon);
  }

  // ─── R4: OpenWeatherMap ─────────────────────────────────────────────

  private obtenerClima(lat: number, lon: number): void {
    this.obteniendoClima = true;
    this.errorClima = null;

    this.weatherService.obtenerClima(lat, lon).subscribe({
      next: (datos) => {
        this.clima = datos;
        this.obteniendoClima = false;
      },
      error: (err) => {
        console.warn('Servicio de clima no disponible:', err);
        this.clima = null;
        this.errorClima = 'No se pudo obtener el clima en tiempo real, pero puedes continuar con el registro.';
        this.obteniendoClima = false;
      },
    });
  }

  // ─── R6: Fotografía (Conservación directa de la foto capturada) ──────

  async capturarFoto(): Promise<void> {
    const resultado = await this.cameraService.capturarFoto();
    if (resultado?.dataUrl) {
      this.fotografia = resultado.dataUrl;
      await this.guardarBorrador();
    }
  }

  async seleccionarFoto(): Promise<void> {
    const resultado = await this.cameraService.seleccionarDeGaleria();
    if (resultado?.dataUrl) {
      this.fotografia = resultado.dataUrl;
      await this.guardarBorrador();
    }
  }

  eliminarFoto(): void {
    this.fotografia = '';
    this.guardarBorrador();
  }

  // ─── R5: Validación y Guardado ──────────────────────────────────────

  formularioValido(): boolean {
    const tieneDesc = this.descripcion.trim().length > 0;
    const tieneDir = this.direccion.trim().length > 0;

    if (!tieneDesc || !tieneDir) {
      return false;
    }

    // Obligatorio para baches
    if (this.tipo === 'bache') {
      return this.tieneUbicacionValida();
    }

    return true;
  }

  /**
   * Guarda la incidencia enviando el payload limpio a MockAPI.
   * Flujo directo: Formulario -> Payload -> MockAPI
   */
  guardar(): void {
    if (!this.formularioValido()) return;

    this.guardando = true;

    // Sincronizar coordenadas si se ingresaron en inputs manuales
    let coordsFinales = this.coordenadas;
    if (!coordsFinales && this.tieneUbicacionValida()) {
      coordsFinales = {
        latitud: parseFloat(this.latManual),
        longitud: parseFloat(this.lonManual),
      };
      this.coordenadas = coordsFinales;
    }

    // Payload unificado y sin campos duplicados
    const payload: Partial<Incidencia> = {
      tipo: this.tipo,
      descripcion: this.descripcion.trim(),
      direccion: this.direccion.trim(),
      sector: this.sector.trim() || 'Distrito Metropolitano de Quito',
      prioridad: this.prioridad,
      fotografia: this.fotografia,
      coordenadas: coordsFinales ?? undefined,
      clima: this.clima ?? undefined,
    };

    this.incidenciasService.crearIncidencia(payload).subscribe({
      next: async (creada) => {
        await this.storageService.limpiarBorrador();
        this.guardando = false;

        const toast = await this.toastCtrl.create({
          message: `Incidencia ${creada.codigo} guardada con éxito`,
          duration: 2500,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        this.modalCtrl.dismiss(creada, 'confirm');
      },
      error: async (err) => {
        console.error('Error al guardar en MockAPI:', err);
        this.guardando = false;
        const toast = await this.toastCtrl.create({
          message: 'Error de comunicación con MockAPI. Intenta nuevamente.',
          duration: 3500,
          color: 'danger',
          position: 'bottom',
        });
        await toast.present();
      },
    });
  }

  async cancelar(): Promise<void> {
    if (this.descripcion || this.direccion) {
      await this.guardarBorrador();
    }
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
