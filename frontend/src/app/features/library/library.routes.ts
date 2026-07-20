import { Routes } from '@angular/router';

export const LIBRARY_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./library-dashboard.component').then((m) => m.LibraryDashboardComponent),
  },
  {
    path: 'catalog',
    loadComponent: () => import('./catalog/catalog.component').then((m) => m.LibraryCatalogComponent),
  },
  {
    path: 'borrows',
    loadComponent: () => import('./borrows/borrows.component').then((m) => m.LibraryBorrowsComponent),
  },
  {
    path: 'fines',
    loadComponent: () => import('./fines/fines.component').then((m) => m.LibraryFinesComponent),
  },
];
