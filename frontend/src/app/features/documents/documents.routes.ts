import { Routes } from '@angular/router';

export const DOCUMENT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'explorer',
    pathMatch: 'full'
  },
  {
    path: 'explorer',
    loadComponent: () => import('./document-explorer/document-explorer.component').then(m => m.DocumentExplorerComponent)
  }
];
