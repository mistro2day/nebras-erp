import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';
import { AdmissionsService } from '../admissions.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admissions-enrollment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="تسجيل المقبولين"
      subtitle="إتمام تسجيل المتقدمين المقبولين وتحويلهم إلى طلاب مُسجّلين للعام الدراسي."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا يوجد متقدمون مقبولون بانتظار التسجيل."
      (actioned)="onAction($event)"
    ></app-applicant-queue>
  `,
})
export class AdmissionsEnrollmentComponent {
  private readonly dialog = inject(MatDialog);
  private readonly svc = inject(AdmissionsService);

  statuses = ['accepted'];
  actions: QueueAction[] = [
    { label: 'إتمام التسجيل', kind: 'primary', toStatus: 'enrolled' },
  ];

  onAction({ row }: { row: Record<string, any> }): void {
    const name = row['arabic_full_name'] || '';

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد التسجيل',
        message: `إتمام تسجيل <strong>${name}</strong> كطالب؟`,
        confirmText: 'تسجيل',
        color: 'primary',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.svc.setApplicantStatus(row['id'], 'enrolled').subscribe();
    });
  }
}
