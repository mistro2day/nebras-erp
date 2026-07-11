import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';

/**
 * الفترات المالية والإغلاق (Fiscal Years, Periods & Closing) — إدارة السنوات والفترات وإجراءات القفل،
 * على غرار Fiscal Periods في Odoo و Ledger calendar / Financial period close في D365 Finance.
 */
@Component({
  selector: 'app-fiscal-periods',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الفترات المالية والإغلاق" subtitle="إدارة السنوات المالية، الفترات المحاسبية، وعمليات القفل والإغلاق النهائي.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <button class="btn primary" (click)="showForm.set(!showForm())">＋ سنة مالية</button>
      </nb-page-header>

      @if (showForm()) {
        <nb-panel title="إضافة سنة مالية" class="mb">
          <div class="grid4">
            <label>اسم السنة<input class="fld" [(ngModel)]="form.name" placeholder="السنة المالية 2026" /></label>
            <label>تاريخ البدء<nb-datepicker [value]="form.start_date" (valueChange)="form.start_date = $event"></nb-datepicker></label>
            <label>تاريخ الانتهاء<nb-datepicker [value]="form.end_date" (valueChange)="form.end_date = $event"></nb-datepicker></label>
            <label class="chk"><input type="checkbox" [(ngModel)]="form.is_current" /> السنة الحالية</label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="saveYear()">حفظ السنة</button><button class="btn ghost" (click)="showForm.set(false)">إلغاء</button></div>
        </nb-panel>
      }

      <div class="two-col">
        <!-- السنوات المالية -->
        <nb-panel title="السنوات المالية" subtitle="اختر سنة لعرض فتراتها المحاسبية.">
          <div class="years">
            @for (y of years(); track y.id) {
              <div class="year" [class.sel]="selectedYear() === y.id" (click)="selectYear(y.id)">
                <div class="yr-top"><strong>{{ y.name }}</strong><span class="badge" [class]="y.status">{{ statusLabel(y.status) }}</span></div>
                <div class="yr-dates">{{ y.start_date }} ← {{ y.end_date }}</div>
                @if (y.status === 'open') {
                  <div class="close-year">
                    <select class="fld sm" [(ngModel)]="retainedAccount">
                      <option value="">حساب الأرباح المحتجزة…</option>
                      @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }
                    </select>
                    <button class="btn danger xs" (click)="closeYear($event, y)">إغلاق السنة</button>
                  </div>
                }
              </div>
            }
            @if (!years().length) { <div class="empty">لا توجد سنوات مالية.</div> }
          </div>
        </nb-panel>

        <!-- الفترات المحاسبية -->
        <nb-panel title="الفترات المحاسبية" subtitle="الفترات التابعة للسنة المالية المختارة وحالات إغلاقها.">
          <div class="periods">
            @for (p of periods(); track p.id) {
              <div class="period">
                <span class="lock" [class.locked]="p.status !== 'open'">{{ p.status === 'open' ? '🔓' : '🔒' }}</span>
                <div class="p-meta">
                  <strong>{{ p.name }}</strong>
                  <span class="p-dates">{{ p.start_date }} ← {{ p.end_date }}</span>
                </div>
                <span class="badge" [class]="p.status">{{ statusLabel(p.status) }}</span>
                @if (p.status === 'open') { <button class="btn danger xs" (click)="closePeriod(p)">إغلاق</button> }
              </div>
            }
            @if (!periods().length) { <div class="empty">اختر سنة مالية لعرض الفترات.</div> }
          </div>
        </nb-panel>
      </div>

      <nb-panel title="سجل عمليات الإغلاق المالي" subtitle="أرشيف الإغلاقات المنفذة للفترات والسنوات." [flush]="true">
        <div class="table-wrap"><table class="nb-table">
          <thead><tr><th>النوع</th><th>تاريخ الإغلاق</th><th>الحالة</th></tr></thead>
          <tbody>
            @for (c of closings(); track c.id) { <tr><td>{{ c.closing_type === 'year' ? 'إغلاق سنة' : 'إغلاق فترة' }}</td><td class="mono">{{ c.closed_at | slice:0:10 }}</td><td><span class="badge" [class]="c.status">{{ closeStatusLabel(c.status) }}</span></td></tr> }
            @if (!closings().length) { <tr><td colspan="3" class="empty">لا توجد عمليات إغلاق منفذة.</td></tr> }
          </tbody></table></div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.sm { height: 30px; font-size: 12px; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.chk { flex-direction: row; align-items: center; gap: 8px; align-self: end; height: 34px; }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
    .years, .periods { display: flex; flex-direction: column; gap: 10px; }
    .year { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 12px; cursor: pointer; }
    .year:hover { border-color: var(--nb-primary-400); background: var(--nb-surface-raised); }
    .year.sel { border-color: var(--nb-primary-600); background: var(--nb-primary-50); }
    .yr-top { display: flex; justify-content: space-between; align-items: center; }
    .yr-dates { font-size: 12px; color: var(--nb-text-muted); margin-top: 4px; font-variant-numeric: tabular-nums; }
    .close-year { display: flex; gap: 8px; margin-top: 10px; align-items: center; }

    .period { display: flex; align-items: center; gap: 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 10px 12px; }
    .lock { font-size: 18px; }
    .p-meta { display: flex; flex-direction: column; }
    .p-meta strong { font-size: 13px; }
    .p-dates { font-size: 11px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .period .badge { margin-inline-start: auto; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .mono { font-variant-numeric: tabular-nums; }
    .empty { text-align: center; padding: 22px; color: var(--nb-text-muted); font-size: 12.5px; }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.open { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.closed, .badge.locked { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .badge.reopened { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.pending { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved, .badge.completed { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.rejected { background: var(--nb-danger-bg); color: var(--nb-danger); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.danger { background: var(--nb-danger); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class FiscalPeriodsComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  years = signal<any[]>([]);
  periods = signal<any[]>([]);
  closings = signal<any[]>([]);
  accounts = signal<any[]>([]);
  selectedYear = signal<string>('');
  showForm = signal(false);
  retainedAccount = '';
  form: any = this.blank();

  ngOnInit() {
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.service.getClosings().subscribe((r) => { if (r?.success) this.closings.set(r.data); });
    this.loadYears();
  }
  blank() { return { name: '', start_date: '', end_date: '', is_current: false, status: 'open' }; }
  loadYears() {
    this.service.getFiscalYears().subscribe((r) => {
      if (r?.success) { this.years.set(r.data); if (r.data.length && !this.selectedYear()) this.selectYear(r.data[0].id); }
    });
  }
  selectYear(id: string) {
    this.selectedYear.set(id);
    this.service.getPeriods({ fiscal_year: id }).subscribe((r) => { if (r?.success) this.periods.set(r.data); });
  }
  saveYear() {
    if (!this.form.name || !this.form.start_date || !this.form.end_date) { this.notify.error('يرجى إدخال الاسم وتاريخي البدء والانتهاء.'); return; }
    this.service.createFiscalYear(this.form).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ السنة المالية.'); this.showForm.set(false); this.form = this.blank(); this.loadYears(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'),
    });
  }
  closeYear(ev: Event, y: any) {
    ev.stopPropagation();
    if (!this.retainedAccount) { this.notify.error('يرجى تحديد حساب الأرباح المحتجزة أولاً.'); return; }
    this.service.closeFiscalYear(y.id, this.retainedAccount).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم إغلاق السنة المالية وتدوير الأرصدة.'); this.loadYears(); this.service.getClosings().subscribe((c) => { if (c?.success) this.closings.set(c.data); }); } else this.notify.error(r?.message || 'تعذر الإغلاق.'); },
      error: (e) => this.notify.error(e?.error?.message || 'تعذر إغلاق السنة المالية.'),
    });
  }
  closePeriod(p: any) {
    this.service.closePeriod(p.id).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم إغلاق وقفل الفترة المحاسبية.'); this.selectYear(this.selectedYear()); } else this.notify.error(r?.message || 'تعذر الإغلاق.'); },
      error: (e) => this.notify.error(e?.error?.message || 'تعذر إغلاق الفترة.'),
    });
  }
  statusLabel(s: string) { return ({ open: 'مفتوحة', closed: 'مغلقة', locked: 'مقفلة', reopened: 'معاد فتحها' } as any)[s] || s; }
  closeStatusLabel(s: string) { return ({ pending: 'معلق', approved: 'موافق', rejected: 'مرفوض', completed: 'مكتمل' } as any)[s] || s; }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
