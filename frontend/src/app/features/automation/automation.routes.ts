import { Routes } from '@angular/router';
import { ResourceConfig } from './resource-dashboard.component';

const flowsConfig: ResourceConfig = {
  title: 'محرك الأتمتة — التدفقات', subtitle: 'محفّزات الأحداث والجدولة تنفّذ إجراءات عبر المحركات القائمة.',
  icon: 'bolt', resource: 'flows', statusKey: 'status',
  columns: [
    { key: 'code', label: 'الرمز' }, { key: 'name', label: 'الاسم' },
    { key: 'status', label: 'الحالة', badge: true }, { key: 'run_count', label: 'مرات التشغيل' },
  ],
  actions: [{ verb: 'run', label: 'تشغيل' }, { verb: 'toggle', label: 'تفعيل/إيقاف' }],
};

const decisionTablesConfig: ResourceConfig = {
  title: 'مصمم القواعد — جداول القرار', subtitle: 'تُترجم عند النشر إلى قواعد في محرك القواعد الحالي.',
  icon: 'table_chart', resource: 'decision-tables', statusKey: 'status',
  columns: [
    { key: 'code', label: 'الرمز' }, { key: 'name', label: 'الاسم' },
    { key: 'hit_policy', label: 'سياسة الإصابة' }, { key: 'status', label: 'الحالة', badge: true },
  ],
  actions: [{ verb: 'simulate', label: 'محاكاة' }, { verb: 'publish', label: 'نشر' }],
};

const entitiesConfig: ResourceConfig = {
  title: 'الاستوديو منخفض الشيفرة — الكيانات', subtitle: 'باني الكيانات يولّد شيفرة متوافقة مع بنية Nebras (DDD).',
  icon: 'dashboard_customize', resource: 'entities', statusKey: 'status',
  columns: [
    { key: 'code', label: 'الرمز' }, { key: 'name', label: 'الاسم' },
    { key: 'module_code', label: 'الموديول' }, { key: 'status', label: 'الحالة', badge: true },
  ],
  actions: [{ verb: 'generate', label: 'توليد الشيفرة' }],
};

const devopsConfig: ResourceConfig = {
  title: 'مركز DevOps — رايات الميزات', subtitle: 'إدارة رايات الميزات والبيئات (واجهات تحضيرية دون نشر سحابي).',
  icon: 'flag', resource: 'feature-flags', statusKey: 'is_enabled',
  columns: [
    { key: 'key', label: 'المفتاح' }, { key: 'description', label: 'الوصف' },
    { key: 'is_enabled', label: 'مفعّلة' }, { key: 'rollout_percentage', label: 'نسبة الطرح %' },
  ],
  actions: [{ verb: 'toggle', label: 'تبديل' }],
};

const deploymentsConfig: ResourceConfig = {
  title: 'مركز DevOps — سجل النشر', subtitle: 'سجل عمليات النشر والتراجع (Rollback) — تحضيري فقط.',
  icon: 'rocket_launch', resource: 'deployments', statusKey: 'status',
  columns: [
    { key: 'version', label: 'الإصدار' }, { key: 'commit_ref', label: 'المرجع' },
    { key: 'status', label: 'الحالة', badge: true },
  ],
  actions: [{ verb: 'rollback', label: 'تراجع' }],
};

const pluginsConfig: ResourceConfig = {
  title: 'مدير الإضافات', subtitle: 'سجل الإضافات والإصدارات والتثبيت الآمن للمستأجرين.',
  icon: 'extension', resource: 'plugins', statusKey: 'status',
  columns: [
    { key: 'slug', label: 'المعرّف' }, { key: 'name', label: 'الاسم' },
    { key: 'vendor', label: 'المورّد' }, { key: 'status', label: 'الحالة', badge: true },
  ],
};

export const AUTOMATION_ROUTES: Routes = [
  { path: '', redirectTo: 'studio', pathMatch: 'full' },
  {
    path: 'studio',
    loadComponent: () => import('./automation-studio.component').then((m) => m.AutomationStudioComponent),
  },
  {
    path: 'workflow-designer',
    loadComponent: () => import('./workflow-designer.component').then((m) => m.WorkflowDesignerComponent),
  },
  {
    path: 'operations',
    loadComponent: () => import('./operations-center.component').then((m) => m.OperationsCenterComponent),
  },
  {
    path: 'automation',
    loadComponent: () => import('./resource-dashboard.component').then((m) => m.ResourceDashboardComponent),
    data: { config: flowsConfig },
  },
  {
    path: 'rule-designer',
    loadComponent: () => import('./resource-dashboard.component').then((m) => m.ResourceDashboardComponent),
    data: { config: decisionTablesConfig },
  },
  {
    path: 'lowcode',
    loadComponent: () => import('./resource-dashboard.component').then((m) => m.ResourceDashboardComponent),
    data: { config: entitiesConfig },
  },
  {
    path: 'devops',
    loadComponent: () => import('./resource-dashboard.component').then((m) => m.ResourceDashboardComponent),
    data: { config: devopsConfig },
  },
  {
    path: 'devops/deployments',
    loadComponent: () => import('./resource-dashboard.component').then((m) => m.ResourceDashboardComponent),
    data: { config: deploymentsConfig },
  },
  {
    path: 'plugins',
    loadComponent: () => import('./resource-dashboard.component').then((m) => m.ResourceDashboardComponent),
    data: { config: pluginsConfig },
  },
];
