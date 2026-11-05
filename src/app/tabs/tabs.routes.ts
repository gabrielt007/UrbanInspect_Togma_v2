import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';

import { AuthService } from '../services/auth';
import { TabsPage } from './tabs.page';

const requireAuthentication: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await firstValueFrom(auth.user$.pipe(take(1)));

  return user
    ? true
    : router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
};

/**
 * Rutas de la estructura de tabs.
 *
 * - tab1: Dashboard / Inicio
 * - tab2: Listado de incidencias
 *   - tab2/detalle/:id → Vista de detalle (R9)
 * - tab3: Seguimiento local (R1)
 */
export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    canActivate: [requireAuthentication],
    canActivateChild: [requireAuthentication],
    children: [
      {
        path: 'tab1',
        loadComponent: () => import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'tab2',
        loadComponent: () => import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'tab2/detalle/:id',
        loadComponent: () => import('../pages/detalle/detalle.page').then((m) => m.DetallePage),
      },
      {
        path: 'tab3',
        loadComponent: () => import('../tab3/tab3.page').then((m) => m.Tab3Page),
      },
      {
        path: '',
        redirectTo: '/tabs/tab1',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];
