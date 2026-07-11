import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./payroll-dashboard.component').then(m => m.PayrollDashboardComponent)
  },
  {
    path: 'runs',
    loadComponent: () => import('./runs/payroll-runs.component').then(m => m.PayrollRunsComponent)
  },
  {
    path: 'loans',
    loadComponent: () => import('./loans/payroll-loans.component').then(m => m.PayrollLoansComponent)
  },
  {
    path: 'structures',
    loadComponent: () => import('./structures/salary-structures.component').then(m => m.SalaryStructuresComponent)
  }
];