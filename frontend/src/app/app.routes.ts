import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from './layouts/dashboard-layout/dashboard-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'accounts',
    loadChildren: () => import('./features/accounts/accounts.routes').then((m) => m.ACCOUNTS_ROUTES),
  },
  // بوابة الهبوط العامة — أول ما يراه الزائر (تقديم / تتبّع / دخول الإدارة).
  {
    path: 'welcome',
    loadComponent: () => import('./features/public/landing.component').then((m) => m.LandingComponent),
  },
  // البوابة العامة لتسجيل الطلاب — عامة بلا مصادقة ولا شريط جانبي.
  {
    path: 'apply',
    loadComponent: () =>
      import('./features/admissions/public/public-apply.component').then((m) => m.PublicApplyComponent),
  },
  {
    path: 'apply/track',
    loadComponent: () =>
      import('./features/admissions/public/public-track.component').then((m) => m.PublicTrackComponent),
  },
  // بوابة ولي الأمر — قشرة مستقلة هاتف أولاً خارج واجهة الإدارة.
  {
    path: 'parent',
    canActivate: [authGuard],
    loadChildren: () => import('./features/portal/parent/parent.routes').then((m) => m.PARENT_ROUTES),
  },
  {
    path: '',
    component: DashboardLayoutComponent,
    // بوابة الدخول: لا تُعرض لوحة التحكم قبل المصادقة — يُعاد التوجيه إلى /accounts/login.
    canActivate: [authGuard],
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
        path: 'profile',
        loadComponent: () => import('./features/accounts/profile/profile.component').then((m) => m.UserProfileComponent),
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
        path: 'communications',
        loadChildren: () => import('./features/communications/communications.routes').then((m) => m.COMMUNICATIONS_ROUTES),
      },
      {
        path: 'reporting',
        loadChildren: () => import('./features/reporting/reporting.routes').then((m) => m.REPORTING_ROUTES),
      },
      {
        path: 'examinations',
        loadChildren: () => import('./features/examinations/examinations.routes').then((m) => m.EXAMINATIONS_ROUTES),
      },
      {
        path: 'finance',
        loadChildren: () =>
          import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
      },
      {
        path: 'student-finance',
        loadChildren: () =>
          import('./features/student-finance/student-finance.routes').then((m) => m.STUDENT_FINANCE_ROUTES),
      },
      {
        path: 'procurement',
        loadChildren: () =>
          import('./features/procurement/procurement.routes').then((m) => m.PROCUREMENT_ROUTES),
      },
      {
        path: 'hr',
        loadChildren: () =>
          import('./features/hr/hr.routes').then((m) => m.HR_ROUTES),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'assets',
        loadChildren: () =>
          import('./features/assets/assets.routes').then((m) => m.ASSETS_ROUTES),
      },
      {
        path: 'maintenance',
        loadChildren: () =>
          import('./features/maintenance/maintenance.routes').then((m) => m.MAINTENANCE_ROUTES),
      },
      {
        path: 'library',
        loadChildren: () =>
          import('./features/library/library.routes').then((m) => m.LIBRARY_ROUTES),
      },
      {
        path: 'clinic',
        loadChildren: () =>
          import('./features/clinic/clinic.routes').then((m) => m.CLINIC_ROUTES),
      },
      {
        path: 'attendance',
        loadChildren: () =>
          import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES),
      },
      {
        path: 'transport',
        loadChildren: () =>
          import('./features/transport/transport.routes').then((m) => m.TRANSPORT_ROUTES),
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
        path: 'portal',
        loadChildren: () =>
          import('./features/portal/portal.routes').then((m) => m.PORTAL_ROUTES),
      },
      {
        path: 'integration',
        loadChildren: () =>
          import('./features/integration/integration.routes').then((m) => m.INTEGRATION_ROUTES),
      },
      {
        path: 'crm',
        loadChildren: () =>
          import('./features/crm/crm.routes').then((m) => m.CRM_ROUTES),
      },
      {
        path: 'documents',
        loadChildren: () =>
          import('./features/documents/documents.routes').then((m) => m.DOCUMENT_ROUTES),
      },
      {
        path: 'forms',
        loadChildren: () =>
          import('./features/forms/forms.routes').then((m) => m.FORMS_ROUTES),
      },
      {
        path: 'command',
        loadChildren: () =>
          import('./features/command/command.routes').then((m) => m.COMMAND_ROUTES),
      },
      {
        path: 'personalization',
        loadChildren: () =>
          import('./features/personalization/personalization.routes').then((m) => m.PERSONALIZATION_ROUTES),
      },
      {
        path: 'config',
        loadChildren: () =>
          import('./features/config/config.routes').then((m) => m.CONFIG_ROUTES),
      },
      {
        path: 'automation',
        loadChildren: () =>
          import('./features/automation/automation.routes').then((m) => m.AUTOMATION_ROUTES),
      },
      {
        path: 'approvals',
        loadChildren: () =>
          import('./features/approvals/approval.routes').then((m) => m.APPROVAL_ROUTES),
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
