import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/**
 * العملات وأسعار الصرف (Currencies & Exchange Rates) — العملات المعتمدة وأسعار التحويل،
 * على غرار Currencies في Odoo و Currency & exchange rates في D365 Finance.
 */
@Component({
  selector: 'app-currencies',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="العملات وأسعار الصرف" subtitle="إدارة العملات المعتمدة وأسعار التحويل بين العملات لتقييم المعاملات متعددة العملات.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="expCols()" [rows]="expRows()" [title]="tab()==='cur' ? 'العملات' : 'أسعار الصرف'" filename="عملات-وأسعار-صرف"></nb-export-menu>
      </nb-page-header>

      <div class="statusbar">
        <button class="seg" [class.active]="tab()==='cur'" (click)="tab.set('cur')">العملات</button>
        <button class="seg" [class.active]="tab()==='rate'" (click)="tab.set('rate')">أسعار الصرف</button>
      </div>

      @if (tab() === 'cur') {
        <nb-panel title="إضافة عملة" class="mb">
          <div class="grid4">
            <label>الرمز<input class="fld" [(ngModel)]="cur.code" placeholder="USD" /></label>
            <label>الاسم العربي<input class="fld" [(ngModel)]="cur.name_ar" placeholder="دولار أمريكي" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="cur.name_en" placeholder="US Dollar" /></label>
            <label>الرمز المختصر<input class="fld" [(ngModel)]="cur.symbol" placeholder="$" /></label>
            <label class="chk"><input type="checkbox" [(ngModel)]="cur.is_base" /> العملة الأساسية</label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="saveCur()">حفظ العملة</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>الرمز</th><th>الاسم</th><th>الرمز المختصر</th><th>أساسية</th><th>الحالة</th></tr></thead>
          <tbody>
            @for (c of currencies(); track c.id) { <tr><td><strong>{{ c.code }}</strong></td><td>{{ c.name_ar }} <span class="nm">{{ c.name_en }}</span></td><td>{{ c.symbol }}</td>
              <td>@if (c.is_base) { <span class="badge info">أساسية</span> } @else { — }</td>
              <td><span class="badge ok">{{ c.status === 'active' ? 'نشط' : 'غير نشط' }}</span></td></tr> }
            @if (!currencies().length) { <tr><td colspan="5" class="empty">لا توجد عملات.</td></tr> }
          </tbody></table></div></nb-panel>
      }

      @if (tab() === 'rate') {
        <nb-panel title="إضافة سعر صرف" class="mb">
          <div class="grid4">
            <label>من عملة<select class="fld" [(ngModel)]="rate.from_currency"><option value="">اختر…</option>@for (c of currencies(); track c.id) { <option [value]="c.id">{{ c.code }}</option> }</select></label>
            <label>إلى عملة<select class="fld" [(ngModel)]="rate.to_currency"><option value="">اختر…</option>@for (c of currencies(); track c.id) { <option [value]="c.id">{{ c.code }}</option> }</select></label>
            <label>السعر<input class="fld num" type="number" min="0" step="0.000001" [(ngModel)]="rate.rate" /></label>
            <label>التاريخ<nb-datepicker [value]="rate.rate_date" (valueChange)="rate.rate_date = $event"></nb-datepicker></label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="saveRate()">حفظ السعر</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>من</th><th>إلى</th><th class="end">السعر</th><th>التاريخ</th></tr></thead>
          <tbody>
            @for (r of rates(); track r.id) { <tr><td>{{ code(r.from_currency) }}</td><td>{{ code(r.to_currency) }}</td><td class="end mono">{{ r.rate }}</td><td class="mono">{{ r.rate_date }}</td></tr> }
            @if (!rates().length) { <tr><td colspan="4" class="empty">لا توجد أسعار صرف مسجلة.</td></tr> }
          </tbody></table></div></nb-panel>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .statusbar { display: flex; gap: 6px; margin-bottom: 14px; }
    .seg { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); background: var(--nb-surface);
      color: var(--nb-text-secondary); border-radius: var(--nb-radius); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg.active { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.chk { flex-direction: row; align-items: center; gap: 8px; align-self: end; height: 34px; }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; } .end { text-align: end; }
    .nm { color: var(--nb-text-muted); font-size: 12px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.info { background: var(--nb-info-bg); color: var(--nb-info); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class CurrenciesComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  tab = signal<'cur' | 'rate'>('cur');
  currencies = signal<any[]>([]);
  rates = signal<any[]>([]);
  cur: any = { code: '', name_ar: '', name_en: '', symbol: '', is_base: false };
  rate: any = { from_currency: '', to_currency: '', rate: 1, rate_date: new Date().toISOString().split('T')[0] };

  ngOnInit() { this.load(); }
  load() {
    this.service.getCurrencies().subscribe((r) => { if (r?.success) this.currencies.set(r.data); });
    this.service.getExchangeRates().subscribe((r) => { if (r?.success) this.rates.set(r.data); });
  }
  code(id: string) { return this.currencies().find((c) => c.id === id)?.code || '—'; }
  saveCur() {
    if (!this.cur.code || !this.cur.name_ar) { this.notify.error('يرجى إدخال رمز العملة واسمها.'); return; }
    this.service.createCurrency(this.cur).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ العملة.'); this.cur = { code: '', name_ar: '', name_en: '', symbol: '', is_base: false }; this.load(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'),
    });
  }
  saveRate() {
    if (!this.rate.from_currency || !this.rate.to_currency || !(Number(this.rate.rate) > 0)) { this.notify.error('يرجى تحديد العملتين والسعر.'); return; }
    this.service.createExchangeRate(this.rate).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ سعر الصرف.'); this.rate = { from_currency: '', to_currency: '', rate: 1, rate_date: new Date().toISOString().split('T')[0] }; this.load(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'),
    });
  }
  expCols(): ExportColumn[] {
    if (this.tab() === 'cur') return [{ key: 'code', label: 'الرمز' }, { key: 'name_ar', label: 'الاسم' }, { key: 'symbol', label: 'الرمز المختصر' }, { key: 'is_base', label: 'أساسية', map: (r: any) => (r.is_base ? 'نعم' : 'لا') }];
    return [{ key: 'from_currency', label: 'من', map: (r: any) => this.code(r.from_currency) }, { key: 'to_currency', label: 'إلى', map: (r: any) => this.code(r.to_currency) }, { key: 'rate', label: 'السعر', align: 'end' }, { key: 'rate_date', label: 'التاريخ' }];
  }
  expRows(): any[] { return this.tab() === 'cur' ? this.currencies() : this.rates(); }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
