import { Routes } from '@angular/router';

export const CRM_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./crm-dashboard/crm-dashboard.component').then(m => m.CrmDashboardComponent)
  },
  {
    path: 'leads',
    loadComponent: () => import('./crm-leads.component').then(m => m.CrmLeadsComponent)
  },
  {
    path: 'cases',
    loadComponent: () => import('./crm-cases.component').then(m => m.CrmCasesComponent)
  },
  {
    path: 'surveys',
    loadComponent: () => import('./crm-surveys.component').then(m => m.CrmSurveysComponent)
  }
];
