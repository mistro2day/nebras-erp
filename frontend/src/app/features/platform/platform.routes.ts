import { Routes } from '@angular/router';

export const PLATFORM_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.PlatformDashboardComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings.component').then(m => m.PlatformSettingsComponent)
  },
  {
    path: 'logs',
    loadComponent: () => import('./logs/logs.component').then(m => m.PlatformLogsComponent)
  }
];