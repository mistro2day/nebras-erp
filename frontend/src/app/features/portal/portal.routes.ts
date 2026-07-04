import { Routes } from '@angular/router';

export const PORTAL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'student/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'parent/dashboard',
    loadComponent: () => import('./parent-dashboard/parent-dashboard.component').then(m => m.ParentDashboardComponent)
  },
  {
    path: 'student/dashboard',
    loadComponent: () => import('./student-dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent)
  },
  {
    path: 'applicant/dashboard',
    loadComponent: () => import('./applicant-dashboard/applicant-dashboard.component').then(m => m.ApplicantDashboardComponent)
  }
];
