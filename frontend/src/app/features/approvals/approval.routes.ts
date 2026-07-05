import { Routes } from '@angular/router';

export const APPROVAL_ROUTES: Routes = [
  { path: '', redirectTo: 'inbox', pathMatch: 'full' },
  {
    path: 'inbox',
    loadComponent: () => import('./inbox/approval-inbox.component').then((m) => m.ApprovalInboxComponent),
  },
  {
    path: 'requests/:id',
    loadComponent: () =>
      import('./request-detail/approval-request-detail.component').then((m) => m.ApprovalRequestDetailComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/approval-dashboard.component').then((m) => m.ApprovalDashboardComponent),
  },
  {
    path: 'delegation',
    loadComponent: () => import('./delegation/delegation-center.component').then((m) => m.DelegationCenterComponent),
  },
  {
    path: 'escalation',
    loadComponent: () => import('./escalation/escalation-center.component').then((m) => m.EscalationCenterComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./analytics/approval-analytics.component').then((m) => m.ApprovalAnalyticsComponent),
  },
];
