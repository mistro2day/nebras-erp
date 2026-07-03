import { Routes } from '@angular/router';

export const ACCOUNTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./security-dashboard/security-dashboard.component').then(
        (m) => m.SecurityDashboardComponent
      ),
  },
  {
    path: 'permissions',
    loadComponent: () =>
      import('./permissions-matrix/permissions-matrix.component').then(
        (m) => m.PermissionsMatrixComponent
      ),
  },
];