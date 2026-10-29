import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, finalize } from 'rxjs';
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
 *  - R2, R5: Sincronización automática inmediata al registrar una nueva incidencia.
 *  - Blindado total contra estados de carga infinita (finalize / catchError).
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

  /** Estado de carga protegido */
  cargandoInicial = true;

  /** Búsqueda */
  terminoBusqueda = '';

  /** Suscripciones reactivas */
  private subscripcionCreacion?: Subscription;
  private subscripcionActualizacion?: Subscription;

  constructor() {
    addIcons({
      alertCircleOutline, searchOutline, documentTextOutline,
      warningOutline, bulbOutline, trashOutline, trailSignOutline, helpCircleOutline,
    });
  }

  ngOnInit(): void {
    this.cargarIncidencias();

    // Sincronización automática: al guardar con éxito en MockAPI, el nuevo registro
    // aparece reflejado de inmediato al inicio del listado general sin duplicados.
    this.subscripcionCreacion = this.incidenciasService.incidenciaCreada$.subscribe((nueva) => {
      this.terminoBusqueda = '';
      this.cargandoInicial = false;
      const sinNueva = this.incidencias.filter(
        (item) =>
          (!item.id || item.id !== nueva.id) &&
          (!item.codigo || item.codigo !== nueva.codigo),
      );
      this.incidencias = [nueva, ...sinNueva];
    });

    // Sincronización automática: al actualizar el estado de una incidencia en Detalle,
    // se refleja de inmediato en el elemento correspondiente del listado general.
    this.subscripcionActualizacion = this.incidenciasService.incidenciaActualizada$.subscribe(
      (actualizada) => {
        const index = this.incidencias.findIndex(
          (item) =>
            (item.id && item.id === actualizada.id) ||
            (item.codigo && item.codigo === actualizada.codigo),
        );
        if (index !== -1) {
          this.incidencias[index] = {
            ...this.incidencias[index],
            ...actualizada,
          };
          this.incidencias = [...this.incidencias];
        }
      },
    );
  }

  ngOnDestroy(): void {
    this.subscripcionCreacion?.unsubscribe();
    this.subscripcionActualizacion?.unsubscribe();
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
   * Une listas de incidencias garantizando unicidad absoluta por ID y Código
   * para prevenir duplicaciones en la UI y errores de trackBy.
   */
  private combinarSinDuplicados(
    actuales: Incidencia[],
    nuevas: Incidencia[],
  ): Incidencia[] {
    const mapa = new Map<string, Incidencia>();

    for (const item of actuales) {
      const clave = item.id || item.codigo;
      if (clave) {
        mapa.set(clave, item);
      }
    }

    for (const item of nuevas) {
      const clave = item.id || item.codigo;
      if (clave) {
        if (mapa.has(clave)) {
          mapa.set(clave, { ...mapa.get(clave)!, ...item });
        } else {
          mapa.set(clave, item);
        }
      }
    }

    return Array.from(mapa.values());
  }

  /**
   * Carga la primera página de incidencias. Apaga obligatoriamente
   * `cargandoInicial = false` para evitar bloqueos visuales.
   */
  cargarIncidencias(): void {
    this.cargandoInicial = true;
    this.paginaActual = 1;
    this.hayMasPaginas = true;

    this.incidenciasService
      .obtenerIncidencias(this.paginaActual, this.ITEMS_POR_PAGINA)
      .pipe(
        finalize(() => {
          this.cargandoInicial = false;
        }),
      )
      .subscribe({
        next: (data) => {
          const lista = data || [];
          this.incidencias = this.combinarSinDuplicados([], lista);
          this.hayMasPaginas = lista.length >= this.ITEMS_POR_PAGINA;
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = !this.hayMasPaginas;
          }
        },
        error: () => {
          this.incidencias = [];
          this.cargandoInicial = false;
        },
      });
  }

  /**
   * R3: Carga la siguiente página al hacer scroll (paginación incremental).
   */
  cargarMas(event: CustomEvent): void {
    if (!this.hayMasPaginas) {
      (event.target as HTMLIonInfiniteScrollElement).complete();
      (event.target as HTMLIonInfiniteScrollElement).disabled = true;
      return;
    }

    this.paginaActual++;

    this.incidenciasService
      .obtenerIncidencias(this.paginaActual, this.ITEMS_POR_PAGINA)
      .pipe(
        finalize(() => {
          (event.target as HTMLIonInfiniteScrollElement).complete();
        }),
      )
      .subscribe({
        next: (data) => {
          const nuevas = data || [];
          if (nuevas.length === 0) {
            this.hayMasPaginas = false;
            (event.target as HTMLIonInfiniteScrollElement).disabled = true;
            return;
          }

          const longitudAntes = this.incidencias.length;
          this.incidencias = this.combinarSinDuplicados(this.incidencias, nuevas);
          const longitudDespues = this.incidencias.length;

          // Si no se agregaron elementos nuevos únicos o el lote fue menor al límite
          if (
            longitudDespues === longitudAntes ||
            nuevas.length < this.ITEMS_POR_PAGINA
          ) {
            this.hayMasPaginas = false;
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
      .pipe(
        finalize(() => {
          (event.target as HTMLIonRefresherElement).complete();
        }),
      )
      .subscribe({
        next: (data) => {
          const lista = data || [];
          this.incidencias = this.combinarSinDuplicados([], lista);
          this.hayMasPaginas = lista.length >= this.ITEMS_POR_PAGINA;

          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = !this.hayMasPaginas;
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
    this.incidenciasService
      .buscarPorCodigo(termino)
      .pipe(
        finalize(() => {
          this.cargandoInicial = false;
        }),
      )
      .subscribe({
        next: (data) => {
          this.incidencias = this.combinarSinDuplicados([], data || []);
          this.hayMasPaginas = false;
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = true;
          }
        },
        error: () => {
          this.incidencias = [];
          this.hayMasPaginas = false;
        },
      });
  }

  /**
   * Limpia el buscador y restaura la paginación normal.
   */
  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.cargarIncidencias();
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
