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
    path: 'simulator',
    loadComponent: () => import('./attendance-simulator.component').then(m => m.AttendanceSimulatorComponent)
  }
];