import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';

/** نموذج إضافة مورّد جديد — التصنيف والبيانات النظامية وحالة التأهيل. */
@Component({
  selector: 'app-vendor-create-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel" dir="rtl">
      <div class="panel-head">
        <h3>مورّد جديد</h3>
        <button class="x" (click)="cancel.emit()" aria-label="إغلاق">✕</button>
      </div>
      <div class="grid">
        <label>التصنيف <span>*</span>
          <select [(ngModel)]="categoryId">
            <option value="">اختر التصنيف…</option>
            @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name_ar || c.name_en }}</option> }
          </select>
        </label>
        <label>الاسم (عربي) <span>*</span>
          <input [(ngModel)]="nameAr" placeholder="اسم المورّد" />
        </label>
        <label>الاسم (إنجليزي)
          <input [(ngModel)]="nameEn" placeholder="Vendor name" />
        </label>
        <label>الرقم الضريبي
          <input [(ngModel)]="taxNumber" placeholder="اختياري" />
        </label>
        <label>السجل التجاري
          <input [(ngModel)]="crNumber" placeholder="اختياري" />
        </label>
        <label>الحالة
          <select [(ngModel)]="status">
            <option value="pending">تحت التأهيل</option>
            <option value="approved">معتمد ونشط</option>
            <option value="suspended">موقوف</option>
          </select>
        </label>
      </div>
      <div class="foot">
        <button class="btn ghost" (click)="cancel.emit()">إلغاء</button>
        <button class="btn primary" [disabled]="saving()" (click)="submit()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ المورّد' }}
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
export class VendorCreateFormComponent implements OnInit {
  readonly created = output<void>();
  readonly cancel = output<void>();

  private svc = inject(ProcurementService);
  private notify = inject(NotificationService);

  readonly categories = signal<any[]>([]);
  readonly saving = signal(false);

  categoryId = ''; nameAr = ''; nameEn = ''; taxNumber = ''; crNumber = ''; status = 'pending';

  ngOnInit() {
    this.svc.getVendorCategories().subscribe({
      next: (d: any) => this.categories.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])),
      error: () => {},
    });
  }

  submit() {
    if (!this.categoryId) { this.notify.error('اختر تصنيف المورّد.'); return; }
    if (!this.nameAr.trim()) { this.notify.error('أدخل اسم المورّد.'); return; }
    const payload = {
      category: this.categoryId, name_ar: this.nameAr.trim(),
      name_en: this.nameEn.trim() || this.nameAr.trim(),
      tax_number: this.taxNumber.trim() || null, cr_number: this.crNumber.trim() || null,
      status: this.status,
    };
    this.saving.set(true);
    this.svc.createVendor(payload).subscribe({
      next: () => { this.saving.set(false); this.notify.success('تم إضافة المورّد.'); this.created.emit(); },
      error: (e) => { this.saving.set(false); this.notify.error(e?.error?.error || e?.error?.detail || 'تعذّر حفظ المورّد.'); },
    });
  }
}
