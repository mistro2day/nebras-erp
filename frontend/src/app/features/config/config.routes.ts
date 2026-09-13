import { Routes } from '@angular/router';

export const CONFIG_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'school-identity',
    pathMatch: 'full'
  },
  {
    path: 'school-identity',
    loadComponent: () => import('./school-identity/school-identity-settings.component').then(m => m.SchoolIdentitySettingsComponent)
  },
  {
    path: 'features',
    loadComponent: () => import('./feature-flags/feature-flags.component').then(m => m.FeatureFlagsComponent)
  }
];
