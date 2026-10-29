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
import { LocationService } from '../../services/location.service';
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
 * Implementa:
 *  - R5, R2, R3: Creación completa y sincronización en MockAPI.
 *  - R6: Captura de foto con almacenamiento persistente y preview.
 *  - R7: GPS con fallback robusto a coordenadas manuales (obligatorio para baches).
 *  - R4: OpenWeatherMap automático con advertencia si lluvia > 5mm y fallback no bloqueante.
 *  - R8: Autoguardado y recuperación de borradores.
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

  /** Campos obligatorios solicitados por MockAPI */
  tipo: CategoriaIncidencia = 'bache';
  titulo = '';
  descripcion = '';
  direccion = '';
  sector = '';
  prioridad: PrioridadIncidencia = 'alta';

  /** Fotografía */
  fotoPreview: string | null = null;
  fotoData: string | null = null;

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

  /** Estado de interfaz y borrador */
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
        this.titulo = d.titulo ?? '';
        this.descripcion = d.descripcion ?? '';
        this.direccion = d.direccion ?? '';
        this.sector = d.sector ?? '';
        this.prioridad = d.prioridad ?? (this.tipo === 'bache' ? 'alta' : 'media');
        this.fotoPreview = d.fotografia || d.foto || null;
        this.fotoData = this.fotoPreview;

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
      categoria: this.tipo,
      titulo: this.titulo,
      descripcion: this.descripcion,
      direccion: this.direccion,
      sector: this.sector,
      prioridad: this.prioridad,
      fotografia: this.fotoData ?? undefined,
      foto: this.fotoData ?? undefined,
      coordenadas: this.coordenadas ?? undefined,
    });
  }

  // ─── R7: Ubicación GPS y Manual ─────────────────────────────────────

  /**
   * Obtiene la posición GPS del dispositivo o emulador.
   * Manejo robusto: si falla, activa inmediatamente los campos de ingreso manual.
   */
  async obtenerUbicacion(): Promise<void> {
    this.obteniendoGps = true;
    this.mensajeGpsError = null;

    try {
      const coords = await this.locationService.obtenerUbicacionActual();

      if (coords) {
        this.coordenadas = coords;
        this.latManual = coords.latitud.toString();
        this.lonManual = coords.longitud.toString();
        this.modoManual = false;
        // R4: Invocar automáticamente OpenWeatherMap
        this.obtenerClima(coords.latitud, coords.longitud);
      } else {
        // Fallo de GPS en emulador o web: activar automáticamente ingreso manual
        this.activarModoManualPorFalloGps();
      }
    } catch (err) {
      console.warn('Error al solicitar ubicación:', err);
      this.activarModoManualPorFalloGps();
    } finally {
      this.obteniendoGps = false;
      await this.guardarBorrador();
    }
  }

  /**
   * Activa automáticamente los campos manuales informando al usuario.
   */
  private activarModoManualPorFalloGps(): void {
    this.modoManual = true;
    this.mensajeGpsError = 'GPS no disponible en este entorno/emulador. Se activaron los campos de ingreso manual.';
  }

  /**
   * Detecta cambios en los inputs manuales de latitud y longitud en pantalla.
   * Si son válidos, fija las coordenadas e invoca automáticamente OpenWeatherMap.
   */
  onCoordenadasManualesChange(): void {
    const lat = parseFloat(this.latManual);
    const lon = parseFloat(this.lonManual);

    if (this.locationService.validarCoordenadas(lat, lon)) {
      this.coordenadas = { latitud: lat, longitud: lon };
      this.mensajeGpsError = null;
      // R4: Invocar automáticamente OpenWeatherMap con coordenadas manuales
      this.obtenerClima(lat, lon);
      this.guardarBorrador();
    } else {
      if (this.modoManual) {
        this.coordenadas = null;
      }
    }
  }

  /**
   * Botón explícito para aplicar coordenadas manuales si el usuario lo pulsa.
   */
  aplicarCoordenadasManuales(): void {
    this.onCoordenadasManualesChange();
  }

  /**
   * Comprueba si hay una ubicación válida establecida o ingresada en pantalla.
   */
  tieneUbicacionValida(): boolean {
    if (this.coordenadas) return true;
    const lat = parseFloat(this.latManual);
    const lon = parseFloat(this.lonManual);
    return this.locationService.validarCoordenadas(lat, lon);
  }

  // ─── R4: OpenWeatherMap ─────────────────────────────────────────────

  /**
   * Invoca el servicio meteorológico para las coordenadas dadas.
   * Maneja errores informando al usuario sin bloquear el registro.
   */
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
        this.errorClima = 'No se pudo obtener información del clima en este momento, pero puedes continuar con el registro.';
        this.obteniendoClima = false;
      },
    });
  }

  // ─── R6: Fotografía ─────────────────────────────────────────────────

  async capturarFoto(): Promise<void> {
    try {
      const resultado = await this.cameraService.capturarFoto();
      this.fotoPreview = resultado.dataUrl;
      this.fotoData = resultado.dataUrl;
      await this.guardarBorrador();
    } catch (error) {
      console.warn('Error al capturar foto:', error);
    }
  }

  async seleccionarFoto(): Promise<void> {
    try {
      const resultado = await this.cameraService.seleccionarDeGaleria();
      this.fotoPreview = resultado.dataUrl;
      this.fotoData = resultado.dataUrl;
      await this.guardarBorrador();
    } catch (error) {
      console.warn('Error al seleccionar foto:', error);
    }
  }

  eliminarFoto(): void {
    this.fotoPreview = null;
    this.fotoData = null;
    this.guardarBorrador();
  }

  // ─── R5, R2, R3: Sincronización y Guardado en MockAPI ─────────────────

  /**
   * Valida los requisitos antes de permitir continuar:
   *  - Descripción y dirección obligatorias.
   *  - Para la categoría "bache", la ubicación (GPS o manual en inputs) es OBLIGATORIA.
   *  - Para otras categorías, la ubicación no es bloqueante.
   */
  formularioValido(): boolean {
    const tieneDesc = (this.descripcion || '').trim().length > 0;
    const tieneDir = (this.direccion || '').trim().length > 0;

    if (!tieneDesc || !tieneDir) {
      return false;
    }

    // Validación estricta para bache
    if (this.tipo === 'bache') {
      return this.tieneUbicacionValida();
    }

    return true;
  }

  /**
   * Guarda el registro enviando petición POST a MockAPI con todos los campos obligatorios.
   * Tras el éxito, cierra el modal y se asegura de que aparezca reflejado en el Listado.
   */
  guardar(): void {
    if (!this.formularioValido()) return;

    this.guardando = true;

    // Asegurar coordenadas si fueron ingresadas en inputs manuales
    if (!this.coordenadas && this.tieneUbicacionValida()) {
      this.coordenadas = {
        latitud: parseFloat(this.latManual),
        longitud: parseFloat(this.lonManual),
      };
    }

    const payload: Partial<Incidencia> = {
      tipo: this.tipo,
      categoria: this.tipo,
      titulo: this.titulo.trim() || `${this.tipo.toUpperCase()} - ${this.direccion.trim()}`,
      descripcion: this.descripcion.trim(),
      direccion: this.direccion.trim(),
      sector: this.sector.trim() || 'Sector General',
      fecha: new Date().toISOString(),
      fechaCreacion: new Date().toISOString(),
      estado: 'pendiente',
      prioridad: this.prioridad,
      fotografia: this.fotoData ?? '',
      foto: this.fotoData ?? '',
      coordenadas: this.coordenadas ?? undefined,
      clima: this.clima ?? undefined,
    };

    this.incidenciasService.crearIncidencia(payload).subscribe({
      next: async (creada) => {
        await this.storageService.limpiarBorrador();
        this.guardando = false;

        const toast = await this.toastCtrl.create({
          message: `Incidencia ${creada.codigo} registrada con éxito`,
          duration: 2500,
          color: 'success',
          position: 'top',
        });
        await toast.present();

        // Cerrar formulario y entregar el registro creado
        this.modalCtrl.dismiss(creada, 'confirm');
      },
      error: async (err) => {
        console.error('Error al guardar en MockAPI:', err);
        this.guardando = false;
        const toast = await this.toastCtrl.create({
          message: 'Error al conectar con MockAPI. Revisa tu conexión a internet.',
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
