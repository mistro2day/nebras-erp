import { Routes } from '@angular/router';

export const CLINIC_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./clinic-dashboard.component').then((m) => m.ClinicDashboardComponent),
  },
  {
    path: 'visits',
    loadComponent: () => import('./visits/visits.component').then((m) => m.ClinicVisitsComponent),
  },
  {
    path: 'leaves',
    loadComponent: () => import('./leaves/leaves.component').then((m) => m.ClinicLeavesComponent),
  },
];
