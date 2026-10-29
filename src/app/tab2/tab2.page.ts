import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonIcon,
  IonSpinner, IonSearchbar, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent,
  IonNote, IonChip,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline, searchOutline, documentTextOutline,
  warningOutline, bulbOutline, trashOutline, trailSignOutline, helpCircleOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../services/incidencias.service';
import { Incidencia } from '../models/incidencia.model';

/**
 * Tab 2 – Listado de Incidencias
 *
 * Implementa:
 *  - R3: Carga progresiva / paginación incremental mediante infinite scroll.
 *  - R2, R5: Sincronización automática de nuevos registros creados desde el formulario.
 *  - Navegación al detalle al tocar un elemento (→ R9).
 *  - Búsqueda por código.
 */
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonIcon,
    IonSpinner, IonSearchbar, IonRefresher, IonRefresherContent,
    IonInfiniteScroll, IonInfiniteScrollContent,
    IonNote, IonChip,
  ],
})
export class Tab2Page implements OnInit, OnDestroy {
  private readonly incidenciasService = inject(IncidenciasService);
  private readonly router = inject(Router);

  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  /** Lista acumulada de incidencias */
  incidencias: Incidencia[] = [];

  /** Control de paginación */
  paginaActual = 1;
  readonly ITEMS_POR_PAGINA = 10;
  hayMasPaginas = true;

  /** Estado de carga */
  cargandoInicial = true;

  /** Búsqueda */
  terminoBusqueda = '';

  /** Suscripción a creación reactiva de incidencias */
  private subscripcionCreacion?: Subscription;

  constructor() {
    addIcons({
      alertCircleOutline, searchOutline, documentTextOutline,
      warningOutline, bulbOutline, trashOutline, trailSignOutline, helpCircleOutline,
    });
  }

  ngOnInit(): void {
    this.cargarIncidencias();

    // Sincronización automática: al guardar con éxito en MockAPI, el nuevo registro
    // aparece reflejado inmediatamente al inicio de la lista local.
    this.subscripcionCreacion = this.incidenciasService.incidenciaCreada$.subscribe((nueva) => {
      this.terminoBusqueda = '';
      this.incidencias = [
        nueva,
        ...this.incidencias.filter((item) => item.codigo !== nueva.codigo && item.id !== nueva.id),
      ];
    });
  }

  ngOnDestroy(): void {
    this.subscripcionCreacion?.unsubscribe();
  }

  /**
   * Ciclo de vida Ionic: asegura que los datos estén cargados al entrar a la tab.
   */
  ionViewWillEnter(): void {
    if (this.incidencias.length === 0 && !this.cargandoInicial) {
      this.cargarIncidencias();
    }
  }

  /**
   * Carga la primera página de incidencias desde MockAPI.
   */
  cargarIncidencias(): void {
    this.cargandoInicial = true;
    this.paginaActual = 1;
    this.incidencias = [];
    this.hayMasPaginas = true;

    this.incidenciasService
      .obtenerIncidencias(this.paginaActual, this.ITEMS_POR_PAGINA)
      .subscribe({
        next: (data) => {
          this.incidencias = data;
          this.hayMasPaginas = data.length === this.ITEMS_POR_PAGINA;
          this.cargandoInicial = false;
        },
        error: () => {
          this.cargandoInicial = false;
        },
      });
  }

  /**
   * R3: Carga la siguiente página al hacer scroll (paginación incremental).
   */
  cargarMas(event: CustomEvent): void {
    this.paginaActual++;

    this.incidenciasService
      .obtenerIncidencias(this.paginaActual, this.ITEMS_POR_PAGINA)
      .subscribe({
        next: (data) => {
          this.incidencias = [...this.incidencias, ...data];
          this.hayMasPaginas = data.length === this.ITEMS_POR_PAGINA;
          (event.target as HTMLIonInfiniteScrollElement).complete();

          if (!this.hayMasPaginas) {
            (event.target as HTMLIonInfiniteScrollElement).disabled = true;
          }
        },
        error: () => {
          (event.target as HTMLIonInfiniteScrollElement).complete();
        },
      });
  }

  /**
   * Pull-to-refresh: recarga desde la primera página desde el servidor.
   */
  refrescar(event: CustomEvent): void {
    this.terminoBusqueda = '';
    this.paginaActual = 1;
    this.hayMasPaginas = true;

    this.incidenciasService
      .obtenerIncidencias(1, this.ITEMS_POR_PAGINA)
      .subscribe({
        next: (data) => {
          this.incidencias = data;
          this.hayMasPaginas = data.length === this.ITEMS_POR_PAGINA;
          (event.target as HTMLIonRefresherElement).complete();

          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        },
        error: () => {
          (event.target as HTMLIonRefresherElement).complete();
        },
      });
  }

  /**
   * Filtra incidencias por código usando el searchbar.
   */
  buscar(event: CustomEvent): void {
    const termino = (event.detail.value ?? '').trim();
    this.terminoBusqueda = termino;

    if (!termino) {
      this.cargarIncidencias();
      return;
    }

    this.cargandoInicial = true;
    this.incidenciasService.buscarPorCodigo(termino).subscribe({
      next: (data) => {
        this.incidencias = data;
        this.hayMasPaginas = false;
        this.cargandoInicial = false;
      },
      error: () => {
        this.incidencias = [];
        this.cargandoInicial = false;
      },
    });
  }

  /**
   * Navega a la vista de detalle de una incidencia.
   */
  verDetalle(incidencia: Incidencia): void {
    this.router.navigate(['/tabs/tab2/detalle', incidencia.id]);
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

  iconoCategoria(categoria?: string): string {
    const iconos: Record<string, string> = {
      bache: 'warning-outline',
      alumbrado: 'bulb-outline',
      basura: 'trash-outline',
      señalización: 'trail-sign-outline',
      otro: 'help-circle-outline',
    };
    return iconos[categoria ?? 'otro'] ?? 'document-text-outline';
  }
}
