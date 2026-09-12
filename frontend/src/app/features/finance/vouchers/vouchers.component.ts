import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { VoucherCreateModalComponent } from './voucher-create-modal.component';
import { printVoucher } from './voucher-print';

/**
 * السندات المالية (Vouchers) — سندات الصرف والقبض وترحيلها للدفاتر،
 * على غرار Payments/Vendor & Customer payments في Odoo و D365 Finance.
 */
@Component({
  selector: 'app-vouchers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbDrawerComponent,
    NbExportMenuComponent,
    NbLoadingComponent,
    VoucherCreateModalComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="سندات الصرف والقبض" subtitle="إصدار السندات المالية النقدية والبنكية واعتمادها وترحيلها لدفتر الأستاذ.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <nb-export-menu [columns]="cols()" [rows]="vouchers()" title="السندات المالية" subtitle="سندات الصرف والقبض" filename="السندات-المالية"></nb-export-menu>
        <button class="btn primary" (click)="showModal.set(true)">＋ سند جديد</button>
      </nb-page-header>

      <div class="statusbar">
        @for (t of typeTabs; track t.key) {
          <button class="seg" [class.active]="typeFilter()===t.key" (click)="setType(t.key)">{{ t.label }}</button>
        }
      </div>

      <nb-panel [flush]="true">
        <div class="table-wrap">
          <table class="nb-table">
            <thead>
              <tr>
                <th>رقم السند</th>
                <th>النوع</th>
                <th>التاريخ</th>
                <th class="end">المبلغ (ج.س)</th>
                <th>طريقة السداد</th>
                <th>البيان</th>
                <th>الحالة</th>
                <th style="text-align: center;">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="8"><nb-loading message="جارٍ تحميل السندات…"></nb-loading></td></tr>
              } @else {
              @for (v of vouchers(); track v.id) {
                <tr class="clickable" (click)="detail.set(v)">
                  <td><strong>{{ v.voucher_number }}</strong></td>
                  <td><span class="badge" [class.pay]="v.voucher_type==='payment'" [class.rcv]="v.voucher_type==='receipt'">{{ typeLabel(v.voucher_type) }}</span></td>
                  <td class="mono">{{ v.date }}</td>
                  <td class="end mono"><strong>{{ v.amount | number:'1.2-2' }}</strong></td>
                  <td>{{ methodName(v.payment_method) }}</td>
                  <td>{{ v.description }}</td>
                  <td><span class="badge" [class]="v.status">{{ statusLabel(v.status) }}</span></td>
                  <td class="actions-cell" (click)="$event.stopPropagation()">
                    <button class="btn ghost xs" title="طباعة السند الرسمي A4" (click)="print(v)">🖨️ طباعة</button>
                    @if (v.status === 'draft' || v.status === 'approved') {
                      <button class="btn primary xs" (click)="post(v)">ترحيل</button>
                    }
                  </td>
                </tr>
              }
              @if (!vouchers().length) { <tr><td colspan="8" class="empty">لا توجد سندات مطابقة.</td></tr> }
              }
            </tbody>
          </table>
        </div>
      </nb-panel>

      <!-- تفاصيل السند المالي في الدرج الجانبي -->
      <nb-drawer [open]="!!detail()" [width]="580"
        [title]="typeLabel(detail()?.voucher_type) + ' — ' + (detail()?.voucher_number || '')"
        [subtitle]="detail()?.description" (closed)="detail.set(null)">
        @if (detail(); as v) {
          <div class="dl">
            <div class="dl-row"><span class="k">نوع السند</span><span class="v"><span class="badge" [class.pay]="v.voucher_type==='payment'" [class.rcv]="v.voucher_type==='receipt'">{{ typeLabel(v.voucher_type) }}</span></span></div>
            <div class="dl-row"><span class="k">التاريخ</span><span class="v mono">{{ v.date }}</span></div>
            <div class="dl-row big"><span class="k">المبلغ الإجمالي</span><span class="v mono">{{ v.amount | number:'1.2-2' }} جنيه سوداني</span></div>
            <div class="dl-row"><span class="k">طريقة الدفع</span><span class="v">{{ methodName(v.payment_method) }}</span></div>
            <div class="dl-row"><span class="k">الحساب المقابل</span><span class="v">{{ accName(v.gl_account) }}</span></div>
            @if (v.bank_account) { <div class="dl-row"><span class="k">الحساب البنكي</span><span class="v">{{ bankName(v.bank_account) }}</span></div> }
            @if (v.cash_box) { <div class="dl-row"><span class="k">الصندوق النقدي</span><span class="v">{{ boxName(v.cash_box) }}</span></div> }
            <div class="dl-row"><span class="k">الحالة</span><span class="v"><span class="badge" [class]="v.status">{{ statusLabel(v.status) }}</span></span></div>
            <div class="dl-row"><span class="k">البيان المدون</span><span class="v">{{ v.description }}</span></div>
          </div>
        }
        <div drawer-actions class="drawer-btns">
          <button class="btn ghost" (click)="print(detail())">🖨️ طباعة السند الرسمي (A4)</button>
          @if (detail()?.status === 'draft' || detail()?.status === 'approved') {
            <button class="btn primary" (click)="post(detail()); detail.set(null)">ترحيل السند للدفاتر</button>
          }
        </div>
      </nb-drawer>

      <!-- معالج إنشاء السند المالي بنمط نبراس متعدد الخطوات -->
      <app-voucher-create-modal
        [open]="showModal()"
        [currencies]="currencies()"
        [methods]="methods()"
        [accounts]="accounts()"
        [bankAccounts]="bankAccounts()"
        [cashBoxes]="cashBoxes()"
        [saving]="saving()"
        (cancel)="showModal.set(false)"
        (confirm)="handleCreateConfirm($event)"
      >
      </app-voucher-create-modal>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .statusbar { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
    .seg { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); background: var(--nb-surface);
      color: var(--nb-text-secondary); border-radius: var(--nb-radius); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg.active { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

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
    .dl-row.big .v { font-size: 18px; font-weight: 800; color: var(--nb-primary-700); }
    .badge.draft { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.posted { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.cancelled { background: var(--nb-danger-bg); color: var(--nb-danger); }

    .actions-cell { display: flex; gap: 6px; justify-content: center; align-items: center; }
    .drawer-btns { display: flex; gap: 10px; }

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
  showModal = signal(false);
  saving = signal(false);
  typeFilter = signal('');
  detail = signal<any | null>(null);

  typeTabs = [
    { key: '', label: 'الكل' },
    { key: 'payment', label: 'سندات الصرف' },
    { key: 'receipt', label: 'سندات القبض' },
    { key: 'journal', label: 'سندات التسوية' }
  ];

  ngOnInit() {
    this.service.getCurrencies({ status: 'active' }).subscribe((r) => {
      if (r?.success) this.currencies.set(r.data);
    });
    this.service.getPaymentMethods().subscribe((r) => {
      if (r?.success) this.methods.set(r.data);
    });
    this.service.getCOA({ status: 'active' }).subscribe((r) => {
      if (r?.success) this.accounts.set(r.data);
    });
    this.service.getBankAccounts().subscribe((r) => {
      if (r?.success) this.bankAccounts.set(r.data);
    });
    this.service.getCashBoxes().subscribe((r) => {
      if (r?.success) this.cashBoxes.set(r.data);
    });
    this.load();
  }

  setType(t: string) {
    this.typeFilter.set(t);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.service.getVouchers(this.typeFilter() ? { voucher_type: this.typeFilter() } : undefined).subscribe({
      next: (r) => {
        if (r?.success) this.vouchers.set(r.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  handleCreateConfirm(payload: any) {
    this.saving.set(true);
    this.service.createVoucher(payload).subscribe({
      next: (r) => {
        this.saving.set(false);
        if (r?.success) {
          this.notify.success('تم إنشاء السند المالي بنجاح.');
          this.showModal.set(false);
          this.load();
        } else {
          this.notify.error(r?.message || 'تعذر حفظ السند.');
        }
      },
      error: () => {
        this.saving.set(false);
        this.notify.error('حدث خطأ أثناء حفظ السند.');
      },
    });
  }

  post(v: any) {
    this.service.postVoucher(v.id).subscribe({
      next: (r) => {
        if (r?.success) {
          this.notify.success('تم ترحيل السند للدفاتر بنجاح.');
          this.load();
        } else {
          this.notify.error(r?.message || 'تعذر الترحيل.');
        }
      },
      error: (e) => this.notify.error(e?.error?.message || 'تعذر ترحيل السند.')
    });
  }

  print(v: any) {
    if (!v) return;
    const populated = {
      ...v,
      payment_method_name: this.methodName(v.payment_method),
      gl_account_name: this.accName(v.gl_account),
      bank_account_name: this.bankName(v.bank_account),
      cash_box_name: this.boxName(v.cash_box),
    };
    printVoucher(populated);
  }

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
