import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonGrid, IonRow, IonCol, IonIcon, IonBadge, IonSpinner,
  IonList, IonItem, IonLabel, IonChip, IonRefresher, IonRefresherContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline, checkmarkCircleOutline, timeOutline,
  listOutline, bookmarkOutline, warningOutline,
  arrowForwardOutline, statsChartOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../services/incidencias.service';
import { StorageService } from '../services/storage.service';
import { Incidencia } from '../models/incidencia.model';

/**
 * Tab 1 – Dashboard / Inicio
 *
 * Pantalla principal con:
 *  - Indicadores rápidos (total, pendientes, en proceso, resueltas)
 *  - Cantidad de incidencias seguidas localmente
 *  - Últimas incidencias registradas como acceso directo
 */
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    CommonModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonGrid, IonRow, IonCol, IonIcon, IonBadge, IonSpinner,
    IonList, IonItem, IonLabel, IonChip, IonRefresher, IonRefresherContent,
  ],
})
export class Tab1Page implements OnInit {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly storageService = inject(StorageService);

  /** Indicadores del dashboard */
  totalIncidencias = 0;
  pendientes = 0;
  enProceso = 0;
  resueltas = 0;
  codigosSeguidos = 0;

  /** Últimas incidencias para acceso rápido */
  ultimasIncidencias: Incidencia[] = [];

  /** Estado de carga */
  cargando = true;

  constructor() {
    addIcons({
      alertCircleOutline, checkmarkCircleOutline, timeOutline,
      listOutline, bookmarkOutline, warningOutline,
      arrowForwardOutline, statsChartOutline,
    });
  }

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ionViewWillEnter(): void {
    this.cargarDashboard();
  }

  /**
   * Carga todos los datos del dashboard.
   */
  async cargarDashboard(): Promise<void> {
    try {
      const [codigos] = await Promise.all([
        this.storageService.obtenerCodigosSeguidos(),
      ]);

      this.codigosSeguidos = codigos.length;

      this.incidenciasService.obtenerIncidencias(1, 50).subscribe({
        next: (incidencias) => {
          this.calcularEstadisticas(incidencias);
          this.ultimasIncidencias = incidencias.slice(0, 5);
          this.cargando = false;
        },
        error: () => {
          this.cargando = false;
        },
      });
    } catch {
      this.cargando = false;
    }
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.cargarDashboard();
    (event.target as HTMLIonRefresherElement).complete();
  }

  private calcularEstadisticas(incidencias: Incidencia[]): void {
    this.totalIncidencias = incidencias.length;
    this.pendientes = incidencias.filter((i) => i.estado === 'pendiente').length;
    this.enProceso = incidencias.filter((i) => i.estado === 'en_proceso').length;
    this.resueltas = incidencias.filter((i) => i.estado === 'resuelta').length;
  }

  colorEstado(estado: string): string {
    const colores: Record<string, string> = {
      pendiente: 'warning',
      en_proceso: 'primary',
      resuelta: 'success',
    };
    return colores[estado] ?? 'medium';
  }
}
