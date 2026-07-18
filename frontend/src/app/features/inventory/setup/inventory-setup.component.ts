import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * مرجعيات المخزون — فئات الأصناف ووحدات القياس.
 * هذه المرجعيات شرط لإنشاء أي صنف، فتُدار قبل الدخول في التشغيل.
 */
@Component({
  selector: 'app-inventory-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="مرجعيات المخزون" subtitle="فئات الأصناف ووحدات القياس المعتمدة — يُبنى عليها كل صنف.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="tabs">
        <button [class.on]="tab()==='cats'" (click)="tab.set('cats')">الفئات ({{ cats().length }})</button>
        <button [class.on]="tab()==='units'" (click)="tab.set('units')">وحدات القياس ({{ units().length }})</button>
      </div>

      <!-- الفئات -->
      @if (tab() === 'cats') {
        <section class="form-card">
          <header class="fc-head"><h3>إضافة فئة</h3></header>
          <div class="fc-body">
            <div class="fields">
              <label>
                <span>الرمز <i>*</i></span>
                <input [(ngModel)]="cat.code" placeholder="STAT" />
              </label>
              <label>
                <span>الاسم بالعربي <i>*</i></span>
                <input [(ngModel)]="cat.name_ar" placeholder="قرطاسية ولوازم مكتبية" />
              </label>
              <label>
                <span>الاسم بالإنجليزي</span>
                <input [(ngModel)]="cat.name_en" placeholder="Stationery" />
              </label>
              <label class="act">
                <span>&nbsp;</span>
                <button class="btn primary" [disabled]="saving()" (click)="saveCat()">
                  {{ saving() ? 'جارٍ الحفظ…' : 'إضافة الفئة' }}
                </button>
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
        </section>

        <section class="card">
          <div class="row head"><span>الرمز</span><span>الاسم</span><span class="ta-end">الأصناف</span></div>
          @if (loading()) {
            <nb-loading message="جارٍ تحميل الفئات…"></nb-loading>
          } @else {
            @for (c of cats(); track c.id) {
              <div class="row">
                <span class="mono strong">{{ c.code }}</span>
                <span>{{ c.name_ar }} <span class="muted">{{ c.name_en }}</span></span>
                <span class="ta-end mono">{{ itemsIn(c.id) }}</span>
              </div>
            }
            @if (!cats().length) { <div class="empty">لا توجد فئات — أضف فئة لتتمكن من تعريف الأصناف.</div> }
          }
        </section>
      }

      <!-- الوحدات -->
      @if (tab() === 'units') {
        <section class="form-card">
          <header class="fc-head"><h3>إضافة وحدة قياس</h3></header>
          <div class="fc-body">
            <div class="fields">
              <label>
                <span>الرمز <i>*</i></span>
                <input [(ngModel)]="unit.code" placeholder="PCS" />
              </label>
              <label>
                <span>الاسم بالعربي <i>*</i></span>
                <input [(ngModel)]="unit.name_ar" placeholder="قطعة" />
              </label>
              <label>
                <span>الاسم بالإنجليزي</span>
                <input [(ngModel)]="unit.name_en" placeholder="Piece" />
              </label>
              <label class="act">
                <span>&nbsp;</span>
                <button class="btn primary" [disabled]="saving()" (click)="saveUnit()">
                  {{ saving() ? 'جارٍ الحفظ…' : 'إضافة الوحدة' }}
                </button>
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
        </section>

        <section class="card">
          <div class="row head"><span>الرمز</span><span>الاسم</span><span class="ta-end">الأصناف</span></div>
          @if (loading()) {
            <nb-loading message="جارٍ تحميل الوحدات…"></nb-loading>
          } @else {
            @for (u of units(); track u.id) {
              <div class="row">
                <span class="mono strong">{{ u.code }}</span>
                <span>{{ u.name_ar }} <span class="muted">{{ u.name_en }}</span></span>
                <span class="ta-end mono">{{ itemsWithUom(u.id) }}</span>
              </div>
            }
            @if (!units().length) { <div class="empty">لا توجد وحدات قياس بعد.</div> }
          }
        </section>
      }
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 0.8fr 2.4fr 0.7fr; }
    .strong { font-weight: 800; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tabs button { font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 7px 16px; }
    .tabs button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { padding: 12px 18px; background: var(--nb-primary-50, #f5f6ff);
      border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .fc-body { padding: 16px 18px; }

    .fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; align-items: end; }
    @media (max-width: 860px) { .fields { grid-template-columns: repeat(2, 1fr); } }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .fields input:focus { outline: 2px solid var(--nb-primary-400); outline-offset: -1px; border-color: transparent; }
    .fields .act button { height: 38px; width: 100%; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class InventorySetupComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly tab = signal<'cats' | 'units'>('cats');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly cats = signal<any[]>([]);
  readonly units = signal<any[]>([]);
  private items = signal<any[]>([]);

  cat: any = { code: '', name_ar: '', name_en: '' };
  unit: any = { code: '', name_ar: '', name_en: '' };

  itemsIn(catId: string): number { return this.items().filter((i) => i.category === catId).length; }
  itemsWithUom(uomId: string): number { return this.items().filter((i) => i.uom === uomId).length; }

  saveCat() {
    if (!this.cat.code?.trim() || !this.cat.name_ar?.trim()) {
      this.error.set('الرمز والاسم بالعربي مطلوبان.');
      return;
    }
    this.submit(this.svc.createCategory({
      code: this.cat.code.trim(),
      name_ar: this.cat.name_ar.trim(),
      name_en: (this.cat.name_en || this.cat.code).trim(),
    }), () => { this.cat = { code: '', name_ar: '', name_en: '' }; });
  }

  saveUnit() {
    if (!this.unit.code?.trim() || !this.unit.name_ar?.trim()) {
      this.error.set('الرمز والاسم بالعربي مطلوبان.');
      return;
    }
    this.submit(this.svc.createUnit({
      code: this.unit.code.trim(),
      name_ar: this.unit.name_ar.trim(),
      name_en: (this.unit.name_en || this.unit.code).trim(),
      conversion_factor: 1,
    }), () => { this.unit = { code: '', name_ar: '', name_en: '' }; });
  }

  private submit(req: any, onOk: () => void) {
    this.saving.set(true);
    this.error.set('');
    req.subscribe({
      next: () => { this.saving.set(false); onOk(); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر الحفظ.'));
      },
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getCategories().subscribe({
      next: (d) => { this.cats.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getUnits().subscribe({ next: (d) => this.units.set(this.rows(d)), error: () => {} });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
