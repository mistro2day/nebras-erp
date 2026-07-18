import { Routes } from '@angular/router';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./attendance-dashboard.component').then(m => m.AttendanceDashboardComponent)
  },
  {
    path: 'shifts',
    loadComponent: () => import('./attendance-shifts.component').then(m => m.AttendanceShiftsComponent)
  },
  {
    path: 'corrections',
    loadComponent: () => import('./attendance-corrections.component').then(m => m.AttendanceCorrectionsComponent)
  },
  {
    path: 'sheets',
    loadComponent: () => import('./attendance-sheets.component').then(m => m.AttendanceSheetsComponent)
  },
  {
    path: 'sheets/:id',
    loadComponent: () => import('./attendance-employee-details.component').then(m => m.AttendanceEmployeeDetailsComponent)
  },
  {
    path: 'policies',
    loadComponent: () => import('./attendance-policies.component').then(m => m.AttendancePoliciesComponent)
  },
  {
    path: 'check-in-methods',
    loadComponent: () => import('./attendance-check-in-methods.component').then(m => m.AttendanceCheckInMethodsComponent)
  },
  {
    path: 'simulator',
    loadComponent: () => import('./attendance-simulator.component').then(m => m.AttendanceSimulatorComponent)
  }
];