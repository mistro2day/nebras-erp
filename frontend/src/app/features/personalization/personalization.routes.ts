import { Routes } from '@angular/router';

export const PERSONALIZATION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'preferences',
    pathMatch: 'full'
  },
  {
    path: 'preferences',
    loadComponent: () => import('./preferences-center/preferences-center.component').then(m => m.PreferencesCenterComponent)
  }
];
