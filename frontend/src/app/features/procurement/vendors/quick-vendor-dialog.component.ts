import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';

/**
 * تسجيل سريع لمورّد — يُفتح من حقل المورّد أثناء تسجيل عرض سعر، فلا يُقطع
 * سياق العمل للذهاب إلى سجل الموردين (نمط Quick Create في Odoo / D365).
 *
 * الإلزامي هو الحد الأدنى (التصنيف والاسم)؛ ما عداه يُترك «بدون» ويُستكمل من
 * ملف المورّد. إن أُدخل هاتف أو بريد تُنشأ جهة اتصال أولى للمورّد.
 */
@Component({
  selector: 'app-quick-vendor-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <div class="nb-dlg" dir="rtl">
      <div class="nb-dlg-head">
        <span class="nb-dlg-ic">🏭</span>
        <div>
          <h2>تسجيل مورّد سريع</h2>
          <p>الحد الأدنى فقط — تُستكمل بقية البيانات لاحقاً من ملف المورّد.</p>
        </div>
      </div>

      <div class="nb-dlg-grid cols-2">
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
          <span class="lbl">رقم الجوال</span>
          <input [(ngModel)]="phone" placeholder="بدون" />
        </label>
        <label>
          <span class="lbl">البريد الإلكتروني</span>
          <input type="email" [(ngModel)]="email" placeholder="بدون" />
        </label>
      </div>

      <div class="nb-dlg-note">
        سيُسجَّل بحالة <b>«تحت التأهيل»</b> — يمكن اعتماده وإكمال بياناته من ملف المورّد.
      </div>
      @if (error()) { <div class="nb-dlg-err">{{ error() }}</div> }

      <div class="nb-dlg-acts">
        <button class="nb-dlg-btn ghost" (click)="close()">إلغاء</button>
        <button class="nb-dlg-btn primary" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'جارٍ الحفظ…' : 'حفظ واختيار' }}
        </button>
      </div>
    </div>
  `,
  styleUrl: '../../../shared/components/nb-dialog.scss',
})
export class QuickVendorDialogComponent implements OnInit {
  private svc = inject(ProcurementService);
  private ref = inject(MatDialogRef<QuickVendorDialogComponent>);

  readonly categories = signal<any[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');

  categoryId = ''; nameAr = ''; phone = ''; email = '';

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
      tax_number: null,
      cr_number: null,
      status: 'pending',
    }).subscribe({
      next: (res: any) => {
        const vendor = res?.data ?? res;
        // جهة اتصال أولى إن أُدخل هاتف أو بريد — غير حاجبة للنجاح
        const phone = this.phone.trim(), email = this.email.trim();
        if (vendor?.id && (phone || email)) {
          this.svc.createVendorContact({
            vendor: vendor.id, name: this.nameAr.trim(),
            phone: phone || null, email: email || null,
          }).subscribe({ next: () => {}, error: () => {} });
        }
        this.saving.set(false);
        this.ref.close(vendor);
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.details?.error || e?.details?.detail || e?.message || 'تعذّر حفظ المورّد.');
      },
    });
  }
}
