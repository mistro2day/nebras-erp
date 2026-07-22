import { Routes } from '@angular/router';
import { HRComponent } from './hr.component';

export const HR_ROUTES: Routes = [
  {
    path: '',
    component: HRComponent,
  },
  {
    path: 'create',
    loadComponent: () => import('./create/create.component').then(m => m.EmployeeCreateComponent),
  },
  {
    path: 'employees/:id',
    loadComponent: () => import('./details/employee-details.component').then(m => m.EmployeeDetailsComponent),
  },
];
