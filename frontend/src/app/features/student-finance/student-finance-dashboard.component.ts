import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe, SlicePipe } from '@angular/common';
import { StudentFinanceService } from './student-finance.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * الحسابات المالية للطلاب والقبض — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-student-finance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, SlicePipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة الحسابات المالية للطلاب والقبض"
        subtitle="لوحة التحكم بالرسوم، الفواتير، التحصيلات، والمنح الدراسية"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (financeService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="المستحقات المعلقة" [value]="(stats.outstanding_receivables | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="warning"></nb-stat-card>
          <nb-stat-card label="تحصيلات اليوم" [value]="(stats.today_collections | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="success"></nb-stat-card>
          <nb-stat-card label="تحصيلات الشهر" [value]="(stats.monthly_collections | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="info"></nb-stat-card>
          <nb-stat-card label="الحظر المالي النشط" [value]="stats.active_holds" suffix="طلاب" [valueKind]="stats.active_holds ? 'danger' : 'default'"></nb-stat-card>
        </div>
      }

      <nb-panel title="حسابات الطلاب المالية" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رقم الحساب</span><span>معرف الطالب</span><span>المبلغ المستحق</span><span>الرصيد الدائن الفائض</span><span>حالة الحساب</span>
          </div>
          @for (row of accounts; track row.id) {
            <div class="tbl-row">
              <span>{{ row.account_number }}</span>
              <span>{{ row.student_id | slice:0:8 }}…</span>
              <span class="strong">{{ row.outstanding_balance | currency:'SAR ' }}</span>
              <span>{{ row.credit_balance | currency:'SAR ' }}</span>
              <span><span [class]="row.financial_hold ? 'nb-badge-danger' : 'nb-badge-success'">{{ row.financial_hold ? 'حظر مالي نشط' : 'نشط وسليم' }}</span></span>
            </div>
          }
          @if (accounts.length === 0) { <div class="tbl-empty">لا توجد حسابات مالية.</div> }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 1.2fr 1.2fr 1.2fr 1.2fr 1.2fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class StudentFinanceDashboardComponent implements OnInit {
  financeService = inject(StudentFinanceService);
  accounts: any[] = [];
  displayedColumns: string[] = ['accountNumber', 'studentId', 'outstandingBalance', 'creditBalance', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.financeService.getDashboardStats().subscribe();
    this.financeService.getBillingAccounts().subscribe(data => {
      this.accounts = data;
    });
  }
}
