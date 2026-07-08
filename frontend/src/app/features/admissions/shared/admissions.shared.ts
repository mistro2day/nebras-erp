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
  accepted: 'مقبول',
  rejected: 'مرفوض',
  enrolled: 'مُسجّل',
  waitlist: 'قائمة الانتظار',
};

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
