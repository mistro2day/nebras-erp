import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';

/**
 * قائمة الانتظار — المتقدمون المدرجون بالانتظار، لترقيتهم للقبول أو رفضهم.
 * بيانات حقيقية: admissions/applicants (PATCH status).
 */
@Component({
  selector: 'app-admissions-waiting-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="قائمة الانتظار"
      subtitle="المتقدمون المدرجون في قائمة الانتظار — ترقيتهم للقبول عند توفر مقعد أو استبعادهم."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="قائمة الانتظار فارغة حالياً."
    ></app-applicant-queue>
  `,
})
export class AdmissionsWaitingListComponent {
  statuses = ['waitlist'];
  actions: QueueAction[] = [
    { label: 'ترقية للقبول', kind: 'primary', toStatus: 'accepted' },
    { label: 'رفض', kind: 'danger', toStatus: 'rejected' },
  ];
}
