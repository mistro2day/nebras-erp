import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * السندات المالية (Vouchers) — سندات الصرف والقبض وترحيلها للدفاتر،
 * على غرار Payments/Vendor & Customer payments في Odoo و D365 Finance.
 */
@Component({
  selector: 'app-vouchers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent, NbDrawerComponent, NbExportMenuComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="سندات الصرف والقبض" subtitle="إصدار السندات المالية النقدية والبنكية واعتمادها وترحيلها لدفتر الأستاذ.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="vouchers()" title="السندات المالية" subtitle="سندات الصرف والقبض" filename="السندات-المالية"></nb-export-menu>
        <button class="btn primary" (click)="showForm.set(!showForm())">＋ سند جديد</button>
      </nb-page-header>

      <div class="statusbar">
        @for (t of typeTabs; track t.key) {
          <button class="seg" [class.active]="typeFilter()===t.key" (click)="setType(t.key)">{{ t.label }}</button>
        }
      </div>

      @if (showForm()) {
        <nb-panel title="إنشاء سند مالي" class="mb">
          <div class="grid4">
            <label>نوع السند
              <select class="fld" [(ngModel)]="form.voucher_type">
                <option value="payment">سند صرف</option>
                <option value="receipt">سند قبض</option>
                <option value="journal">سند تسوية</option>
              </select>
            </label>
            <label>رقم السند<input class="fld" [(ngModel)]="form.voucher_number" placeholder="PV-1001" /></label>
            <label>التاريخ<nb-datepicker [value]="form.date" (valueChange)="form.date = $event"></nb-datepicker></label>
            <label>المبلغ<input class="fld num" type="number" min="0" [(ngModel)]="form.amount" /></label>
            <label>العملة
              <select class="fld" [(ngModel)]="form.currency">
                @for (c of currencies(); track c.id) { <option [value]="c.id">{{ c.code }} - {{ c.name_ar }}</option> }
              </select>
            </label>
            <label>طريقة الدفع
              <select class="fld" [(ngModel)]="form.payment_method">
                @for (m of methods(); track m.id) { <option [value]="m.id">{{ m.name_ar }}</option> }
              </select>
            </label>
            <label>الحساب المقابل (GL)
              <select class="fld" [(ngModel)]="form.gl_account">
                <option value="">اختر الحساب…</option>
                @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }
              </select>
            </label>
            <label>الحساب البنكي
              <select class="fld" [(ngModel)]="form.bank_account">
                <option [ngValue]="null">— بدون —</option>
                @for (b of bankAccounts(); track b.id) { <option [ngValue]="b.id">{{ b.bank_name }} - {{ b.account_number }}</option> }
              </select>
            </label>
            <label>الصندوق النقدي
              <select class="fld" [(ngModel)]="form.cash_box">
                <option [ngValue]="null">— بدون —</option>
                @for (cb of cashBoxes(); track cb.id) { <option [ngValue]="cb.id">{{ cb.name_ar }}</option> }
              </select>
            </label>
          </div>
          <label class="full">البيان / الوصف<input class="fld" [(ngModel)]="form.description" placeholder="الغرض من السند" /></label>
          <div class="form-actions">
            <button class="btn primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ السند' }}</button>
            <button class="btn ghost" (click)="showForm.set(false)">إلغاء</button>
          </div>
        </nb-panel>
      }

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead><tr><th>رقم السند</th><th>النوع</th><th>التاريخ</th><th class="end">المبلغ</th><th>البيان</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="7"><nb-loading message="جارٍ تحميل السندات…"></nb-loading></td></tr>
              } @else {
              @for (v of vouchers(); track v.id) {
                <tr class="clickable" (click)="detail.set(v)">
                  <td><strong>{{ v.voucher_number }}</strong></td>
                  <td><span class="badge" [class.pay]="v.voucher_type==='payment'" [class.rcv]="v.voucher_type==='receipt'">{{ typeLabel(v.voucher_type) }}</span></td>
                  <td class="mono">{{ v.date }}</td>
                  <td class="end mono"><strong>{{ v.amount | number:'1.2-2' }}</strong></td>
                  <td>{{ v.description }}</td>
                  <td><span class="badge" [class]="v.status">{{ statusLabel(v.status) }}</span></td>
                  <td (click)="$event.stopPropagation()">@if (v.status === 'draft' || v.status === 'approved') { <button class="btn primary xs" (click)="post(v)">ترحيل</button> }</td>
                </tr>
              }
              @if (!vouchers().length) { <tr><td colspan="7" class="empty">لا توجد سندات مطابقة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- تفاصيل السند المالي -->
      <nb-drawer [open]="!!detail()" [width]="560"
        [title]="typeLabel(detail()?.voucher_type) + ' — ' + (detail()?.voucher_number || '')"
        [subtitle]="detail()?.description" (closed)="detail.set(null)">
        @if (detail(); as v) {
          <div class="dl">
            <div class="dl-row"><span class="k">نوع السند</span><span class="v"><span class="badge" [class.pay]="v.voucher_type==='payment'" [class.rcv]="v.voucher_type==='receipt'">{{ typeLabel(v.voucher_type) }}</span></span></div>
            <div class="dl-row"><span class="k">التاريخ</span><span class="v mono">{{ v.date }}</span></div>
            <div class="dl-row big"><span class="k">المبلغ</span><span class="v mono">{{ v.amount | number:'1.2-2' }} {{ currCode(v.currency) }}</span></div>
            <div class="dl-row"><span class="k">طريقة الدفع</span><span class="v">{{ methodName(v.payment_method) }}</span></div>
            <div class="dl-row"><span class="k">الحساب المقابل</span><span class="v">{{ accName(v.gl_account) }}</span></div>
            @if (v.bank_account) { <div class="dl-row"><span class="k">الحساب البنكي</span><span class="v">{{ bankName(v.bank_account) }}</span></div> }
            @if (v.cash_box) { <div class="dl-row"><span class="k">الصندوق</span><span class="v">{{ boxName(v.cash_box) }}</span></div> }
            <div class="dl-row"><span class="k">الحالة</span><span class="v"><span class="badge" [class]="v.status">{{ statusLabel(v.status) }}</span></span></div>
            <div class="dl-row"><span class="k">البيان</span><span class="v">{{ v.description }}</span></div>
          </div>
        }
        <div drawer-actions>
          @if (detail()?.status === 'draft' || detail()?.status === 'approved') { <button class="btn primary" (click)="post(detail()); detail.set(null)">ترحيل السند</button> }
        </div>
      </nb-drawer>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .statusbar { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
    .seg { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); background: var(--nb-surface);
      color: var(--nb-text-secondary); border-radius: var(--nb-radius); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg.active { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; font-variant-numeric: tabular-nums; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 900px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    label.full { margin-top: 12px; }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }

    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .mono { font-variant-numeric: tabular-nums; }
    .end { text-align: end; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .nb-table tbody tr.clickable { cursor: pointer; }
    .badge.pay { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .badge.rcv { background: var(--nb-success-bg); color: var(--nb-success); }
    .dl { display: flex; flex-direction: column; }
    .dl-row { display: flex; justify-content: space-between; gap: 16px; padding: 11px 2px; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .dl-row .k { color: var(--nb-text-muted); }
    .dl-row .v { color: var(--nb-text); font-weight: 600; text-align: end; }
    .dl-row.big .v { font-size: 18px; font-weight: 800; }
    .badge.draft { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.posted { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.cancelled { background: var(--nb-danger-bg); color: var(--nb-danger); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class VouchersComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  vouchers = signal<any[]>([]);
  loading = signal(true);
  currencies = signal<any[]>([]);
  methods = signal<any[]>([]);
  accounts = signal<any[]>([]);
  bankAccounts = signal<any[]>([]);
  cashBoxes = signal<any[]>([]);
  showForm = signal(false);
  saving = signal(false);
  typeFilter = signal('');
  detail = signal<any | null>(null);

  typeTabs = [{ key: '', label: 'الكل' }, { key: 'payment', label: 'سندات الصرف' }, { key: 'receipt', label: 'سندات القبض' }, { key: 'journal', label: 'سندات التسوية' }];

  form: any = this.blank();

  ngOnInit() {
    this.service.getCurrencies({ status: 'active' }).subscribe((r) => { if (r?.success) { this.currencies.set(r.data); const b = r.data.find((c: any) => c.is_base) || r.data[0]; if (b) this.form.currency = b.id; } });
    this.service.getPaymentMethods().subscribe((r) => { if (r?.success) this.methods.set(r.data); });
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.service.getBankAccounts().subscribe((r) => { if (r?.success) this.bankAccounts.set(r.data); });
    this.service.getCashBoxes().subscribe((r) => { if (r?.success) this.cashBoxes.set(r.data); });
    this.load();
  }

  blank() { return { voucher_type: 'payment', voucher_number: '', date: new Date().toISOString().split('T')[0], amount: 0, currency: '', payment_method: '', gl_account: '', bank_account: null, cash_box: null, description: '', status: 'draft' }; }
  setType(t: string) { this.typeFilter.set(t); this.load(); }
  load() {
    this.loading.set(true);
    this.service.getVouchers(this.typeFilter() ? { voucher_type: this.typeFilter() } : undefined).subscribe({
      next: (r) => { if (r?.success) this.vouchers.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  save() {
    if (!this.form.voucher_number || !this.form.gl_account || !this.form.payment_method || !(Number(this.form.amount) > 0)) { this.notify.error('يرجى تعبئة رقم السند والمبلغ والحساب وطريقة الدفع.'); return; }
    this.saving.set(true);
    this.service.createVoucher(this.form).subscribe({
      next: (r) => { this.saving.set(false); if (r?.success) { this.notify.success('تم حفظ السند بنجاح.'); this.showForm.set(false); const cur = this.form.currency; this.form = this.blank(); this.form.currency = cur; this.load(); } else this.notify.error(r?.message || 'تعذر حفظ السند.'); },
      error: () => { this.saving.set(false); this.notify.error('حدث خطأ أثناء الاتصال بالخادم.'); },
    });
  }
  post(v: any) { this.service.postVoucher(v.id).subscribe({ next: (r) => { if (r?.success) { this.notify.success('تم ترحيل السند للدفاتر.'); this.load(); } else this.notify.error(r?.message || 'تعذر الترحيل.'); }, error: (e) => this.notify.error(e?.error?.message || 'تعذر ترحيل السند.') }); }

  cols(): ExportColumn[] {
    return [
      { key: 'voucher_number', label: 'رقم السند' },
      { key: 'voucher_type', label: 'النوع', map: (r) => this.typeLabel(r.voucher_type) },
      { key: 'date', label: 'التاريخ' },
      { key: 'amount', label: 'المبلغ', align: 'end' },
      { key: 'description', label: 'البيان' },
      { key: 'status', label: 'الحالة', map: (r) => this.statusLabel(r.status) },
    ];
  }
  currCode(id: string) { return this.currencies().find((c) => c.id === id)?.code || ''; }
  methodName(id: string) { return this.methods().find((m) => m.id === id)?.name_ar || '—'; }
  accName(id: string) { const a = this.accounts().find((x) => x.id === id); return a ? `${a.code} - ${a.name_ar}` : '—'; }
  bankName(id: string) { const b = this.bankAccounts().find((x) => x.id === id); return b ? `${b.bank_name} - ${b.account_number}` : '—'; }
  boxName(id: string) { return this.cashBoxes().find((x) => x.id === id)?.name_ar || '—'; }

  typeLabel(t: string) { return ({ payment: 'صرف', receipt: 'قبض', journal: 'تسوية' } as any)[t] || t; }
  statusLabel(s: string) { return ({ draft: 'مسودة', approved: 'معتمد', posted: 'مرحّل', cancelled: 'ملغي' } as any)[s] || s; }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
