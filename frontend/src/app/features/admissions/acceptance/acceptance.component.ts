import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';

/**
 * قرارات القبول — الطلبات قيد المراجعة/بعد المقابلة، لاتخاذ قرار القبول النهائي.
 * بيانات حقيقية: admissions/applicants (PATCH status).
 */
@Component({
  selector: 'app-admissions-acceptance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="قرارات القبول"
      subtitle="اتخاذ القرار النهائي للطلبات المكتملة المراجعة والمقابلة: قبول، إدراج بقائمة الانتظار، أو رفض."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا توجد طلبات جاهزة لاتخاذ قرار القبول."
    ></app-applicant-queue>
  `,
})
export class AdmissionsAcceptanceComponent {
  statuses = ['under_review', 'interview_scheduled'];
  actions: QueueAction[] = [
    { label: 'قبول', kind: 'primary', toStatus: 'accepted' },
    { label: 'قائمة الانتظار', kind: 'secondary', toStatus: 'waitlist' },
    { label: 'رفض', kind: 'danger', toStatus: 'rejected' },
  ];
}
