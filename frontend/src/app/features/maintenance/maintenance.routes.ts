import { Routes } from '@angular/router';

export const MAINTENANCE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./maintenance-dashboard.component').then((m) => m.MaintenanceDashboardComponent),
  },
  {
    path: 'work-orders',
    loadComponent: () => import('./work-orders/work-orders.component').then((m) => m.MaintenanceWorkOrdersComponent),
  },
  {
    path: 'requests',
    loadComponent: () => import('./requests/maintenance-requests.component').then((m) => m.MaintenanceRequestsComponent),
  },
];
