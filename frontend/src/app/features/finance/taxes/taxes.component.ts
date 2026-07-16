import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * الضرائب (Taxes) — ضريبة القيمة المضافة والاستقطاع والرسوم،
 * على غرار Taxes في Odoo و Tax setup في D365 Finance.
 */
@Component({
  selector: 'app-taxes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent, NbExportMenuComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الضرائب" subtitle="تعريف الضرائب المعتمدة (القيمة المضافة، الاستقطاع، الرسوم) وربطها بالحسابات المحاسبية.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="taxes()" title="الضرائب" subtitle="الضرائب المعتمدة" filename="الضرائب"></nb-export-menu>
        <button class="btn primary" (click)="showForm.set(!showForm())">＋ ضريبة جديدة</button>
      </nb-page-header>

      @if (showForm()) {
        <nb-panel title="إضافة ضريبة" class="mb">
          <div class="grid4">
            <label>الاسم العربي<input class="fld" [(ngModel)]="form.name_ar" placeholder="ضريبة القيمة المضافة" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="form.name_en" placeholder="VAT" /></label>
            <label>الرمز<input class="fld" [(ngModel)]="form.code" placeholder="VAT15" /></label>
            <label>النسبة %<input class="fld num" type="number" min="0" step="0.01" [(ngModel)]="form.rate_percentage" /></label>
            <label>النوع
              <select class="fld" [(ngModel)]="form.type">
                <option value="vat">قيمة مضافة (VAT)</option><option value="withholding">استقطاع (WHT)</option><option value="custom">رسوم / أخرى</option>
              </select>
            </label>
            <label>الحساب المحاسبي (GL)<select class="fld" [(ngModel)]="form.gl_account"><option value="">اختر…</option>@for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }</select></label>
          </div>
          <div class="form-actions"><button class="btn primary" (click)="save()">حفظ الضريبة</button><button class="btn ghost" (click)="showForm.set(false)">إلغاء</button></div>
        </nb-panel>
      }

      <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
        <thead><tr><th>الرمز</th><th>الاسم</th><th>النوع</th><th class="end">النسبة</th></tr></thead>
        <tbody>
          @if (loading()) {
            <tr><td colspan="4"><nb-loading message="جارٍ تحميل الضرائب…"></nb-loading></td></tr>
          } @else {
          @for (t of taxes(); track t.id) {
            <tr><td><strong>{{ t.code }}</strong></td><td>{{ t.name_ar }} <span class="nm">{{ t.name_en }}</span></td>
              <td><span class="badge" [class]="t.type">{{ typeLabel(t.type) }}</span></td>
              <td class="end mono"><strong>{{ t.rate_percentage }}%</strong></td></tr>
          }
          @if (!taxes().length) { <tr><td colspan="4" class="empty">لا توجد ضرائب معرّفة.</td></tr> }
          }
        </tbody></table></div></nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; }
    .grid4 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
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
    .badge.vat { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.withholding { background: var(--nb-warning-bg, #fff3e0); color: var(--nb-warning, #e65100); }
    .badge.custom { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class TaxesComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  taxes = signal<any[]>([]);
  loading = signal(true);
  accounts = signal<any[]>([]);
  showForm = signal(false);
  form: any = this.blank();

  ngOnInit() {
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.load();
  }
  blank() { return { name_ar: '', name_en: '', code: '', rate_percentage: 15, type: 'vat', gl_account: '' }; }
  load() {
    this.loading.set(true);
    this.service.getTaxes().subscribe({
      next: (r) => { if (r?.success) this.taxes.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  save() {
    if (!this.form.name_ar || !this.form.code || !this.form.gl_account) { this.notify.error('يرجى إدخال الاسم والرمز والحساب المحاسبي.'); return; }
    this.service.createTax(this.form).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ الضريبة.'); this.showForm.set(false); this.form = this.blank(); this.load(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'),
    });
  }
  cols(): ExportColumn[] {
    return [
      { key: 'code', label: 'الرمز' },
      { key: 'name_ar', label: 'الاسم' },
      { key: 'type', label: 'النوع', map: (r) => this.typeLabel(r.type) },
      { key: 'rate_percentage', label: 'النسبة %', align: 'end' },
    ];
  }
  typeLabel(t: string) { return ({ vat: 'قيمة مضافة', withholding: 'استقطاع', custom: 'رسوم' } as any)[t] || t; }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
