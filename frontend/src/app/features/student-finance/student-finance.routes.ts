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
  },
  {
    path: 'accounts',
    loadComponent: () => import('./accounts/accounts-list.component').then(m => m.SfAccountsListComponent)
  },
  {
    path: 'invoices',
    loadComponent: () => import('./invoices/invoices-list.component').then(m => m.SfInvoicesListComponent)
  },
  {
    path: 'receipts',
    loadComponent: () => import('./receipts/receipts-list.component').then(m => m.SfReceiptsListComponent)
  },
  {
    path: 'outstanding',
    loadComponent: () => import('./outstanding/outstanding-list.component').then(m => m.SfOutstandingListComponent)
  }
];
