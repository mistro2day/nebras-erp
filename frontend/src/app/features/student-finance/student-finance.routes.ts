import { Routes } from '@angular/router';

export const STUDENT_FINANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./student-finance-dashboard.component').then(m => m.StudentFinanceDashboardComponent)
  }
];
