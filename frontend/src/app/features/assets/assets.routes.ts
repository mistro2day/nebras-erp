import { Routes } from '@angular/router';

export const ASSETS_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./assets-dashboard.component').then((m) => m.AssetsDashboardComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./register/asset-register.component').then((m) => m.AssetRegisterComponent),
  },
  {
    path: 'register/:id',
    loadComponent: () => import('./register/asset-detail.component').then((m) => m.AssetDetailComponent),
  },
  {
    path: 'depreciation',
    loadComponent: () => import('./depreciation/depreciation.component').then((m) => m.AssetDepreciationComponent),
  },
];
