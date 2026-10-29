import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonIcon, IonBadge, IonSpinner, IonButton,
  IonList, IonItem, IonLabel, IonSelect, IonSelectOption, IonTextarea,
  IonChip, IonImg, IonNote,
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
   * Carga la incidencia desde el API.
   */
  cargarIncidencia(id: string): void {
    this.cargando = true;

    this.incidenciasService.obtenerPorId(id).subscribe({
      next: async (data) => {
        this.incidencia = data;
        this.nuevoEstado = data.estado;
        this.estaSeguida = await this.storageService.codigoEstaSeguido(data.codigo);
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  /**
   * R9: Actualiza el estado de la incidencia con observación.
   */
  cambiarEstado(): void {
    if (!this.incidencia?.id || !this.observacion.trim() || this.nuevoEstado === this.incidencia.estado) {
      return;
    }

    this.actualizando = true;

    this.incidenciasService
      .actualizarEstado(this.incidencia.id, this.nuevoEstado, this.observacion.trim())
      .subscribe({
        next: (actualizada) => {
          this.incidencia = actualizada;
          this.observacion = '';
          this.actualizando = false;
        },
        error: () => {
          this.actualizando = false;
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
      this.nuevoEstado !== this.incidencia.estado &&
      this.observacion.trim().length > 0
    );
  }
}
