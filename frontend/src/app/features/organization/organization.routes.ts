import { Routes } from '@angular/router';

export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full',
  },
  {
    path: 'overview',
    loadComponent: () =>
      import('./overview/overview.component').then((m) => m.OrganizationOverviewComponent),
  },
  {
    path: 'branches',
    loadComponent: () =>
      import('./branches/branches.component').then((m) => m.OrgBranchesComponent),
  },
  {
    path: 'departments',
    loadComponent: () =>
      import('./departments/departments.component').then((m) => m.OrgDepartmentsComponent),
  },
];