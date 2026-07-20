import { Routes } from '@angular/router';

export const COMMUNICATIONS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./communications-dashboard.component').then(m => m.CommunicationsDashboardComponent)
  },
  {
    path: 'templates',
    loadComponent: () => import('./communications-templates.component').then(m => m.CommunicationsTemplatesComponent)
  },
  {
    path: 'channels',
    loadComponent: () => import('./communications-channels.component').then(m => m.CommunicationsChannelsComponent)
  }
];
