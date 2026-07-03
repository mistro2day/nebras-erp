import { Routes } from '@angular/router';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.StudentsDashboardComponent)
  },
  {
    path: 'list',
    loadComponent: () => import('./list/list.component').then(m => m.StudentsListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./create/create.component').then(m => m.StudentCreateComponent)
  },
  {
    path: 'details/:id',
    loadComponent: () => import('./details/details.component').then(m => m.StudentDetailsComponent)
  }
];