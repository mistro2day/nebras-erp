import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';

export const routes: Routes = [
  {
    path: 'accounts',
    loadChildren: () => import('./features/accounts/accounts.routes').then((m) => m.ACCOUNTS_ROUTES),
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'academics',
        loadChildren: () => import('./features/academics/academics.routes').then((m) => m.ACADEMICS_ROUTES),
      },
      {
        path: 'organization',
        loadChildren: () =>
          import('./features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'admissions',
        loadChildren: () =>
          import('./features/admissions/admissions.routes').then((m) => m.ADMISSIONS_ROUTES),
      },
      {
        path: 'students',
        loadChildren: () => import('./features/students/students.routes').then((m) => m.STUDENT_ROUTES),
      },
      {
        path: 'platform',
        loadChildren: () => import('./features/platform/platform.routes').then((m) => m.PLATFORM_ROUTES),
      },
      {
        path: 'settings',
        redirectTo: 'platform/settings',
        pathMatch: 'full',
      },
      {
        path: 'teachers',
        loadChildren: () => import('./features/faculty/faculty.routes').then((m) => m.FACULTY_ROUTES),
      },
      {
        path: 'payroll',
        loadChildren: () => import('./features/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES),
      },
      {
        path: 'rules',
        loadChildren: () => import('./features/rules/rules.routes').then((m) => m.RULES_ROUTES),
      },
      {
        path: 'scheduling',
        loadChildren: () => import('./features/scheduling/scheduling.routes').then((m) => m.SCHEDULING_ROUTES),
      },
      {
        path: 'timetable',
        loadChildren: () => import('./features/timetable/timetable.routes').then((m) => m.TIMETABLE_ROUTES),
      },
      {
        path: 'finance',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'hr',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'library',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'attendance',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'transport',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: 'ai',
        loadChildren: () =>
          import('./features/placeholder/placeholder.routes').then((m) => m.PLACEHOLDER_ROUTES),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'errors/403',
    loadComponent: () => import('./features/errors/error-page.component').then((m) => m.ErrorPageComponent),
    data: { code: '403' },
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/error-page.component').then((m) => m.ErrorPageComponent),
  },
];
