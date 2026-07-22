import { NbBadgeKind } from '../../../shared/nebras/nb-badge.component';

/**
 * مفردات مشتركة لوحدة القبول والتسجيل — لغة تصميم Nebras OS.
 * مصدر وحيد لخرائط الحالات وأنماط تخطيط الصفحات لمنع تكرار CSS/المنطق عبر الشاشات.
 */

/* ==== حالة المتقدم (Applicant.status من الخادم) ==== */
export const APPLICANT_STATUS_TEXT: Record<string, string> = {
  draft: 'مسودة',
  submitted: 'مُقدّم',
  under_review: 'قيد المراجعة',
  interview_scheduled: 'مقابلة مجدولة',
  qualified_exam: 'مؤهّل لامتحان القدرات',
  exam_scored: 'رُصدت الدرجات',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  enrolled: 'مُسجّل',
  waitlist: 'قائمة الانتظار',
};

/**
 * مراحل القبول المرتّبة (stepper). كل مرحلة تُطابق حالة أو أكثر على الخادم.
 * الترتيب يعكس التدفّق: مُقدّم → قبول الطلب → القدرات → القرار النهائي → التسجيل.
 */
export interface AdmissionStage {
  key: string;
  label: string;
  /** الحالات التي تعتبر هذه المرحلة «مكتملة» أو «حالية» عندها. */
  statuses: string[];
}

export const ADMISSION_STAGES: AdmissionStage[] = [
  { key: 'submitted', label: 'مُقدّم', statuses: ['draft', 'submitted', 'under_review', 'interview_scheduled'] },
  { key: 'qualified_exam', label: 'مؤهّل للقدرات', statuses: ['qualified_exam'] },
  { key: 'exam_scored', label: 'رُصدت الدرجات', statuses: ['exam_scored'] },
  { key: 'decision', label: 'القرار النهائي', statuses: ['accepted', 'rejected', 'waitlist'] },
  { key: 'enrolled', label: 'مُسجّل', statuses: ['enrolled'] },
];

/**
 * مواد امتحان القدرات الافتراضية (المواد الأساسية) — تُستخدم عندما لا يعرّف
 * المستأجر مواده الخاصة في إعدادات القبول. تُطابق نظيرتها في الخلفية.
 */
export const DEFAULT_APTITUDE_SUBJECTS = [
  { name: 'اللغة العربية', max: 100, pass: 75 },
  { name: 'اللغة الإنجليزية', max: 100, pass: 75 },
  { name: 'الرياضيات', max: 100, pass: 75 },
  { name: 'الكيمياء', max: 100, pass: 75 },
];

/** بنية قسط واحد في جدول الرسوم. */
export interface FeeInstallment { title: string; amount: number; note?: string; }

/** بنية إعدادات الرسوم المعروضة (استمارة التقديم والطباعة). */
export interface AdmissionFees {
  registration_fee: number;
  annual_tuition: number;
  fee_currency: string;
  fee_installments: FeeInstallment[];
  fee_notes: string[];
}

/**
 * الرسوم الافتراضية — منقولة من الاستمارة الورقية الرسمية (applicant-print-modal).
 * تُستخدم كقيم مبدئية قابلة للتعديل في الإعدادات، وكـfallback في الطباعة.
 */
export const DEFAULT_ADMISSION_FEES: AdmissionFees = {
  registration_fee: 200000,
  annual_tuition: 500000,
  fee_currency: 'جنيه',
  fee_installments: [
    { title: 'القسط الأول (عند التسجيل)', amount: 500000, note: 'رسوم التسجيل 200,000 + القسط الأول 300,000' },
    { title: 'القسط الثاني', amount: 200000, note: 'بعد شهرين من بداية العام الدراسي' },
  ],
  fee_notes: [
    'لا ترد رسوم التسجيل بعد سدادها.',
    'تخصم المدرسة (300,000 جنيه) رسوم تسجيل + إجراءات في حالة ترك التلميذ المدرسة أو فصله خلال الأسبوع الأول.',
    'لا ترد الرسوم الدراسية (القسط الأول) بعد إكمال الأسبوع الأول من الدراسة.',
  ],
};

/** يُرجع فهرس المرحلة الحالية ضمن ADMISSION_STAGES بناءً على حالة الطلب. */
export function admissionStageIndex(status: string): number {
  const i = ADMISSION_STAGES.findIndex(s => s.statuses.includes(status));
  return i === -1 ? 0 : i;
}

/** هل الحالة قرار رفض/انتظار (لتلوين المرحلة بالأحمر بدل الأخضر)؟ */
export function isNegativeDecision(status: string): boolean {
  return status === 'rejected' || status === 'waitlist';
}

export function applicantStatusText(status: string): string {
  return APPLICANT_STATUS_TEXT[status] || status;
}

export function applicantStatusKind(status: string): NbBadgeKind {
  switch (status) {
    case 'accepted':
    case 'enrolled':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'under_review':
    case 'interview_scheduled':
    case 'qualified_exam':
    case 'exam_scored':
      return 'info';
    case 'submitted':
      return 'warning';
    case 'waitlist':
      return 'ai';
    default:
      return 'neutral';
  }
}

/* ==== حالة التحقق من المستند (RequiredDocument.verification_status) ==== */
export const DOC_STATUS_TEXT: Record<string, string> = {
  pending: 'قيد المراجعة',
  verified: 'تم التحقق',
  rejected: 'مرفوض',
};

export function docStatusKind(status: string): NbBadgeKind {
  switch (status) {
    case 'verified': return 'success';
    case 'rejected': return 'danger';
    default: return 'warning';
  }
}

/* ==== حالة المقابلة (Interview.status) ==== */
export const INTERVIEW_STATUS_TEXT: Record<string, string> = {
  scheduled: 'مجدولة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

export function interviewStatusKind(status: string): NbBadgeKind {
  switch (status) {
    case 'completed': return 'success';
    case 'cancelled': return 'danger';
    default: return 'info';
  }
}

/**
 * تطبيع استجابة الخادم (StandardResponse/StandardPagination) إلى مصفوفة.
 * يتعامل مع data كمصفوفة مباشرة أو ككائن ترقيم يحوي results.
 */
export function pickList<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.results)) return d.results as T[];
  return [];
}

/**
 * أنماط تخطيط الصفحة المشتركة لكل شاشات القبول (مصدر CSS وحيد — بلا تكرار).
 * تُمرَّر ضمن styles[] لكل مكوّن. تعتمد رموز التصميم فقط.
 */
export const ADM_PAGE_STYLES = `
  .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .filter-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
  .search { flex: 1; min-width: 240px; height: 34px; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); display: flex; align-items: center; padding: 0 12px; }
  .search input { flex: 1; border: none; background: transparent; outline: none; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); }
  .search input::placeholder { color: var(--nb-text-faint); }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
  .field select { height: 34px; min-width: 170px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
  .row-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .nb-btn-primary.sm, .nb-btn-secondary.sm, .nb-btn-ghost.sm, .nb-btn-danger.sm { height: 26px; padding: 0 12px; font-size: 12px; }
`;

/** إجراء انتقال حالة في طابور المتقدمين */
export interface QueueAction {
  label: string;
  kind: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** الحالة الهدف عند الضغط (PATCH applicants/:id { status }) */
  toStatus: string;
}
