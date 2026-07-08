import { Routes } from '@angular/router';

export const ADMISSIONS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.AdmissionsDashboardComponent),
  },
  {
    path: 'applications',
    loadComponent: () =>
      import('./applications/applications-list.component').then((m) => m.ApplicationsListComponent),
  },
  {
    path: 'applications/new',
    loadComponent: () =>
      import('./applications/applicant-form.component').then((m) => m.ApplicantFormComponent),
  },
  {
    path: 'applications/:id/edit',
    loadComponent: () =>
      import('./applications/applicant-form.component').then((m) => m.ApplicantFormComponent),
  },
  {
    path: 'applications/:id',
    loadComponent: () =>
      import('./applications/application-details.component').then((m) => m.ApplicationDetailsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/admission-settings.component').then((m) => m.AdmissionSettingsComponent),
  },
  {
    path: 'review',
    loadComponent: () => import('./review/review.component').then((m) => m.AdmissionsReviewComponent),
  },
  {
    path: 'interviews',
    loadComponent: () =>
      import('./interviews/interviews.component').then((m) => m.AdmissionsInterviewsComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./documents/documents.component').then((m) => m.AdmissionsDocumentsComponent),
  },
  {
    path: 'acceptance',
    loadComponent: () =>
      import('./acceptance/acceptance.component').then((m) => m.AdmissionsAcceptanceComponent),
  },
  {
    path: 'enrollment',
    loadComponent: () =>
      import('./enrollment/enrollment.component').then((m) => m.AdmissionsEnrollmentComponent),
  },
  {
    path: 'waiting-list',
    loadComponent: () =>
      import('./waiting-list/waiting-list.component').then((m) => m.AdmissionsWaitingListComponent),
  },
  {
    path: 'scholarships',
    loadComponent: () =>
      import('./scholarships/scholarships.component').then((m) => m.AdmissionsScholarshipsComponent),
  },
];
