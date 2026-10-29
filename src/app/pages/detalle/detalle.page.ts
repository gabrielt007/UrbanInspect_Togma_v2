import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonIcon, IonBadge, IonSpinner, IonButton,
  IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea,
  IonChip, IonImg, IonNote, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  locationOutline, cloudOutline, cameraOutline,
  bookmarkOutline, bookmark, calendarOutline,
  alertCircleOutline, checkmarkCircleOutline,
  timeOutline, swapHorizontalOutline, thermometerOutline,
  rainyOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../../services/incidencias.service';
import { StorageService } from '../../services/storage.service';
import { Incidencia, EstadoIncidencia } from '../../models/incidencia.model';

/**
 * Página de Detalle de Incidencia
 *
 * Muestra toda la información de una incidencia y permite:
 *  - R9: Cambiar el estado con observación obligatoria.
 *  - R1: Marcar/desmarcar para seguimiento local.
 *  - Ver historial de cambios de estado.
 */
@Component({
  selector: 'app-detalle',
  templateUrl: 'detalle.page.html',
  styleUrls: ['detalle.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonIcon, IonBadge, IonSpinner, IonButton,
    IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea,
    IonChip, IonImg, IonNote,
  ],
})
export class DetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly storageService = inject(StorageService);
  private readonly toastController = inject(ToastController);

  /** Datos de la incidencia */
  incidencia: Incidencia | null = null;

  /** Estado de carga */
  cargando = true;

  /** Seguimiento local */
  estaSeguida = false;

  /** R9: Campos para cambio de estado */
  nuevoEstado: EstadoIncidencia = 'pendiente';
  observacion = '';
  actualizando = false;

  constructor() {
    addIcons({
      locationOutline, cloudOutline, cameraOutline,
      bookmarkOutline, bookmark, calendarOutline,
      alertCircleOutline, checkmarkCircleOutline,
      timeOutline, swapHorizontalOutline, thermometerOutline,
      rainyOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarIncidencia(id);
    }
  }

  /**
   * Determina los estados válidos permitidos para la transición según las reglas:
   *  - pendiente -> en_proceso
   *  - en_proceso -> resuelta
   *  - resuelta -> no admite modificaciones (prohibido volver a pendiente o en_proceso)
   */
  obtenerEstadosPermitidos(estadoActual?: EstadoIncidencia): EstadoIncidencia[] {
    switch (estadoActual) {
      case 'pendiente':
        return ['en_proceso'];
      case 'en_proceso':
        return ['resuelta'];
      case 'resuelta':
      default:
        return [];
    }
  }

  get estadosPermitidos(): EstadoIncidencia[] {
    return this.obtenerEstadosPermitidos(this.incidencia?.estado);
  }

  get puedeCambiarEstado(): boolean {
    return this.estadosPermitidos.length > 0;
  }

  /**
   * Carga la incidencia desde MockAPI.
   */
  cargarIncidencia(id: string): void {
    this.cargando = true;

    this.incidenciasService.obtenerPorId(id).subscribe({
      next: async (data) => {
        this.incidencia = data;
        if (data) {
          const permitidos = this.obtenerEstadosPermitidos(data.estado);
          this.nuevoEstado = permitidos.length > 0 ? permitidos[0] : data.estado;
          this.estaSeguida = await this.storageService.codigoEstaSeguido(data.codigo);
        }
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  /**
   * R9: Actualiza el estado de la incidencia con observación obligatoria.
   */
  async cambiarEstado(): Promise<void> {
    if (!this.formularioValido() || !this.incidencia?.id || this.actualizando) {
      return;
    }

    this.actualizando = true;
    const nuevoEstado = this.nuevoEstado;
    const observacionTexto = this.observacion.trim();

    this.incidenciasService
      .actualizarEstado(this.incidencia.id, nuevoEstado, observacionTexto)
      .subscribe({
        next: async (actualizada) => {
          this.incidencia = actualizada;
          this.observacion = '';
          const permitidos = this.obtenerEstadosPermitidos(actualizada.estado);
          this.nuevoEstado = permitidos.length > 0 ? permitidos[0] : actualizada.estado;
          this.actualizando = false;

          const toast = await this.toastController.create({
            message: `Estado actualizado a "${actualizada.estado === 'en_proceso' ? 'En Proceso' : 'Resuelta'}" con éxito`,
            duration: 2500,
            position: 'bottom',
            color: 'success',
          });
          await toast.present();
        },
        error: async (err) => {
          console.error('Error al actualizar estado:', err);
          this.actualizando = false;
          const toast = await this.toastController.create({
            message: 'No se pudo actualizar el estado en MockAPI',
            duration: 3000,
            position: 'bottom',
            color: 'danger',
          });
          await toast.present();
        },
      });
  }

  /**
   * R1: Alterna el seguimiento local de esta incidencia.
   */
  async toggleSeguimiento(): Promise<void> {
    if (!this.incidencia) return;

    if (this.estaSeguida) {
      await this.storageService.eliminarCodigoSeguido(this.incidencia.codigo);
    } else {
      await this.storageService.agregarCodigoSeguido(this.incidencia.codigo);
    }

    this.estaSeguida = !this.estaSeguida;
  }

  colorEstado(estado: string): string {
    const colores: Record<string, string> = {
      pendiente: 'warning',
      en_proceso: 'primary',
      resuelta: 'success',
    };
    return colores[estado] ?? 'medium';
  }

  colorPrioridad(prioridad?: string): string {
    const colores: Record<string, string> = {
      alta: 'danger',
      media: 'warning',
      baja: 'medium',
    };
    return colores[prioridad ?? 'media'] ?? 'medium';
  }

  formularioValido(): boolean {
    return (
      !!this.incidencia &&
      this.puedeCambiarEstado &&
      this.estadosPermitidos.includes(this.nuevoEstado) &&
      this.observacion.trim().length > 0
    );
  }
}
