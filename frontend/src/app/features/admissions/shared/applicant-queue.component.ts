import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdmissionsService, Applicant } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import {
  ADM_PAGE_STYLES,
  QueueAction,
  applicantStatusKind,
  applicantStatusText,
  pickList,
} from './admissions.shared';
import { SendMessageModalComponent } from '../../communications/components/send-message-modal.component';

/**
 * طابور المتقدمين القابل لإعادة الاستخدام — محرّك مشترك لشاشات:
 * قائمة الطلبات، المراجعة، القبول، التسجيل، قائمة الانتظار.
 * يعرض جدولاً مؤسسياً (nb-data-table) مع تصفية وبحث وأزرار انتقال حالة حقيقية (PATCH).
 * كل الشاشات تُبنى فوقه لتفادي تكرار المكوّنات وCSS.
 */
@Component({
  selector: 'app-applicant-queue',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent, NbDataTableComponent, SendMessageModalComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header [title]="title" [subtitle]="subtitle">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        @if (createLink) {
          <button class="nb-btn-primary" (click)="goCreate()">تسجيل طلب جديد</button>
        }
      </nb-page-header>

      @if (showStats) {
        <div class="stats-grid">
          <nb-stat-card label="عدد الطلبات المعروضة" [value]="filtered().length"></nb-stat-card>
          <nb-stat-card label="إجمالي المتقدمين" [value]="applicants().length"></nb-stat-card>
        </div>
      }

      <div class="filter-bar">
        <div class="search">
          <input type="text" [(ngModel)]="search" (input)="onFilter()" aria-label="البحث في الطلبات" placeholder="البحث بالاسم أو رقم الطلب أو الهوية…" />
        </div>
        <div class="field">
          <label>الحالة</label>
          <select [(ngModel)]="statusFilter" (change)="onFilter()">
            <option value="">الكل</option>
            @for (s of statusOptions(); track s) {
              <option [value]="s">{{ statusText(s) }}</option>
            }
          </select>
        </div>
      </div>

      <nb-panel [flush]="true">
        <nb-data-table [columns]="columns" [rows]="filtered()" [emptyText]="emptyText" [loading]="loading()" [loadingText]="loadingText" (rowClick)="open($event)">
          <ng-template #cell let-row let-col="col" let-value="value">
            @switch (col.key) {
              @case ('status') {
                <span [class]="'nb-badge-' + statusKind(row.status)">{{ statusText(row.status) }}</span>
              }
              @case ('grade_name') {
                <span class="nb-grade-tag">{{ row.grade_name || '—' }}</span>
              }
              @case ('guardian_name') {
                <span class="guardian-txt">{{ row.guardian_name || row.guardians?.[0]?.full_name || '—' }}</span>
              }
              @case ('guardian_phone') {
                @if (row.guardian_phone || row.guardians?.[0]?.whatsapp_phone || row.guardians?.[0]?.phone) {
                  <span class="phone-chip" dir="ltr">📞 {{ row.guardian_phone || row.guardians?.[0]?.whatsapp_phone || row.guardians?.[0]?.phone }}</span>
                } @else {
                  <span style="color:var(--nb-text-muted)">—</span>
                }
              }
              @case ('gender') {
                {{ row.gender === 'male' ? 'ذكر' : 'أنثى' }}
              }
              @case ('actions') {
                <span class="row-actions">
                  <button class="nb-btn-ghost sm" (click)="openMessageModal(row); $event.stopPropagation()">💬 رسالة</button>
                  <button class="nb-btn-ghost sm" (click)="open(row); $event.stopPropagation()">عرض</button>
                  @for (a of actions; track a.toStatus) {
                    <button [class]="'nb-btn-' + a.kind + ' sm'" (click)="onAction(row, a); $event.stopPropagation()">{{ a.label }}</button>
                  }
                </span>
              }
              @default { {{ value }} }
            }
          </ng-template>
        </nb-data-table>
      </nb-panel>

      <app-send-message-modal
        [(open)]="showMsgModal"
        [recipientName]="selectedApplicant()?.arabic_full_name || ''"
        [recipientPhone]="selectedApplicant()?.phone || selectedApplicant()?.guardian?.phone || ''"
        [recipientEmail]="selectedApplicant()?.email || selectedApplicant()?.guardian?.email || ''"
        [contextVariables]="{ applicant_name: selectedApplicant()?.arabic_full_name, app_number: selectedApplicant()?.application_number }"
      ></app-send-message-modal>

    </div>
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .nb-grade-tag {
        font-size: 12px;
        font-weight: 700;
        color: var(--nb-primary);
        background: color-mix(in srgb, var(--nb-primary) 10%, transparent);
        padding: 3px 8px;
        border-radius: 4px;
        display: inline-block;
        white-space: nowrap;
      }
      .guardian-txt {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--nb-text);
      }
      .phone-chip {
        font-size: 12px;
        font-weight: 700;
        color: #16a34a;
        background: #f0fdf4;
        padding: 2px 7px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid #bbf7d0;
        white-space: nowrap;
      }
    `,
  ],
})
export class ApplicantQueueComponent implements OnInit {
  private readonly service = inject(AdmissionsService);
  private readonly router = inject(Router);

  @Input() title = 'قائمة الطلبات';
  @Input() subtitle = '';
  /** حالات المتقدم المسموح عرضها (فارغة = الكل) */
  @Input() statuses: string[] = [];
  /** أزرار انتقال الحالة المتاحة في كل صف */
  @Input() actions: QueueAction[] = [];
  @Input() emptyText = 'لا توجد طلبات مطابقة.';
  @Input() loadingText = 'جارٍ تحميل طلبات التحاق المتقدمين…';
  @Input() showStats = true;
  /** عند تمريره يظهر زر «تسجيل طلب جديد» ويوجّه إلى هذا المسار (تسجيل يدوي من المشرف) */
  @Input() createLink?: string;
  @Output() actioned = new EventEmitter<{ row: Record<string, any>; action: QueueAction }>();

  readonly applicants = signal<Applicant[]>([]);
  readonly loading = signal(true);
  search = '';
  statusFilter = '';
  private readonly filterTick = signal(0);

  readonly columns: NbColumn[] = [
    { key: 'application_number', label: 'رقم الطلب', fr: 0.9 },
    { key: 'arabic_full_name', label: 'اسم المتقدم', fr: 1.4 },
    { key: 'grade_name', label: 'الصف المتقدم له', fr: 1.2 },
    { key: 'guardian_name', label: 'ولي الأمر', fr: 1.3 },
    { key: 'guardian_phone', label: 'رقم الجوال', fr: 1.1 },
    { key: 'gender', label: 'الجنس', fr: 0.6 },
    { key: 'status', label: 'الحالة', fr: 0.9 },
    { key: 'actions', label: 'إجراءات', fr: 1.4 },
  ];

  readonly filtered = computed(() => {
    this.filterTick();
    const q = this.search.trim().toLowerCase();
    return this.applicants().filter((a) => {
      if (this.statuses.length && !this.statuses.includes(a.status)) return false;
      if (this.statusFilter && a.status !== this.statusFilter) return false;
      if (q) {
        const gName = a.guardian_name || a.guardians?.[0]?.full_name || '';
        const gPhone = a.guardian_phone || a.guardians?.[0]?.whatsapp_phone || a.guardians?.[0]?.phone || '';
        const grade = a.grade_name || '';
        const hay = `${a.arabic_full_name} ${a.english_full_name ?? ''} ${a.application_number} ${a.national_id} ${grade} ${gName} ${gPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  readonly statusOptions = computed(() =>
    this.statuses.length ? this.statuses : Array.from(new Set(this.applicants().map((a) => a.status)))
  );

  statusText = applicantStatusText;
  statusKind = applicantStatusKind;

  showMsgModal = false;
  selectedApplicant = signal<any | null>(null);

  openMessageModal(row: any) {
    this.selectedApplicant.set(row);
    this.showMsgModal = true;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getApplicants().subscribe({
      next: (res) => {
        this.applicants.set(pickList<Applicant>(res));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onFilter(): void {
    this.filterTick.update((n) => n + 1);
  }

  goCreate(): void {
    if (this.createLink) this.router.navigateByUrl(this.createLink);
  }

  open(row: Record<string, any>): void {
    this.router.navigate(['/admissions/applications', row['id']]);
  }

  transition(row: Record<string, any>, action: QueueAction): void {
    this.service.updateApplicant(row['id'], { status: action.toStatus }).subscribe(() => this.load());
  }

  onAction(row: Record<string, any>, action: QueueAction): void {
    this.actioned.emit({ row, action });
  }
}
