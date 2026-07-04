import { Routes } from '@angular/router';

export const CONFIG_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'features',
    pathMatch: 'full'
  },
  {
    path: 'features',
    loadComponent: () => import('./feature-flags/feature-flags.component').then(m => m.FeatureFlagsComponent)
  }
];
