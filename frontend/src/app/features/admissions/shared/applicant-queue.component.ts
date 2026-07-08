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
  imports: [FormsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent, NbDataTableComponent],
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
        <nb-data-table [columns]="columns" [rows]="filtered()" [emptyText]="emptyText" (rowClick)="open($event)">
          <ng-template #cell let-row let-col="col" let-value="value">
            @switch (col.key) {
              @case ('status') {
                <span [class]="'nb-badge-' + statusKind(row.status)">{{ statusText(row.status) }}</span>
              }
              @case ('gender') {
                {{ row.gender === 'male' ? 'ذكر' : 'أنثى' }}
              }
              @case ('actions') {
                <span class="row-actions">
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
    </div>
  `,
  styles: [ADM_PAGE_STYLES],
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
  @Input() showStats = true;
  /** عند تمريره يظهر زر «تسجيل طلب جديد» ويوجّه إلى هذا المسار (تسجيل يدوي من المشرف) */
  @Input() createLink?: string;
  @Output() actioned = new EventEmitter<{ row: Record<string, any>; action: QueueAction }>();

  readonly applicants = signal<Applicant[]>([]);
  search = '';
  statusFilter = '';
  private readonly filterTick = signal(0);

  readonly columns: NbColumn[] = [
    { key: 'application_number', label: 'رقم الطلب', fr: 1.1 },
    { key: 'arabic_full_name', label: 'اسم المتقدم', fr: 1.6 },
    { key: 'gender', label: 'الجنس', fr: 0.7 },
    { key: 'nationality', label: 'الجنسية', fr: 1 },
    { key: 'status', label: 'الحالة', fr: 1 },
    { key: 'actions', label: 'إجراءات', fr: 1.6 },
  ];

  readonly filtered = computed(() => {
    this.filterTick();
    const q = this.search.trim().toLowerCase();
    return this.applicants().filter((a) => {
      if (this.statuses.length && !this.statuses.includes(a.status)) return false;
      if (this.statusFilter && a.status !== this.statusFilter) return false;
      if (q) {
        const hay = `${a.arabic_full_name} ${a.english_full_name ?? ''} ${a.application_number} ${a.national_id}`.toLowerCase();
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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.service.getApplicants().subscribe((res) => this.applicants.set(pickList<Applicant>(res)));
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
