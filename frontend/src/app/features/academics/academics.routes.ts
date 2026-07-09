import { Routes } from '@angular/router';

export const ACADEMICS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.AcademicDashboardComponent),
  },
  {
    path: 'years',
    loadComponent: () => import('./years/academic-years.component').then((m) => m.AcademicYearsComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('./terms/terms.component').then((m) => m.AcademicTermsComponent),
  },
  {
    path: 'stages',
    loadComponent: () => import('./stages/stages.component').then((m) => m.AcademicStagesComponent),
  },
  {
    path: 'grades',
    loadComponent: () => import('./grades/grades.component').then((m) => m.AcademicGradesComponent),
  },
  {
    path: 'sections',
    loadComponent: () => import('./sections/sections.component').then((m) => m.AcademicSectionsComponent),
  },
  {
    path: 'distribution',
    loadComponent: () => import('./distribution/distribution.component').then((m) => m.AcademicDistributionComponent),
  },
  {
    path: 'subjects',
    loadComponent: () => import('./subjects/subjects.component').then((m) => m.AcademicSubjectsComponent),
  },
];
