import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';

/**
 * تسجيل المقبولين — تحويل المتقدمين المقبولين إلى مُسجّلين.
 * بيانات حقيقية: admissions/applicants (PATCH status = enrolled).
 * ملاحظة تكامل مستقبلي: يمكن لاحقاً ربط زر التسجيل بإنشاء سجل طالب فعلي عبر موديول الطلاب.
 */
@Component({
  selector: 'app-admissions-enrollment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="تسجيل المقبولين"
      subtitle="إتمام تسجيل المتقدمين المقبولين وتحويلهم إلى طلاب مُسجّلين للعام الدراسي."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا يوجد متقدمون مقبولون بانتظار التسجيل."
    ></app-applicant-queue>
  `,
})
export class AdmissionsEnrollmentComponent {
  statuses = ['accepted'];
  actions: QueueAction[] = [
    { label: 'إتمام التسجيل', kind: 'primary', toStatus: 'enrolled' },
  ];
}
