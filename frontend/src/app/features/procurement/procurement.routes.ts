import { Routes } from '@angular/router';

export const PROCUREMENT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./procurement-dashboard.component').then(m => m.ProcurementDashboardComponent)
  },
  {
    path: 'vendors',
    loadComponent: () => import('./vendors/vendors-list.component').then(m => m.ProcurementVendorsComponent)
  },
  {
    path: 'requests',
    loadComponent: () => import('./requests/requests-list.component').then(m => m.ProcurementRequestsComponent)
  },
  {
    path: 'rfqs',
    loadComponent: () => import('./rfqs/rfqs-list.component').then(m => m.ProcurementRfqsComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders-list.component').then(m => m.ProcurementOrdersComponent)
  },
  {
    path: 'contracts',
    loadComponent: () => import('./contracts/contracts-list.component').then(m => m.ProcurementContractsComponent)
  }
];
