import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';
import { AdmissionsService } from '../admissions.service';
import { InterviewScheduleDialogComponent, InterviewScheduleResult } from '../../../shared/components/interview-schedule-dialog/interview-schedule-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * مراجعة طلبات الالتحاق — صفحة إجراءات كاملة:
 * جدولة مقابلة مع حوار/نموذج، قبول/رفض مع تأكيد، وإحصائيات.
 */
@Component({
  selector: 'app-admissions-review',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="مراجعة طلبات الالتحاق"
      subtitle="الطلبات المُقدّمة وقيد المراجعة — التدقيق واتخاذ القرار المبدئي وجدولة المقابلات."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا توجد طلبات بانتظار المراجعة."
      (actioned)="onAction($event)"
    ></app-applicant-queue>
  `,
})
export class AdmissionsReviewComponent {
  private readonly dialog = inject(MatDialog);
  private readonly svc = inject(AdmissionsService);

  statuses = ['submitted', 'under_review'];
  actions: QueueAction[] = [
    { label: 'إعادة للمراجعة', kind: 'ghost', toStatus: 'under_review' },
    { label: 'جدولة مقابلة', kind: 'primary', toStatus: 'interview_scheduled' },
    { label: 'قبول', kind: 'secondary', toStatus: 'accepted' },
    { label: 'قائمة انتظار', kind: 'secondary', toStatus: 'waitlist' },
    { label: 'رفض', kind: 'danger', toStatus: 'rejected' },
  ];

  onAction({ row, action }: { row: Record<string, any>; action: QueueAction }): void {
    const name = row['arabic_full_name'] || '';

    if (action.toStatus === 'interview_scheduled') {
      this.openScheduleDialog(row, name);
    } else if (action.toStatus === 'rejected') {
      this.confirmTransition(row, action, `رفض طلب <strong>${name}</strong>؟`, 'رفض');
    } else if (action.toStatus === 'accepted') {
      this.confirmTransition(row, action, `قبول طلب <strong>${name}</strong>؟`, 'قبول');
    } else if (action.toStatus === 'waitlist') {
      this.confirmTransition(row, action, `نقل <strong>${name}</strong> إلى قائمة الانتظار؟`, 'قائمة انتظار');
    } else {
      this.applyTransition(row, action);
    }
  }

  private openScheduleDialog(row: Record<string, any>, name: string): void {
    const ref = this.dialog.open(InterviewScheduleDialogComponent, {
      width: '480px',
      data: { applicantName: name },
    });

    ref.afterClosed().subscribe((res: InterviewScheduleResult | null) => {
      if (!res) return;
      this.svc.scheduleInterview(row['id'], res).subscribe({
        next: () => {},
        error: () => {},
      });
    });
  }

  private confirmTransition(row: Record<string, any>, action: QueueAction, message: string, confirmText: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد الإجراء',
        message,
        confirmText,
        color: action.kind === 'danger' ? 'warn' : 'primary',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.applyTransition(row, action);
    });
  }

  private applyTransition(row: Record<string, any>, action: QueueAction): void {
    const id = row['id'];
    const s = action.toStatus;
    let obs;
    if (s === 'accepted') obs = this.svc.acceptApplicant(id);
    else if (s === 'rejected') obs = this.svc.rejectApplicant(id);
    else if (s === 'waitlist') obs = this.svc.setWaitlist(id);
    else if (s === 'under_review') obs = this.svc.setUnderReview(id);
    else if (s === 'interview_scheduled') obs = this.svc.setApplicantStatus(id, s);
    else obs = this.svc.setApplicantStatus(id, s);

    obs?.subscribe({ next: () => {}, error: () => {} });
  }
}
