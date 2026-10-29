import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon,
  IonSpinner, IonItemSliding, IonItemOptions, IonItemOption,
  IonRefresher, IonRefresherContent, IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookmarkOutline, trashOutline, alertCircleOutline,
  searchOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../services/incidencias.service';
import { StorageService } from '../services/storage.service';
import { Incidencia } from '../models/incidencia.model';

/**
 * Tab 3 – Seguimiento Local
 *
 * Implementa:
 *  - R1: Muestra exclusivamente las incidencias marcadas/seguidas
 *        localmente por el usuario via StorageService.
 *  - Permite eliminar del seguimiento con slide-to-delete.
 */
@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonBadge, IonIcon,
    IonSpinner, IonItemSliding, IonItemOptions, IonItemOption,
    IonRefresher, IonRefresherContent, IonNote,
  ],
})
export class Tab3Page {
  private readonly storageService = inject(StorageService);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly router = inject(Router);

  /** Incidencias seguidas con datos completos */
  incidenciasSeguidas: Incidencia[] = [];

  /** Estado de carga */
  cargando = true;

  constructor() {
    addIcons({ bookmarkOutline, trashOutline, alertCircleOutline, searchOutline });
  }

  /**
   * Hook del ciclo de vida de Ionic: se ejecuta cada vez que la vista
   * entra en pantalla (no solo la primera vez). Ideal para refrescar datos.
   */
  ionViewWillEnter(): void {
    this.cargarIncidenciasSeguidas();
  }

  /**
   * Carga los códigos seguidos y resuelve cada uno contra el API.
   */
  async cargarIncidenciasSeguidas(): Promise<void> {
    this.cargando = true;

    try {
      const codigos = await this.storageService.obtenerCodigosSeguidos();

      if (codigos.length === 0) {
        this.incidenciasSeguidas = [];
        this.cargando = false;
        return;
      }

      // Resolver cada código contra el API
      const resultados: Incidencia[] = [];
      let completados = 0;

      for (const codigo of codigos) {
        this.incidenciasService.buscarPorCodigo(codigo).subscribe({
          next: (encontradas) => {
            if (encontradas.length > 0) {
              resultados.push(encontradas[0]);
            }
            completados++;
            if (completados === codigos.length) {
              this.incidenciasSeguidas = resultados;
              this.cargando = false;
            }
          },
          error: () => {
            completados++;
            if (completados === codigos.length) {
              this.incidenciasSeguidas = resultados;
              this.cargando = false;
            }
          },
        });
      }
    } catch {
      this.incidenciasSeguidas = [];
      this.cargando = false;
    }
  }

  /**
   * Elimina una incidencia del seguimiento local (slide-to-delete).
   */
  async dejarDeSeguir(incidencia: Incidencia): Promise<void> {
    await this.storageService.eliminarCodigoSeguido(incidencia.codigo);
    this.incidenciasSeguidas = this.incidenciasSeguidas.filter(
      (i) => i.codigo !== incidencia.codigo,
    );
  }

  /**
   * Navega al detalle de una incidencia.
   */
  verDetalle(incidencia: Incidencia): void {
    this.router.navigate(['/tabs/tab2/detalle', incidencia.id]);
  }

  /**
   * Pull-to-refresh.
   */
  async refrescar(event: CustomEvent): Promise<void> {
    await this.cargarIncidenciasSeguidas();
    (event.target as HTMLIonRefresherElement).complete();
  }

  /**
   * Retorna el color del badge según el estado.
   */
  colorEstado(estado: string): string {
    const colores: Record<string, string> = {
      pendiente: 'warning',
      en_proceso: 'primary',
      resuelta: 'success',
    };
    return colores[estado] ?? 'medium';
  }
}
