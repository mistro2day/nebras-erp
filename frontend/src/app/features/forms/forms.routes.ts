import { Routes } from '@angular/router';

export const FORMS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'builder',
    pathMatch: 'full'
  },
  {
    path: 'builder',
    loadComponent: () => import('./form-builder/form-builder.component').then(m => m.FormBuilderComponent)
  }
];
