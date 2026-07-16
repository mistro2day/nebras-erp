import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';

/**
 * تسجيل سريع لمورّد — يُفتح من حقل المورّد أثناء تسجيل عرض سعر، فلا يُقطع
 * سياق العمل للذهاب إلى سجل الموردين (نمط Quick Create في Odoo / D365).
 *
 * الإلزامي هو الحد الأدنى فقط (التصنيف والاسم)؛ بقية البيانات النظامية تُترك
 * فارغة وتُستكمل لاحقاً من سجل الموردين. يُنشأ المورّد بحالة «تحت التأهيل».
 */
@Component({
  selector: 'app-quick-vendor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="qv" dir="rtl">
      <div class="head">
        <span class="ic">🏭</span>
        <div>
          <h2>تسجيل مورّد سريع</h2>
          <p>الحد الأدنى فقط — تُستكمل بقية البيانات لاحقاً من سجل الموردين.</p>
        </div>
      </div>

      <div class="grid">
        <label>
          <span class="lbl">التصنيف <b class="req">*</b></span>
          <select [(ngModel)]="categoryId">
            <option value="">اختر التصنيف…</option>
            @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name_ar || c.name_en }}</option> }
          </select>
        </label>
        <label>
          <span class="lbl">اسم المورّد <b class="req">*</b></span>
          <input [(ngModel)]="nameAr" placeholder="مثال: مكتبة الشريف" (keyup.enter)="save()" />
        </label>
        <label>
          <span class="lbl">الرقم الضريبي</span>
          <input [(ngModel)]="taxNumber" placeholder="بدون" />
        </label>
        <label>
          <span class="lbl">السجل التجاري</span>
          <input [(ngModel)]="crNumber" placeholder="بدون" />
        </label>
      </div>

      <div class="note">سيُسجَّل بحالة <b>«تحت التأهيل»</b> — يمكن اعتماده من سجل الموردين.</div>
      @if (error()) { <div class="err">{{ error() }}</div> }

      <div class="acts">
        <button class="btn ghost" (click)="close()">إلغاء</button>
        <button class="btn primary" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ واختيار' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .qv { font-family: var(--nb-font-family, 'Cairo', sans-serif); min-width: 460px; padding: 4px 2px; }
    .head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; font-size: 18px;
      background: var(--nb-primary-50, #eef0fa); flex: none; }
    .head h2 { margin: 0; font-size: 16px; font-weight: 800; color: var(--nb-text, #1f2937); }
    .head p { margin: 2px 0 0; font-size: 12px; color: var(--nb-text-muted, #64748b); }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
    label { display: grid; grid-template-rows: 18px auto; gap: 6px; }
    .lbl { font-size: 12.5px; font-weight: 700; color: var(--nb-text, #1f2937); line-height: 18px; }
    .req { color: var(--nb-danger, #dc2626); }
    input, select { font-family: inherit; font-size: 13px; height: 38px; padding: 0 11px; width: 100%;
      box-sizing: border-box; border: 1px solid var(--nb-border, #e5e7eb); border-radius: var(--nb-radius, 8px);
      background: var(--nb-surface, #fff); color: var(--nb-text, #1f2937); }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400, #7986CB);
      box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    input::placeholder { color: var(--nb-text-muted, #94a3b8); opacity: .8; }

    .note { margin-top: 14px; background: var(--nb-primary-50, #eef0fa); border-radius: 8px;
      padding: 9px 12px; font-size: 12px; color: var(--nb-primary-800, #2C387E); }
    .err { margin-top: 10px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
      border-radius: 8px; padding: 8px 10px; font-size: 12.5px; }
    .acts { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
    .btn { height: 36px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 700;
      border-radius: var(--nb-radius, 8px); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised, #f1f5f9); border: 1px solid var(--nb-border, #e5e7eb); color: var(--nb-text, #1f2937); }
    .btn.primary { background: var(--nb-primary-600, #3F51B5); color: #fff; }
    .btn.primary:disabled { opacity: .6; }
  `]
})
export class QuickVendorDialogComponent implements OnInit {
  private svc = inject(ProcurementService);
  private ref = inject(MatDialogRef<QuickVendorDialogComponent>);

  readonly categories = signal<any[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');

  categoryId = ''; nameAr = ''; taxNumber = ''; crNumber = '';

  ngOnInit() {
    this.svc.getVendorCategories().subscribe({
      next: (d: any) => this.categories.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])),
      error: () => {},
    });
  }

  close() { this.ref.close(null); }

  save() {
    this.error.set('');
    if (!this.categoryId) { this.error.set('اختر تصنيف المورّد.'); return; }
    if (!this.nameAr.trim()) { this.error.set('أدخل اسم المورّد.'); return; }

    this.saving.set(true);
    this.svc.createVendor({
      category: this.categoryId,
      name_ar: this.nameAr.trim(),
      name_en: this.nameAr.trim(),
      tax_number: this.taxNumber.trim() || null,
      cr_number: this.crNumber.trim() || null,
      status: 'pending',
    }).subscribe({
      next: (res: any) => { this.saving.set(false); this.ref.close(res?.data ?? res); },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر حفظ المورّد.');
      },
    });
  }
}
