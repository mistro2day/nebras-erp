import { Routes } from '@angular/router';

export const SAAS_BILLING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./billing-dashboard.component').then((m) => m.SaasBillingDashboardComponent),
  },
];
