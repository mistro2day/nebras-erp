import { ChangeDetectionStrategy, Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApplicantQueueComponent } from '../shared/applicant-queue.component';
import { QueueAction } from '../shared/admissions.shared';
import { AdmissionsService } from '../admissions.service';
import { EnrollmentDialogComponent } from './enrollment-dialog.component';

/**
 * تسجيل المقبولين — الخطوة الختامية لدورة القبول:
 * «إتمام التسجيل» يفتح نافذة الفوترة وتحديد الرسوم وخطة الأقساط وإصدار الإيصال الفوري
 * ويحوّل المتقدم المقبول إلى طالب فعلي.
 */
@Component({
  selector: 'app-admissions-enrollment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatSnackBarModule, ApplicantQueueComponent],
  template: `
    <app-applicant-queue
      title="تسجيل المقبولين"
      subtitle="إتمام تسجيل المتقدمين المقبولين وتحويلهم إلى طلاب مُسجّلين وتحديد خطط الرسوم والأقساط وإصدار إيصالات السداد."
      [statuses]="statuses"
      [actions]="actions"
      emptyText="لا يوجد متقدمون مقبولون بانتظار التسجيل."
      (actioned)="onAction($event)"
    ></app-applicant-queue>
  `,
})
export class AdmissionsEnrollmentComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly svc = inject(AdmissionsService);

  @ViewChild(ApplicantQueueComponent) queue?: ApplicantQueueComponent;

  statuses = ['accepted'];
  actions: QueueAction[] = [
    { label: 'إتمام التسجيل والفوترة', kind: 'primary', toStatus: 'enrolled' },
  ];

  onAction({ row }: { row: Record<string, any> }): void {
    const name = row['arabic_full_name'] || '';

    const ref = this.dialog.open(EnrollmentDialogComponent, {
      width: '850px',
      maxWidth: '95vw',
      data: { applicant: row },
    });

    ref.afterClosed().subscribe((res: any) => {
      if (!res || !res.confirmed) return;
      this.svc.enrollApplicantAsStudent(row['id'], res.financial_config).subscribe({
        next: (response) => {
          const num = response?.data?.student_number || '';
          this.snack.open(
            num ? `تم تسجيل «${name}» بنجاح — الرقم المدرسي: ${num}` : `تم تسجيل «${name}» بنجاح.`,
            'إغلاق', { duration: 6000 },
          );
          this.queue?.load();
        },
        error: (e) => {
          this.snack.open(e?.error?.message || 'تعذّر إتمام التسجيل. حاول مجددًا.', 'إغلاق', { duration: 6000 });
        },
      });
    });
  }
}
