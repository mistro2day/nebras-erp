import { Routes } from '@angular/router';

/**
 * مسارات موديول الامتحانات والتقييم الأكاديمي (Examinations & Assessment)
 * بنية متعددة الصفحات: لوحة/مساحة عمل محورية تتفرع منها صفحات مستقلة لكل عملية،
 * مربوطة بالمواد والسنوات والفصول والصفوف والشعب وسجل الطلاب.
 */
export const EXAMINATIONS_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./exam-dashboard.component').then((m) => m.ExamDashboardComponent),
  },
  {
    path: 'exams',
    loadComponent: () => import('./exams/exams.component').then((m) => m.ExamsComponent),
  },
  {
    path: 'schedule',
    loadComponent: () => import('./schedule/exam-schedule.component').then((m) => m.ExamScheduleComponent),
  },
  {
    path: 'marks',
    loadComponent: () => import('./marks/mark-entry.component').then((m) => m.MarkEntryComponent),
  },
  {
    path: 'question-bank',
    loadComponent: () => import('./question-bank/question-bank.component').then((m) => m.QuestionBankComponent),
  },
  {
    path: 'assessments',
    loadComponent: () => import('./assessments/assessments.component').then((m) => m.AssessmentsComponent),
  },
  {
    path: 'grading',
    loadComponent: () => import('./grading/grading.component').then((m) => m.GradingComponent),
  },
  {
    path: 'results',
    loadComponent: () => import('./results/results.component').then((m) => m.ResultsComponent),
  },
  {
    path: 'appeals',
    loadComponent: () => import('./appeals/appeals.component').then((m) => m.AppealsComponent),
  },
  {
    path: 'setup',
    loadComponent: () => import('./setup/exam-setup.component').then((m) => m.ExamSetupComponent),
  },
];
