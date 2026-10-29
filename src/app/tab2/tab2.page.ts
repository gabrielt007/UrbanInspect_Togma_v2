import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonBadge, IonIcon,
  IonSpinner, IonSearchbar, IonRefresher, IonRefresherContent,
  IonInfiniteScroll, IonInfiniteScrollContent,
  IonNote, IonChip,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline, searchOutline, documentTextOutline,
} from 'ionicons/icons';

import { IncidenciasService } from '../services/incidencias.service';
import { Incidencia } from '../models/incidencia.model';

/**
 * Tab 2 – Listado de Incidencias
 *
 * Implementa:
 *  - R3: Carga progresiva / paginación incremental mediante infinite scroll.
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
    IonList, IonItem, IonLabel, IonBadge, IonIcon,
    IonSpinner, IonSearchbar, IonRefresher, IonRefresherContent,
    IonInfiniteScroll, IonInfiniteScrollContent,
    IonNote, IonChip,
  ],
})
export class Tab2Page implements OnInit {
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

  constructor() {
    addIcons({ alertCircleOutline, searchOutline, documentTextOutline });
  }

  ngOnInit(): void {
    this.cargarIncidencias();
  }

  /**
   * Carga la primera página de incidencias.
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
   * Pull-to-refresh: recarga desde la primera página.
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

          // Re-habilitar infinite scroll tras refresh
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

  /**
   * Retorna el icono según la categoría.
   */
  iconoCategoria(categoria: string): string {
    const iconos: Record<string, string> = {
      bache: 'warning-outline',
      alumbrado: 'bulb-outline',
      basura: 'trash-outline',
      señalización: 'sign-post-outline',
      otro: 'help-circle-outline',
    };
    return iconos[categoria] ?? 'document-text-outline';
  }
}
