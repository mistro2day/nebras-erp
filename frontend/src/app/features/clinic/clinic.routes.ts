import { Routes } from '@angular/router';

export const CLINIC_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./clinic-dashboard.component').then(m => m.ClinicDashboardComponent)
  }
];
