import { CommonModule } from '@angular/common';
import type { OnDestroy, OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmarkOutline, trashOutline, alertCircleOutline, searchOutline } from 'ionicons/icons';
import { firstValueFrom, forkJoin, merge } from 'rxjs';
import type { Subscription } from 'rxjs';

import type { Incidencia } from '../models/incidencia.model';
import { IncidenciasService } from '../services/incidencias.service';
import { StorageService } from '../services/storage.service';

/**
 * Tab 3 – Seguimiento Local
 *
 * Muestra exclusivamente las incidencias marcadas/seguidas localmente.
 * Recupera códigos desde Preferences y sincroniza los cambios de incidencias.
 */
@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonSpinner,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class Tab3Page implements OnInit, OnDestroy {
  private readonly storageService = inject(StorageService);
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly router = inject(Router);

  /** Incidencias seguidas con datos completos */
  incidenciasSeguidas: Incidencia[] = [];

  /** Estado de carga protegido */
  cargando = true;

  private suscripcionCambios?: Subscription;
  private secuenciaCarga = 0;

  constructor() {
    addIcons({ bookmarkOutline, trashOutline, alertCircleOutline, searchOutline });
  }

  ngOnInit(): void {
    this.suscripcionCambios = merge(
      this.incidenciasService.incidenciaCreada$,
      this.incidenciasService.incidenciaActualizada$,
    ).subscribe(() => this.cargarIncidenciasSeguidas());
  }

  ngOnDestroy(): void {
    this.suscripcionCambios?.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.cargarIncidenciasSeguidas();
  }

  /**
   * Carga los códigos seguidos y los resuelve contra el API.
   * Apaga obligatoriamente `cargando = false` para evitar bloqueos visuales.
   */
  async cargarIncidenciasSeguidas(): Promise<void> {
    const secuenciaCarga = ++this.secuenciaCarga;
    this.cargando = true;

    try {
      const codigos = [
        ...new Set((await this.storageService.obtenerCodigosSeguidos()).map((codigo) => codigo.trim()).filter(Boolean)),
      ];

      if (codigos.length === 0) {
        if (secuenciaCarga === this.secuenciaCarga) {
          this.incidenciasSeguidas = [];
        }
        return;
      }

      const peticiones = codigos.map((codigo) => this.incidenciasService.buscarPorCodigo(codigo));
      const grupos = await firstValueFrom(forkJoin(peticiones));
      if (secuenciaCarga === this.secuenciaCarga) {
        this.incidenciasSeguidas = grupos
          .map((grupo, index) => grupo.find((incidencia) => incidencia.codigo === codigos[index]))
          .filter((incidencia): incidencia is Incidencia => incidencia !== undefined);
      }
    } catch (error) {
      console.error('Error al cargar las incidencias seguidas:', error);
      if (secuenciaCarga === this.secuenciaCarga) {
        this.incidenciasSeguidas = [];
      }
    } finally {
      if (secuenciaCarga === this.secuenciaCarga) {
        this.cargando = false;
      }
    }
  }

  async dejarDeSeguir(incidencia: Incidencia): Promise<void> {
    await this.storageService.eliminarCodigoSeguido(incidencia.codigo);
    this.secuenciaCarga += 1;
    this.incidenciasSeguidas = this.incidenciasSeguidas.filter((i) => i.codigo !== incidencia.codigo);
    this.cargando = false;
  }

  verDetalle(incidencia: Incidencia): void {
    this.router.navigate(['/tabs/tab2/detalle', incidencia.id]);
  }

  async refrescar(event: CustomEvent): Promise<void> {
    await this.cargarIncidenciasSeguidas();
    (event.target as HTMLIonRefresherElement).complete();
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
