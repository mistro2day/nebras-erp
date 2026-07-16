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
    path: 'vendors/:id',
    loadComponent: () => import('./vendors/vendor-detail.component').then(m => m.ProcurementVendorDetailComponent)
  },
  {
    path: 'requests',
    loadComponent: () => import('./requests/requests-list.component').then(m => m.ProcurementRequestsComponent)
  },
  {
    path: 'requests/:id',
    loadComponent: () => import('./requests/request-detail.component').then(m => m.ProcurementRequestDetailComponent)
  },
  {
    path: 'rfqs',
    loadComponent: () => import('./rfqs/rfqs-list.component').then(m => m.ProcurementRfqsComponent)
  },
  {
    path: 'rfqs/:id',
    loadComponent: () => import('./rfqs/rfq-detail.component').then(m => m.ProcurementRfqDetailComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders-list.component').then(m => m.ProcurementOrdersComponent)
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./orders/order-detail.component').then(m => m.ProcurementOrderDetailComponent)
  },
  {
    path: 'contracts',
    loadComponent: () => import('./contracts/contracts-list.component').then(m => m.ProcurementContractsComponent)
  }
];
