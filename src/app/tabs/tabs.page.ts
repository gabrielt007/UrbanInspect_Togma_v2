import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
  IonFab, IonFabButton, ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  homeOutline, listOutline, bookmarkOutline, addOutline,
} from 'ionicons/icons';

import { RegistroModal } from '../pages/registro/registro.modal';

/**
 * Componente de Tabs – Estructura de navegación principal.
 *
 * R10: 3 pestañas distribuidas uniformemente:
 *  - Tab 1: Dashboard / Inicio
 *  - Tab 2: Incidencias (listado general)
 *  - Tab 3: Seguimiento Local
 *
 * Incluye un FAB global para acceso rápido al formulario de registro (R5).
 */
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
    IonFab, IonFabButton,
  ],
})
export class TabsPage {
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);

  constructor() {
    addIcons({ homeOutline, listOutline, bookmarkOutline, addOutline });
  }

  /**
   * Abre el modal de registro de nueva incidencia (R5, R6, R7, R8).
   * Al completarse con éxito, navega automáticamente a la pestaña de Incidencias.
   */
  async abrirRegistro(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: RegistroModal,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
      handle: false,
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      console.log('Incidencia guardada con éxito en MockAPI:', data.codigo);
      // Navegar a la pestaña de Incidencias (Tab 2) para visualizarla inmediatamente
      this.router.navigate(['/tabs/tab2']);
    }
  }
}
