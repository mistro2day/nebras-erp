import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  AdmissionsService, Applicant, Guardian, RequiredDocument, Interview, PlacementTest,
} from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import {
  ADM_PAGE_STYLES, DOC_STATUS_TEXT, INTERVIEW_STATUS_TEXT,
  applicantStatusKind, applicantStatusText, docStatusKind, interviewStatusKind, pickList,
} from '../shared/admissions.shared';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InterviewScheduleDialogComponent, InterviewScheduleResult } from '../../../shared/components/interview-schedule-dialog/interview-schedule-dialog.component';

const RELATION_TEXT: Record<string, string> = {
  father: 'أب', mother: 'أم', guardian: 'ولي أمر', sponsor: 'كفيل',
};

/**
 * تفاصيل طلب الالتحاق — بيانات المتقدم وأولياء الأمور والمستندات والمقابلات واختبارات تحديد المستوى.
 * بيانات حقيقية: admissions/applicants/:id + guardians|documents|interviews|placement-tests (تُرشّح حسب المتقدم).
 */
@Component({
  selector: 'app-application-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbDataTableComponent],
  template: `
    @if (applicant(); as a) {
      <div class="page" dir="rtl">
        <nb-page-header [title]="a.arabic_full_name" [subtitle]="'رقم الطلب: ' + a.application_number">
          <button class="nb-btn-ghost" (click)="back()">عودة للقائمة</button>
          <button class="nb-btn-primary" (click)="scheduleInterview()">جدولة مقابلة</button>
          <button class="nb-btn-primary" (click)="setStatus('accepted')">قبول</button>
          <button class="nb-btn-secondary" (click)="setStatus('waitlist')">قائمة الانتظار</button>
          <button class="nb-btn-danger" (click)="setStatus('rejected')">رفض</button>
        </nb-page-header>

        <div class="meta-row">
          <span [class]="'nb-badge-' + statusKind(a.status)">{{ statusText(a.status) }}</span>
          <span class="muted">الجنسية: {{ a.nationality }}</span>
          <span class="muted">الجنس: {{ a.gender === 'male' ? 'ذكر' : 'أنثى' }}</span>
          <span class="muted">تاريخ الميلاد: {{ a.date_of_birth }}</span>
        </div>

        <nb-panel title="بيانات المتقدم">
          <div class="info-grid">
            <div class="info-item"><strong>الرقم الوطني / الجواز:</strong> {{ a.national_id || '—' }}</div>
            <div class="info-item"><strong>رقم الجواز:</strong> {{ a.passport_number || '—' }}</div>
            <div class="info-item"><strong>الديانة:</strong> {{ a.religion || '—' }}</div>
            <div class="info-item"><strong>فصيلة الدم:</strong> {{ a.blood_group || '—' }}</div>
            <div class="info-item"><strong>المدرسة السابقة:</strong> {{ a.previous_school || '—' }}</div>
            <div class="info-item"><strong>الصف السابق:</strong> {{ a.previous_grade || '—' }}</div>
            <div class="info-item"><strong>احتياجات خاصة:</strong> {{ a.special_needs || 'لا يوجد' }}</div>
            <div class="info-item"><strong>ملاحظات:</strong> {{ a.notes || '—' }}</div>
          </div>
        </nb-panel>

        <div class="two-col">
          <nb-panel title="أولياء الأمور" [flush]="true">
            <nb-data-table [columns]="guardianCols" [rows]="guardians()" emptyText="لا يوجد أولياء أمور مسجلون.">
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('relationship') { {{ relationText(row.relationship) }} }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>

          <nb-panel title="المستندات" [flush]="true">
            <nb-data-table [columns]="docCols" [rows]="documents()" emptyText="لا توجد مستندات مرفوعة.">
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('verification_status') { <span [class]="'nb-badge-' + docKind(row.verification_status)">{{ docText(row.verification_status) }}</span> }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>
        </div>

        <div class="two-col">
          <nb-panel title="المقابلات الشخصية" [flush]="true">
            <nb-data-table [columns]="interviewCols" [rows]="interviews()" emptyText="لا توجد مقابلات مجدولة.">
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('scheduled_at') { {{ row.scheduled_at | date:'yyyy-MM-dd HH:mm' }} }
                  @case ('status') { <span [class]="'nb-badge-' + interviewKind(row.status)">{{ interviewText(row.status) }}</span> }
                  @case ('evaluation_score') { {{ row.evaluation_score ?? '—' }} }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>

          <nb-panel title="اختبارات تحديد المستوى" [flush]="true">
            <nb-data-table [columns]="placementCols" [rows]="placements()" emptyText="لا توجد اختبارات مسجلة.">
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('marks') { {{ row.marks_obtained ?? '—' }} / {{ row.passing_marks ?? '—' }} }
                  @case ('result_status') { <span [class]="'nb-badge-' + placementKind(row.result_status)">{{ placementText(row.result_status) }}</span> }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>
        </div>
      </div>
    } @else {
      <div class="page" dir="rtl"><div class="loading">جارٍ تحميل بيانات الطلب…</div></div>
    }
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .meta-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
      .muted { color: var(--nb-text-muted); font-size: 12px; }
      .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
      .info-item {
        background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft);
        padding: 12px; border-radius: var(--nb-radius); font-size: 13px; color: var(--nb-text);
      }
      .info-item strong { color: var(--nb-text-muted); font-weight: 600; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
      .two-col nb-panel { margin: 0; }
      @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
      .loading { text-align: center; padding: 40px; color: var(--nb-text-muted); font-size: 13px; }
    `,
  ],
})
export class ApplicationDetailsComponent implements OnInit {
  private readonly service = inject(AdmissionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  readonly applicant = signal<Applicant | null>(null);
  readonly guardians = signal<Guardian[]>([]);
  readonly documents = signal<RequiredDocument[]>([]);
  readonly interviews = signal<Interview[]>([]);
  readonly placements = signal<PlacementTest[]>([]);

  private id = '';

  readonly guardianCols: NbColumn[] = [
    { key: 'relationship', label: 'صلة القرابة', fr: 0.8 },
    { key: 'full_name', label: 'الاسم', fr: 1.4 },
    { key: 'phone', label: 'الهاتف', fr: 1 },
    { key: 'email', label: 'البريد', fr: 1.4 },
  ];
  readonly docCols: NbColumn[] = [
    { key: 'document_name', label: 'المستند', fr: 2 },
    { key: 'verification_status', label: 'الحالة', fr: 1 },
  ];
  readonly interviewCols: NbColumn[] = [
    { key: 'scheduled_at', label: 'الموعد', fr: 1.4 },
    { key: 'status', label: 'الحالة', fr: 0.9 },
    { key: 'evaluation_score', label: 'الدرجة', fr: 0.7 },
  ];
  readonly placementCols: NbColumn[] = [
    { key: 'exam_type', label: 'نوع الاختبار', fr: 1.6 },
    { key: 'marks', label: 'الدرجة / النجاح', fr: 1 },
    { key: 'result_status', label: 'النتيجة', fr: 0.9 },
  ];

  statusText = applicantStatusText;
  statusKind = applicantStatusKind;
  docText = (s: string) => DOC_STATUS_TEXT[s] || s;
  docKind = docStatusKind;
  interviewText = (s: string) => INTERVIEW_STATUS_TEXT[s] || s;
  interviewKind = interviewStatusKind;
  relationText = (r: string) => RELATION_TEXT[r] || r;
  placementText = (s: string) => ({ passed: 'ناجح', failed: 'راسب', pending: 'قيد المعالجة' }[s] || s);
  placementKind = (s: string): 'success' | 'danger' | 'warning' =>
    s === 'passed' ? 'success' : s === 'failed' ? 'danger' : 'warning';

  ngOnInit(): void {
    this.route.params.subscribe((p) => {
      this.id = p['id'];
      if (this.id) this.loadAll();
    });
  }

  private loadAll(): void {
    this.service.getApplicant(this.id).subscribe((res) => this.applicant.set(res?.data ?? res ?? null));
    this.service.getGuardians().subscribe((res) => this.guardians.set(pickList<Guardian>(res).filter((g) => g.applicant === this.id)));
    this.service.getDocuments().subscribe((res) => this.documents.set(pickList<RequiredDocument>(res).filter((d) => d.applicant === this.id)));
    this.service.getInterviews().subscribe((res) => this.interviews.set(pickList<Interview>(res).filter((i) => i.applicant === this.id)));
    this.service.getPlacementTests().subscribe((res) => this.placements.set(pickList<PlacementTest>(res).filter((t) => t.applicant === this.id)));
  }

  setStatus(status: string): void {
    const name = this.applicant()?.arabic_full_name || '';
    const actionLabel = status === 'accepted' ? 'قبول' : status === 'rejected' ? 'رفض' : status === 'waitlist' ? 'قائمة انتظار' : status;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'تأكيد الإجراء',
        message: `تغيير حالة الطلب إلى <strong>${actionLabel}</strong>؟`,
        confirmText: actionLabel,
        color: status === 'rejected' ? 'warn' : 'primary',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;

      let obs;
      if (status === 'accepted') obs = this.service.acceptApplicant(this.id);
      else if (status === 'rejected') obs = this.service.rejectApplicant(this.id);
      else if (status === 'waitlist') obs = this.service.setWaitlist(this.id);
      else if (status === 'under_review') obs = this.service.setUnderReview(this.id);
      else if (status === 'interview_scheduled') obs = this.service.setApplicantStatus(this.id, status);
      else obs = this.service.setApplicantStatus(this.id, status);

      obs?.subscribe((res) => {
        const d = res?.data ?? { ...(this.applicant() as Applicant), status };
        this.applicant.set(d);
      });
    });
  }

  scheduleInterview(): void {
    const name = this.applicant()?.arabic_full_name || '';
    const ref = this.dialog.open(InterviewScheduleDialogComponent, {
      width: '480px',
      data: { applicantName: name },
    });

    ref.afterClosed().subscribe((res: InterviewScheduleResult | null) => {
      if (!res) return;
      this.service.scheduleInterview(this.id, res).subscribe((data) => {
        this.loadAll();
      });
    });
  }

  back(): void {
    this.router.navigate(['/admissions/applications']);
  }
}
