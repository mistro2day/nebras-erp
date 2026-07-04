import { Routes } from '@angular/router';

export const INTEGRATION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./gateway-dashboard/gateway-dashboard.component').then(m => m.GatewayDashboardComponent)
  }
];
