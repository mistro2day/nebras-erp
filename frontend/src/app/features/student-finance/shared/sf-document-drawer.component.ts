import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NbDrawerComponent } from '../../../shared/nebras/nb-drawer.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

export type SfDoc = { type: 'invoice' | 'receipt' | 'receivable'; data: any } | null;

/**
 * نافذة تفاصيل مستند فوترة الطلاب (فاتورة / سند قبض / مستحق) — قابلة لإعادة الاستخدام.
 * تُستخدم في لوح حساب الطالب (360°) وفي صفحة تفاصيل الطالب لضمان نافذة تفاصيل موحّدة
 * للعرض والطباعة والتصدير (Excel / PDF / CSV).
 */
@Component({
  selector: 'sf-document-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbDrawerComponent, NbExportMenuComponent],
  template: `
    <nb-drawer [open]="!!doc" [width]="620" [title]="meta().title" [subtitle]="meta().subtitle" (closed)="closed.emit()">
      @if (doc; as d) {
        <div class="dl">
          @for (f of fields(); track f.k) {
            <div class="dl-row" [class.total]="f.total"><span class="k">{{ f.k }}</span><span class="v" [class]="f.cls || ''">{{ f.v }}</span></div>
          }
        </div>

        @if (d.type === 'invoice' && d.data.items?.length) {
          <h4 class="dh">بنود الفاتورة</h4>
          <div class="table-wrap">
            <table class="nb-table dlines">
              <thead><tr><th>البند</th><th class="end">المبلغ</th></tr></thead>
              <tbody>
                @for (it of d.data.items; track it.id) {
                  <tr><td>{{ it.description || 'بند رسوم' }}</td><td class="end mono">{{ it.amount | number:'1.2-2' }}</td></tr>
                }
                @if (d.data.discounts?.length) {
                  @for (dc of d.data.discounts; track dc.id) {
                    <tr><td class="disc">{{ dc.discount_reason }}</td><td class="end mono disc">- {{ dc.amount | number:'1.2-2' }}</td></tr>
                  }
                }
                <tr class="sum"><td>الإجمالي</td><td class="end mono">{{ d.data.total_amount | number:'1.2-2' }} ر.س</td></tr>
              </tbody>
            </table>
          </div>
        }
      }
      <div drawer-actions>
        <nb-export-menu [columns]="exportCols()" [rows]="exportRows()" [title]="meta().title" [subtitle]="meta().subtitle" [filename]="meta().title"></nb-export-menu>
      </div>
    </nb-drawer>
  `,
  styles: [`
    .dl { display: flex; flex-direction: column; margin-bottom: 8px; }
    .dl-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 2px; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; }
    .dl-row .k { color: var(--nb-text-muted); }
    .dl-row .v { color: var(--nb-text); font-weight: 700; text-align: end; }
    .dl-row .v.success { color: var(--nb-success); } .dl-row .v.danger { color: var(--nb-danger); }
    .dl-row.total { border-bottom: none; border-top: 2px solid var(--nb-border); margin-top: 4px; }
    .dl-row.total .v { font-size: 16px; }
    .dh { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 14px 0 10px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted); background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table th.end { text-align: end; }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .mono { font-variant-numeric: tabular-nums; } .end { text-align: end; }
    .dlines .sum td { border-top: 2px solid var(--nb-border); font-weight: 700; background: var(--nb-surface-raised); }
    .dlines .disc { color: var(--nb-danger); }
  `],
})
export class SfDocumentDrawerComponent {
  @Input() doc: SfDoc = null;
  @Input() studentName = '';
  /** طرق الدفع لعرض اسم الطريقة في سند القبض (اختياري). */
  @Input() methods: any[] = [];
  @Output() closed = new EventEmitter<void>();

  private methodName(id: string): string { return this.methods.find((m) => m.id === id)?.name_ar || '—'; }
  private money(v: any): string { return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س'; }

  meta(): { title: string; subtitle: string } {
    const d = this.doc;
    if (!d) return { title: '', subtitle: '' };
    if (d.type === 'invoice') return { title: `فاتورة ${d.data.invoice_number}`, subtitle: this.studentName };
    if (d.type === 'receipt') return { title: `سند قبض ${d.data.receipt_number}`, subtitle: this.studentName };
    return { title: 'مستحق فاتورة', subtitle: this.studentName };
  }

  fields(): { k: string; v: string; cls?: string; total?: boolean }[] {
    const d = this.doc;
    if (!d) return [];
    const x = d.data;
    if (d.type === 'invoice') {
      return [
        { k: 'رقم الفاتورة', v: x.invoice_number },
        { k: 'تاريخ الإصدار', v: x.issue_date },
        { k: 'تاريخ الاستحقاق', v: x.due_date },
        { k: 'الحالة', v: x.status === 'posted' ? 'مرحلة ومسجلة' : x.status },
        { k: 'المدفوع', v: this.money(x.paid_amount), cls: 'success' },
        { k: 'المتبقّي', v: this.money(x.outstanding_amount), cls: 'danger' },
        { k: 'قيد المالية', v: x.journal_entry_id ? 'مُرحّل في دفتر الأستاذ ✓' : '—' },
        { k: 'الإجمالي', v: this.money(x.total_amount), total: true },
      ];
    }
    if (d.type === 'receipt') {
      return [
        { k: 'رقم الإيصال', v: x.receipt_number },
        { k: 'تاريخ الدفع', v: x.payment_date },
        { k: 'طريقة الدفع', v: this.methodName(x.payment_method_id) },
        { k: 'الحالة', v: x.status === 'posted' ? 'مرحل ومقفل بالصندوق' : x.status },
        { k: 'سند المالية', v: x.voucher_id ? 'سند قبض مُرحّل ✓' : '—' },
        { k: 'المبلغ المحصّل', v: this.money(x.amount), total: true, cls: 'success' },
      ];
    }
    return [
      { k: 'الحالة', v: x.status === 'paid' ? 'مسدد بالكامل' : 'مستحق' },
      { k: 'المدفوع', v: this.money(x.paid_amount), cls: 'success' },
      { k: 'المتبقّي', v: this.money(x.outstanding_amount), cls: 'danger' },
      { k: 'أصل المستحق', v: this.money(x.amount), total: true },
    ];
  }

  exportCols(): ExportColumn[] {
    if (this.doc?.type === 'invoice') return [{ key: 'description', label: 'البند' }, { key: 'amount', label: 'المبلغ', align: 'end' }];
    return [{ key: 'k', label: 'البيان' }, { key: 'v', label: 'القيمة', align: 'end' }];
  }
  exportRows(): any[] {
    const d = this.doc;
    if (!d) return [];
    if (d.type === 'invoice') {
      const rows = (d.data.items || []).map((i: any) => ({ description: i.description || 'بند رسوم', amount: Number(i.amount).toFixed(2) }));
      (d.data.discounts || []).forEach((dc: any) => rows.push({ description: dc.discount_reason, amount: '-' + Number(dc.amount).toFixed(2) }));
      rows.push({ description: 'الإجمالي', amount: Number(d.data.total_amount).toFixed(2) });
      return rows;
    }
    return this.fields().map((f) => ({ k: f.k, v: f.v }));
  }
}
