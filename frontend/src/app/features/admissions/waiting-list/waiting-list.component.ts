import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';
import { AdmissionsService } from '../admissions.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admissions-waiting-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatSnackBarModule, ApplicantQueueComponent],
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
  private readonly snack = inject(MatSnackBar);
  private readonly svc = inject(AdmissionsService);

  @ViewChild(ApplicantQueueComponent) queue?: ApplicantQueueComponent;

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
      const obs = action.toStatus === 'accepted' ? this.svc.acceptApplicant(row['id']) : this.svc.rejectApplicant(row['id']);
      obs.subscribe({
        next: (res) => { this.snack.open(res?.message || 'تم تنفيذ الإجراء.', 'إغلاق', { duration: 4000 }); this.queue?.load(); },
        error: (e) => this.snack.open(e?.error?.message || 'تعذّر تنفيذ الإجراء.', 'إغلاق', { duration: 5000 }),
      });
    });
  }
}
