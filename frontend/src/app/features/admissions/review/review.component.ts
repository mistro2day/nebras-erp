import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';

/**
 * مراجعة الطلبات — الطلبات المُقدّمة/قيد المراجعة مع إجراءات الانتقال.
 * بيانات حقيقية: admissions/applicants (PATCH status).
 */
@Component({
  selector: 'app-admissions-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="مراجعة طلبات الالتحاق"
      subtitle="الطلبات المُقدّمة وقيد المراجعة — التدقيق واتخاذ القرار المبدئي وجدولة المقابلات."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا توجد طلبات بانتظار المراجعة."
    ></app-applicant-queue>
  `,
})
export class AdmissionsReviewComponent {
  statuses = ['submitted', 'under_review'];
  actions: QueueAction[] = [
    { label: 'جدولة مقابلة', kind: 'primary', toStatus: 'interview_scheduled' },
    { label: 'قبول', kind: 'secondary', toStatus: 'accepted' },
    { label: 'رفض', kind: 'danger', toStatus: 'rejected' },
  ];
}
