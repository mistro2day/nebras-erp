import { ChangeDetectionStrategy, Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FinanceService } from '../../finance/finance.service';

export interface PayVendorData {
  poNumber: string;
  vendorName: string;
  invoiceNumber: string;
  amount: number;
}

/**
 * سداد المورّد.
 * يعرض القيد الذي سينشأ قبل التنفيذ — مدين الذمم الدائنة، دائن مصدر النقد،
 * لأن السداد يخرج مالاً فعلياً ولا ينبغي أن يتم بلا وضوح عن مصدره.
 */
@Component({
  selector: 'app-pay-vendor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, MatDialogModule],
  template: `
    <div class="nb-dlg" dir="rtl">
      <header class="nb-dlg-head">
        <span class="h-ic">💳</span>
        <div>
          <h2>سداد المورّد</h2>
          <p>{{ data.poNumber }} — {{ data.vendorName }}</p>
        </div>
      </header>

      <div class="nb-dlg-body">
        <div class="amount">
          <span class="a-lbl">المبلغ المستحق</span>
          <span class="a-val">{{ data.amount | number:'1.2-2' }} <small>ر.س</small></span>
          <span class="a-inv">فاتورة {{ data.invoiceNumber }}</span>
        </div>

        <div class="fields">
          <label>
            <span>يُصرف من <i>*</i></span>
            <select [(ngModel)]="source" (ngModelChange)="onSource()">
              <option value="">اختر…</option>
              <optgroup label="حسابات بنكية">
                @for (b of banks(); track b.id) {
                  <option [value]="'bank:' + b.id">{{ b.bank_name }} — {{ b.account_number }}</option>
                }
              </optgroup>
              <optgroup label="الخزائن النقدية">
                @for (c of boxes(); track c.id) {
                  <option [value]="'box:' + c.id">{{ c.name_ar }}</option>
                }
              </optgroup>
            </select>
          </label>
          <label>
            <span>طريقة الدفع <i>*</i></span>
            <select [(ngModel)]="methodId">
              <option value="">اختر…</option>
              @for (m of methods(); track m.id) { <option [value]="m.id">{{ m.name_ar }}</option> }
            </select>
          </label>
          <label>
            <span>المبلغ المدفوع</span>
            <input type="number" min="0" step="0.01" [(ngModel)]="amount" />
          </label>
        </div>

        <!-- القيد المتوقّع -->
        <div class="preview">
          <span class="p-t">القيد الذي سيُنشأ</span>
          <div class="p-line"><span>مدين — ذمم الموردين</span><span class="mono">{{ amount | number:'1.2-2' }}</span></div>
          <div class="p-line"><span>دائن — {{ sourceLabel() || 'مصدر النقد' }}</span><span class="mono">{{ amount | number:'1.2-2' }}</span></div>
          <span class="p-n">يُقفل الالتزام تجاه المورّد ويخرج النقد من الحساب المحدّد.</span>
        </div>

        @if (error()) { <p class="err">{{ error() }}</p> }
      </div>

      <footer class="nb-dlg-acts">
        <button class="nb-dlg-btn ghost" (click)="close()">إلغاء</button>
        <button class="nb-dlg-btn primary" [disabled]="!canPay()" (click)="confirm()">تأكيد السداد</button>
      </footer>
    </div>
  `,
  styleUrl: '../../../shared/components/nb-dialog.scss',
  styles: [`
    .amount { background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 10px; padding: 12px 14px; margin-bottom: 14px;
      display: flex; flex-direction: column; gap: 2px; }
    .a-lbl { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .a-val { font-size: 24px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .a-val small { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .a-inv { font-size: 11px; color: var(--nb-text-muted); }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    .fields label:first-child { grid-column: 1 / -1; }

    .preview { border: 1px dashed var(--nb-border); border-radius: 10px; padding: 11px 13px;
      display: flex; flex-direction: column; gap: 5px; }
    .p-t { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .p-line { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--nb-text); }
    .mono { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; font-weight: 700; }
    .p-n { font-size: 11px; color: var(--nb-text-muted); margin-top: 2px; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class PayVendorDialogComponent implements OnInit {
  private finance = inject(FinanceService);
  private ref = inject(MatDialogRef<PayVendorDialogComponent>);

  readonly banks = signal<any[]>([]);
  readonly boxes = signal<any[]>([]);
  readonly methods = signal<any[]>([]);
  readonly error = signal('');

  source = '';
  methodId = '';
  amount = 0;

  constructor(@Inject(MAT_DIALOG_DATA) public data: PayVendorData) {
    this.amount = data.amount;
  }

  sourceLabel(): string {
    if (!this.source) return '';
    const [kind, id] = this.source.split(':');
    if (kind === 'bank') {
      const b = this.banks().find((x) => x.id === id);
      return b ? `${b.bank_name} ${b.account_number}` : '';
    }
    return this.boxes().find((x) => x.id === id)?.name_ar || '';
  }

  onSource() { this.error.set(''); }

  canPay(): boolean {
    return !!this.source && !!this.methodId && this.amount > 0 && this.amount <= this.data.amount;
  }

  confirm() {
    if (!this.canPay()) {
      this.error.set(this.amount > this.data.amount
        ? 'المبلغ يتجاوز قيمة أمر الشراء.'
        : 'اختر مصدر الصرف وطريقة الدفع.');
      return;
    }
    const [kind, id] = this.source.split(':');
    this.ref.close({
      payment_method_id: this.methodId,
      bank_account_id: kind === 'bank' ? id : undefined,
      cash_box_id: kind === 'box' ? id : undefined,
      amount: this.amount,
    });
  }

  close() { this.ref.close(null); }

  ngOnInit() {
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.finance.getBankAccounts().subscribe({ next: (r: any) => this.banks.set(rows(r)), error: () => {} });
    this.finance.getCashBoxes().subscribe({ next: (r: any) => this.boxes.set(rows(r)), error: () => {} });
    this.finance.getPaymentMethods().subscribe({ next: (r: any) => this.methods.set(rows(r)), error: () => {} });
  }
}
