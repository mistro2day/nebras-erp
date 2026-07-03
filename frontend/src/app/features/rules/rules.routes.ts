import { Routes } from '@angular/router';

export const RULES_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./rules-dashboard.component').then(m => m.RulesDashboardComponent)
  }
];