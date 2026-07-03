import { Routes } from '@angular/router';

export const EXAMINATIONS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./exam-dashboard.component').then(m => m.ExamDashboardComponent)
  }
];
