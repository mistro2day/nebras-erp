import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';
import { AdmissionsService } from '../admissions.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admissions-acceptance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="قرارات القبول"
      subtitle="اتخاذ القرار النهائي للطلبات المكتملة المراجعة والمقابلة: قبول، إدراج بقائمة الانتظار، أو رفض."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا توجد طلبات جاهزة لاتخاذ قرار القبول."
      (actioned)="onAction($event)"
    ></app-applicant-queue>
  `,
})
export class AdmissionsAcceptanceComponent {
  private readonly dialog = inject(MatDialog);
  private readonly svc = inject(AdmissionsService);

  statuses = ['under_review', 'interview_scheduled'];
  actions: QueueAction[] = [
    { label: 'قبول', kind: 'primary', toStatus: 'accepted' },
    { label: 'قائمة الانتظار', kind: 'secondary', toStatus: 'waitlist' },
    { label: 'رفض', kind: 'danger', toStatus: 'rejected' },
  ];

  onAction({ row, action }: { row: Record<string, any>; action: QueueAction }): void {
    const name = row['arabic_full_name'] || '';
    const message = action.toStatus === 'accepted'
      ? `قبول طلب <strong>${name}</strong>؟`
      : action.toStatus === 'waitlist'
        ? `نقل <strong>${name}</strong> إلى قائمة الانتظار؟`
        : `رفض طلب <strong>${name}</strong>؟`;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد الإجراء',
        message,
        confirmText: action.label,
        color: action.kind === 'danger' ? 'warn' : 'primary',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      if (action.toStatus === 'accepted') this.svc.acceptApplicant(row['id']).subscribe();
      else if (action.toStatus === 'waitlist') this.svc.setWaitlist(row['id']).subscribe();
      else if (action.toStatus === 'rejected') this.svc.rejectApplicant(row['id']).subscribe();
    });
  }
}
