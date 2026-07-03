import { Routes } from '@angular/router';

export const TIMETABLE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./timetable-dashboard.component').then(m => m.TimetableDashboardComponent)
  }
];
