import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';

/** نموذج إضافة عقد مشتريات — اتفاقية إطارية مع مورّد لفترة محددة. */
@Component({
  selector: 'app-contract-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel" dir="rtl">
      <div class="panel-head">
        <h3>عقد جديد</h3>
        <button class="x" (click)="cancel.emit()" aria-label="إغلاق">✕</button>
      </div>
      <div class="grid">
        <label>المورّد <span>*</span>
          <select [(ngModel)]="vendorId">
            <option value="">اختر المورّد…</option>
            @for (v of vendors(); track v.id) { <option [value]="v.id">{{ v.name_ar || v.name_en }}</option> }
          </select>
        </label>
        <label>عنوان العقد <span>*</span>
          <input [(ngModel)]="title" placeholder="مثال: توريد قرطاسية سنوي" />
        </label>
        <label>رقم العقد <span>*</span>
          <input [(ngModel)]="contractNumber" placeholder="CT-2026-001" />
        </label>
        <label>تاريخ البداية <span>*</span>
          <input type="date" [(ngModel)]="startDate" />
        </label>
        <label>تاريخ النهاية <span>*</span>
          <input type="date" [(ngModel)]="endDate" />
        </label>
        <label>قيمة العقد <span>*</span>
          <input type="number" min="0" [(ngModel)]="contractValue" placeholder="0.00" />
        </label>
      </div>
      <div class="foot">
        <button class="btn ghost" (click)="cancel.emit()">إلغاء</button>
        <button class="btn primary" [disabled]="saving()" (click)="submit()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ العقد' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px; margin-bottom: 16px; font-family: var(--nb-font-family); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .x { background: none; border: none; font-size: 16px; color: var(--nb-text-muted); cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    label span { color: var(--nb-danger); }
    input, select { font-family: inherit; font-size: 13px; padding: 8px 10px; border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--nb-border-soft); }
    .btn { height: 36px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 700; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:disabled { opacity: .6; }
  `]
})
export class ContractCreateFormComponent implements OnInit {
  readonly created = output<void>();
  readonly cancel = output<void>();

  private svc = inject(ProcurementService);
  private notify = inject(NotificationService);

  readonly vendors = signal<any[]>([]);
  readonly saving = signal(false);

  vendorId = ''; title = ''; contractNumber = ''; startDate = ''; endDate = ''; contractValue: number | null = null;

  ngOnInit() {
    this.contractNumber = 'CT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d: any) => this.vendors.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])),
      error: () => {},
    });
  }

  submit() {
    if (!this.vendorId) { this.notify.error('اختر المورّد.'); return; }
    if (!this.title.trim() || !this.contractNumber.trim()) { this.notify.error('أدخل العنوان ورقم العقد.'); return; }
    if (!this.startDate || !this.endDate) { this.notify.error('حدّد تاريخي البداية والنهاية.'); return; }
    if (!this.contractValue || this.contractValue <= 0) { this.notify.error('أدخل قيمة عقد صحيحة.'); return; }
    const payload = {
      vendor: this.vendorId, title: this.title.trim(), contract_number: this.contractNumber.trim(),
      start_date: this.startDate, end_date: this.endDate, contract_value: this.contractValue, status: 'active',
    };
    this.saving.set(true);
    this.svc.createContract(payload).subscribe({
      next: () => { this.saving.set(false); this.notify.success('تم إضافة العقد.'); this.created.emit(); },
      error: (e) => { this.saving.set(false); this.notify.error(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر حفظ العقد.'); },
    });
  }
}
