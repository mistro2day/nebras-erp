import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';
import { NbDataTableComponent, NbColumn } from '../../../shared/nebras/nb-data-table.component';
import { ADM_PAGE_STYLES, pickList } from '../shared/admissions.shared';

@Component({
  selector: 'app-admissions-scholarships',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbStatCardComponent,
    NbDataTableComponent
  ],
  providers: [DatePipe, CurrencyPipe],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="المنح والإعفاءات الدراسية"
        subtitle="إدارة المنح والإعفاءات المالية للمتقدمين المقبولين والطلاب لتخفيف العبء المالي."
      >
        <button class="nb-btn-primary" (click)="showCreateForm.set(true)">+ منح إعفاء جديدة</button>
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
      </nb-page-header>

      <!-- شريط توزيع المنح الملون والأنيق مع الانيميشن -->
      <div class="distribution-container">
        <span class="dist-title">توزيع المنح الممنوحة حسب التصنيف</span>
        <div class="distribution-bar-wrapper">
          <div class="dist-segment full" [style.width.%]="segmentPercent('full')" title="منح كاملة">
            <span class="label" *ngIf="segmentPercent('full') > 0">كاملة {{ segmentPercent('full') }}%</span>
          </div>
          <div class="dist-segment partial" [style.width.%]="segmentPercent('partial')" title="خصم جزئي">
            <span class="label" *ngIf="segmentPercent('partial') > 0">جزئية {{ segmentPercent('partial') }}%</span>
          </div>
          <div class="dist-segment merit" [style.width.%]="segmentPercent('merit')" title="تفوق أكاديمي">
            <span class="label" *ngIf="segmentPercent('merit') > 0">تفوق {{ segmentPercent('merit') }}%</span>
          </div>
          <div class="dist-segment need" [style.width.%]="segmentPercent('need')" title="رعاية اجتماعية">
            <span class="label" *ngIf="segmentPercent('need') > 0">رعاية {{ segmentPercent('need') }}%</span>
          </div>
        </div>
      </div>

      <!-- بطاقات إحصائية للمنح -->
      <div class="stats-grid">
        <nb-stat-card label="إجمالي المنح الممنوحة" [value]="scholarships().length" valueKind="info"></nb-stat-card>
        <nb-stat-card label="المنح الكاملة (100%)" [value]="countBy('full')" valueKind="success"></nb-stat-card>
        <nb-stat-card label="المنح الجزئية" [value]="countBy('partial')" valueKind="warning"></nb-stat-card>
        <nb-stat-card label="منح التفوق الأكاديمي" [value]="countBy('merit')"></nb-stat-card>
      </div>

      <div class="main-content-layout">
        <!-- جدول المنح والخصومات -->
        <div class="table-section">
          <nb-panel title="سجل المنح والخصومات النشطة" [flush]="true">
            <nb-data-table 
              [columns]="columns" 
              [rows]="filteredScholarships()" 
              emptyText="لا توجد منح دراسية مسجلة حالياً."
            >
              <ng-template #cell let-row let-col="col" let-value="value">
                @switch (col.key) {
                  @case ('type') {
                    <span [class]="'type-tag ' + row.type">{{ translateType(row.type) }}</span>
                  }
                  @case ('amount') {
                    <span class="font-bold">
                      @if (row.type === 'full') {
                        خصم كامل 100%
                      } @else if (row.amount_percentage > 0) {
                        {{ row.amount_percentage }}% خصم
                      } @else {
                        {{ row.fixed_amount | currency:'SDG':'رمز ':'1.0-2' }}
                      }
                    </span>
                  }
                  @case ('status') {
                    <span [class]="'status-badge ' + row.status">{{ translateStatus(row.status) }}</span>
                  }
                  @case ('dates') {
                    <span class="text-xs">
                      من: {{ row.start_date | date:'yyyy-MM-dd' }}
                      @if (row.end_date) {
                        إلى: {{ row.end_date | date:'yyyy-MM-dd' }}
                      } @else {
                        (مفتوح)
                      }
                    </span>
                  }
                  @default { {{ value }} }
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>
        </div>

        <!-- معالج تطبيق المنحة الجديدة -->
        @if (showCreateForm()) {
          <div class="form-overlay" (click)="showCreateForm.set(false)">
            <div class="form-card" (click)="$event.stopPropagation()">
              <div class="form-header">
                <h3>إعطاء منحة / خصم جديد للطالب</h3>
                <button class="close-btn" (click)="showCreateForm.set(false)">×</button>
              </div>
              <div class="form-body">
                <form #sForm="ngForm" (ngSubmit)="submitForm(sForm.value)">
                  <!-- اختيار الطالب / الحساب المالي -->
                  <div class="form-group">
                    <label class="required">اختر الطالب المستفيد:</label>
                    <select name="billing_account_id" ngModel required class="nb-select">
                      <option value="" disabled selected>-- اختر حساب الطالب المالي --</option>
                      @for (acc of billingAccounts(); track acc.id) {
                        <option [value]="acc.id">
                          {{ acc.account_number }} - {{ acc.student_name || 'طالب Nebras' }}
                        </option>
                      }
                    </select>
                  </div>

                  <!-- اسم المنحة -->
                  <div class="form-group">
                    <label class="required">مسمى المنحة أو الإعفاء:</label>
                    <input type="text" name="name" ngModel required class="nb-input" placeholder="مثال: منحة التفوق الأكاديمي، إعفاء أبناء العاملين..." />
                  </div>

                  <!-- نوع المنحة -->
                  <div class="form-group">
                    <label class="required">نوع المنحة:</label>
                    <select name="type" [(ngModel)]="selectedType" required class="nb-select">
                      <option value="partial">خصم جزئي (نسبة أو مبلغ)</option>
                      <option value="full">منحة كاملة (خصم 100%)</option>
                      <option value="merit">تفوق أكاديمي</option>
                      <option value="need">حاجة اجتماعية ورعاية</option>
                    </select>
                  </div>

                  <!-- قيمة المنحة -->
                  @if (selectedType !== 'full') {
                    <div class="amount-row">
                      <div class="form-group half">
                        <label>خصم مئوي (%):</label>
                        <input type="number" name="amount_percentage" ngModel min="0" max="100" class="nb-input" placeholder="مثال: 50" />
                      </div>
                      <div class="form-group half">
                        <label>أو خصم بمبلغ ثابت (SDG):</label>
                        <input type="number" name="fixed_amount" ngModel min="0" class="nb-input" placeholder="مثال: 25000" />
                      </div>
                    </div>
                  }

                  <!-- التواريخ -->
                  <div class="amount-row">
                    <div class="form-group half">
                      <label class="required">تاريخ البدء:</label>
                      <input type="date" name="start_date" [ngModel]="todayDate" required class="nb-input" />
                    </div>
                    <div class="form-group half">
                      <label>تاريخ الانتهاء (اختياري):</label>
                      <input type="date" name="end_date" ngModel class="nb-input" />
                    </div>
                  </div>

                  <div class="form-actions">
                    <button type="submit" [disabled]="!sForm.valid" class="nb-btn-primary">✓ تأكيد وتطبيق المنحة</button>
                    <button type="button" class="nb-btn-secondary" (click)="showCreateForm.set(false)">إلغاء</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .distribution-container {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 14px 16px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
      }
      .dist-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text);
      }
      .distribution-bar-wrapper {
        height: 24px;
        background: var(--nb-surface-raised);
        border-radius: 6px;
        overflow: hidden;
        display: flex;
      }
      .dist-segment {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: white;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        position: relative;
      }
      .dist-segment::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%);
      }
      .dist-segment.full { background: #27c93f; }
      .dist-segment.partial { background: #e0a300; }
      .dist-segment.merit { background: #007aff; }
      .dist-segment.need { background: #af52de; }
      .dist-segment .label {
        padding: 0 4px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        animation: fadeInText 1s ease;
      }
      @keyframes fadeInText {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .main-content-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .table-section {
        flex: 1;
        min-width: 0;
      }
      .type-tag {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: var(--nb-radius-small, 4px);
        font-weight: 600;
        display: inline-block;
      }
      .type-tag.full { background: rgba(39, 201, 63, 0.1); color: #27c93f; }
      .type-tag.partial { background: rgba(255, 189, 46, 0.1); color: #e0a300; }
      .type-tag.merit { background: rgba(0, 122, 255, 0.1); color: #007aff; }
      .type-tag.need { background: rgba(175, 82, 222, 0.1); color: #af52de; }

      .status-badge {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
        display: inline-block;
      }
      .status-badge.approved { background: #e2f9e6; color: #1e7e34; }
      .status-badge.pending { background: #fff3cd; color: #856404; }
      .status-badge.expired { background: #f8d7da; color: #721c24; }

      .form-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }
      .form-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        width: 480px;
        max-width: 90%;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        overflow: hidden;
        animation: scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .form-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--nb-border-soft);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--nb-surface-raised);
      }
      .form-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: var(--nb-text);
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: var(--nb-text-muted);
        cursor: pointer;
      }
      .form-body {
        padding: 20px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
      }
      .form-group label {
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text);
      }
      .form-group label.required::after {
        content: ' *';
        color: var(--nb-danger);
      }
      .nb-select, .nb-input {
        height: 38px;
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius);
        padding: 0 12px;
        font-family: var(--nb-font-family);
        font-size: 13px;
        color: var(--nb-text);
        background: var(--nb-surface);
        outline: none;
      }
      .nb-select:focus, .nb-input:focus {
        border-color: var(--nb-primary-400);
      }
      .amount-row {
        display: flex;
        gap: 12px;
      }
      .form-group.half {
        flex: 1;
      }
      .form-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        border-top: 1px solid var(--nb-border-soft);
        padding-top: 16px;
      }
      .form-actions button {
        flex: 1;
        height: 38px;
        border-radius: var(--nb-radius);
        font-family: var(--nb-font-family);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border: none;
      }
      .nb-btn-primary {
        background: var(--nb-primary-600);
        color: white;
      }
      .nb-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .nb-btn-secondary {
        background: var(--nb-surface-raised);
        border: 1px solid var(--nb-border);
        color: var(--nb-text);
      }
      .font-bold { font-weight: 700; }
    `,
  ],
})
export class AdmissionsScholarshipsComponent implements OnInit {
  private readonly financeService = inject(StudentFinanceService);

  readonly scholarships = signal<any[]>([]);
  readonly billingAccounts = signal<any[]>([]);
  readonly showCreateForm = signal(false);
  selectedType = 'partial';
  todayDate = new Date().toISOString().split('T')[0];

  readonly columns: NbColumn[] = [
    { key: 'account_number', label: 'رقم الحساب المالي', fr: 1.2 },
    { key: 'student_name', label: 'اسم الطالب المستفيد', fr: 2 },
    { key: 'name', label: 'مسمى الخصم/المنحة', fr: 2 },
    { key: 'type', label: 'التصنيف', fr: 1 },
    { key: 'amount', label: 'القيمة الممنوحة', fr: 1.5 },
    { key: 'status', label: 'الحالة', fr: 1 },
    { key: 'dates', label: 'فترة الصلاحية', fr: 2 },
  ];

  readonly filteredScholarships = computed(() => {
    return this.scholarships();
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    // جلب قائمة المنح من خادم المالية
    this.financeService.listScholarships({ page_size: 100 }).subscribe((res) => {
      this.scholarships.set(pickList<any>(res));
    });

    // جلب حسابات فوترة الطلاب لربط المنح بها
    this.financeService.listBillingAccounts({ page_size: 100 }).subscribe((res) => {
      this.billingAccounts.set(pickList<any>(res));
    });
  }

  countBy(type: string): number {
    if (type === 'full' || type === 'partial' || type === 'merit' || type === 'need') {
      return this.scholarships().filter(s => s.type === type).length;
    }
    return 0;
  }

  segmentPercent(type: string): number {
    const total = this.scholarships().length;
    if (!total) return 0;
    const count = this.countBy(type);
    return Math.round((count / total) * 100);
  }

  translateType(type: string): string {
    switch (type) {
      case 'full': return 'خصم كامل 100%';
      case 'partial': return 'خصم جزئي';
      case 'merit': return 'تفوق أكاديمي';
      case 'need': return 'رعاية اجتماعية';
      default: return type;
    }
  }

  translateStatus(status: string): string {
    switch (status) {
      case 'approved': return 'نشطة ومعتمدة';
      case 'pending': return 'معلقة الموافقة';
      case 'expired': return 'منتهية الصلاحية';
      default: return status;
    }
  }

  submitForm(formValues: any): void {
    const payload = {
      billing_account_id: formValues.billing_account_id,
      name: formValues.name,
      type: formValues.type,
      amount_percentage: formValues.amount_percentage || 0,
      fixed_amount: formValues.fixed_amount || 0,
      start_date: formValues.start_date,
      end_date: formValues.end_date || null
    };

    if (formValues.type === 'full') {
      payload.amount_percentage = 100;
    }

    this.financeService.applyScholarship(payload).subscribe({
      next: () => {
        this.load();
        this.showCreateForm.set(false);
      },
      error: (err) => {
        console.error('Error applying scholarship:', err);
      }
    });
  }
}
