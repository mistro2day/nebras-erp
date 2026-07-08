import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';
import { AdmissionsService } from '../admissions.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admissions-waiting-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="قائمة الانتظار"
      subtitle="المتقدمون المدرجون في قائمة الانتظار — ترقيتهم للقبول عند توفر مقعد أو استبعادهم."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="قائمة الانتظار فارغة حالياً."
      (actioned)="onAction($event)"
    ></app-applicant-queue>
  `,
})
export class AdmissionsWaitingListComponent {
  private readonly dialog = inject(MatDialog);
  private readonly svc = inject(AdmissionsService);

  statuses = ['waitlist'];
  actions: QueueAction[] = [
    { label: 'ترقية للقبول', kind: 'primary', toStatus: 'accepted' },
    { label: 'رفض', kind: 'danger', toStatus: 'rejected' },
  ];

  onAction({ row, action }: { row: Record<string, any>; action: QueueAction }): void {
    const name = row['arabic_full_name'] || '';
    const message = action.toStatus === 'accepted'
      ? `ترقية <strong>${name}</strong> للقبول؟`
      : `رفض <strong>${name}</strong> نهائياً؟`;

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
      else if (action.toStatus === 'rejected') this.svc.rejectApplicant(row['id']).subscribe();
    });
  }
}
