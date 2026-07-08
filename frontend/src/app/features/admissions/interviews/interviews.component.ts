import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdmissionsService, Applicant, Interview } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import { ADM_PAGE_STYLES, INTERVIEW_STATUS_TEXT, interviewStatusKind, pickList } from '../shared/admissions.shared';

/**
 * المقابلات الشخصية — جدولة وتقييم مقابلات المتقدمين.
 * بيانات حقيقية: admissions/interviews (PATCH status/evaluation_score) + admissions/applicants لأسماء المتقدمين.
 */
@Component({
  selector: 'app-admissions-interviews',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent, NbDataTableComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="المقابلات الشخصية"
        subtitle="متابعة المقابلات المجدولة، رصد درجات التقييم، وإنهاء أو إلغاء المقابلات."
      >
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي المقابلات" [value]="interviews().length"></nb-stat-card>
        <nb-stat-card label="مجدولة" [value]="countBy('scheduled')" valueKind="info"></nb-stat-card>
        <nb-stat-card label="مكتملة" [value]="countBy('completed')" valueKind="success"></nb-stat-card>
      </div>

      <div class="filter-bar">
        <div class="field">
          <label>حالة المقابلة</label>
          <select [(ngModel)]="statusFilter" (change)="tick()">
            <option value="">الكل</option>
            <option value="scheduled">مجدولة</option>
            <option value="completed">مكتملة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>
      </div>

      <nb-panel [flush]="true">
        <nb-data-table [columns]="columns" [rows]="filtered()" emptyText="لا توجد مقابلات مطابقة.">
          <ng-template #cell let-row let-col="col" let-value="value">
            @switch (col.key) {
              @case ('applicant') { <span class="strong">{{ applicantName(row.applicant) }}</span> }
              @case ('interviewer_name') { {{ row.interviewer_name || 'المستخدم الحالي' }} }
              @case ('scheduled_at') { {{ row.scheduled_at | date:'yyyy-MM-dd HH:mm' }} }
              @case ('evaluation_score') {
                <input class="score-input" type="number" min="0" max="100" [(ngModel)]="row.evaluation_score"
                       (change)="saveScore(row)" aria-label="درجة تقييم المقابلة" placeholder="—" />
              }
              @case ('status') { <span [class]="'nb-badge-' + statusKind(row.status)">{{ statusText(row.status) }}</span> }
              @case ('actions') {
                <span class="row-actions">
                  @if (row.status === 'scheduled') {
                    <button class="nb-btn-primary sm" (click)="setStatus(row, 'completed')">إنهاء</button>
                    <button class="nb-btn-danger sm" (click)="setStatus(row, 'cancelled')">إلغاء</button>
                  }
                </span>
              }
              @default { {{ value }} }
            }
          </ng-template>
        </nb-data-table>
      </nb-panel>
    </div>
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .strong { font-weight: 600; }
      .score-input {
        width: 72px; height: 28px; padding: 0 8px;
        border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
        background: var(--nb-surface); color: var(--nb-text);
        font-family: var(--nb-font-family); font-size: 13px; outline: none;
        font-variant-numeric: tabular-nums;
      }
      .score-input:focus { border-color: var(--nb-primary-400); box-shadow: var(--nb-focus-ring); }
    `,
  ],
})
export class AdmissionsInterviewsComponent implements OnInit {
  private readonly service = inject(AdmissionsService);

  readonly interviews = signal<Interview[]>([]);
  private readonly applicantMap = signal<Record<string, string>>({});
  statusFilter = '';
  private readonly filterTick = signal(0);

  readonly columns: NbColumn[] = [
    { key: 'applicant', label: 'المتقدم', fr: 1.4 },
    { key: 'interviewer_name', label: 'المُقابل', fr: 1.2 },
    { key: 'scheduled_at', label: 'موعد المقابلة', fr: 1.3 },
    { key: 'evaluation_score', label: 'درجة التقييم', fr: 1 },
    { key: 'status', label: 'الحالة', fr: 0.9 },
    { key: 'actions', label: 'إجراءات', fr: 1.2 },
  ];

  readonly filtered = computed(() => {
    this.filterTick();
    return this.interviews().filter((i) => !this.statusFilter || i.status === this.statusFilter);
  });

  statusText = (s: string) => INTERVIEW_STATUS_TEXT[s] || s;
  statusKind = interviewStatusKind;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.getInterviews().subscribe((res) => this.interviews.set(pickList<Interview>(res)));
    // أسماء المتقدمين من نقطة النهاية الحقيقية (المقابلة تحمل معرّف المتقدم فقط)
    this.service.getApplicants().subscribe((res) => {
      const map: Record<string, string> = {};
      pickList<Applicant>(res).forEach((a) => (map[a.id] = a.arabic_full_name));
      this.applicantMap.set(map);
    });
  }

  tick(): void {
    this.filterTick.update((n) => n + 1);
  }

  countBy(status: string): number {
    return this.interviews().filter((i) => i.status === status).length;
  }

  applicantName(id: string): string {
    return this.applicantMap()[id] || `متقدم ${(id || '').slice(0, 8)}…`;
  }

  setStatus(row: Record<string, any>, status: string): void {
    this.service.updateInterview(row['id'], { status }).subscribe(() => this.load());
  }

  saveScore(row: Record<string, any>): void {
    const score = row['evaluation_score'];
    if (score === null || score === undefined || score === '') return;
    this.service.updateInterview(row['id'], { evaluation_score: Number(score) }).subscribe();
  }
}
