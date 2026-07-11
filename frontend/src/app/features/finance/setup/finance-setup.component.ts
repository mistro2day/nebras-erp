import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * الإعداد والمرجعيات المالية (Finance Setup) — أنواع الحسابات، التصنيفات، وطرق الدفع.
 * على غرار Configuration في Odoo و Ledger setup / Methods of payment في D365 Finance.
 */
@Component({
  selector: 'app-finance-setup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الإعداد والمرجعيات المالية" subtitle="تعريف أنواع الحسابات وتصنيفاتها وطرق الدفع المعتمدة في النظام المحاسبي.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
      </nb-page-header>

      <div class="statusbar">
        <button class="seg" [class.active]="tab()==='types'" (click)="tab.set('types')">أنواع الحسابات</button>
        <button class="seg" [class.active]="tab()==='cats'" (click)="tab.set('cats')">تصنيفات الحسابات</button>
        <button class="seg" [class.active]="tab()==='methods'" (click)="tab.set('methods')">طرق الدفع</button>
      </div>

      @if (tab() === 'types') {
        <nb-panel title="إضافة نوع حساب" subtitle="الفئات المحاسبية الأساسية الخمس: أصول، خصوم، حقوق ملكية، إيرادات، مصروفات." class="mb">
          <div class="grid4">
            <label>الرمز<input class="fld" [(ngModel)]="type.code" placeholder="asset" /></label>
            <label>الاسم العربي<input class="fld" [(ngModel)]="type.name_ar" placeholder="الأصول" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="type.name_en" placeholder="Assets" /></label>
            <label>الطبيعة<select class="fld" [(ngModel)]="type.normal_balance"><option value="debit">مدين</option><option value="credit">دائن</option></select></label>
          </div>
          <div class="form-actions"><button class="btn primary" [disabled]="saving()" (click)="saveType()">حفظ النوع</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>الرمز</th><th>الاسم</th><th>الطبيعة</th></tr></thead>
          <tbody>
            @for (x of types(); track x.id) { <tr><td><strong>{{ x.code }}</strong></td><td>{{ x.name_ar }} <span class="nm">{{ x.name_en }}</span></td>
              <td><span class="badge" [class.debit]="x.normal_balance==='debit'" [class.credit]="x.normal_balance==='credit'">{{ x.normal_balance === 'debit' ? 'مدين' : 'دائن' }}</span></td></tr> }
            @if (!types().length) { <tr><td colspan="3" class="empty">لا توجد أنواع.</td></tr> }
          </tbody></table></div></nb-panel>
      }

      @if (tab() === 'cats') {
        <nb-panel title="إضافة تصنيف حساب" class="mb">
          <div class="grid4">
            <label>الرمز<input class="fld" [(ngModel)]="cat.code" placeholder="current_assets" /></label>
            <label>الاسم العربي<input class="fld" [(ngModel)]="cat.name_ar" placeholder="أصول متداولة" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="cat.name_en" /></label>
            <label>نوع الحساب<select class="fld" [(ngModel)]="cat.account_type"><option value="">اختر…</option>@for (x of types(); track x.id) { <option [value]="x.id">{{ x.name_ar }}</option> }</select></label>
          </div>
          <div class="form-actions"><button class="btn primary" [disabled]="saving()" (click)="saveCat()">حفظ التصنيف</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>الرمز</th><th>الاسم</th><th>النوع</th></tr></thead>
          <tbody>
            @for (c of cats(); track c.id) { <tr><td><strong>{{ c.code }}</strong></td><td>{{ c.name_ar }}</td><td>{{ typeName(c.account_type) }}</td></tr> }
            @if (!cats().length) { <tr><td colspan="3" class="empty">لا توجد تصنيفات.</td></tr> }
          </tbody></table></div></nb-panel>
      }

      @if (tab() === 'methods') {
        <nb-panel title="إضافة طريقة دفع" class="mb">
          <div class="grid4">
            <label>الرمز<input class="fld" [(ngModel)]="method.code" placeholder="cash" /></label>
            <label>الاسم العربي<input class="fld" [(ngModel)]="method.name_ar" placeholder="نقداً" /></label>
            <label>الاسم الإنجليزي<input class="fld" [(ngModel)]="method.name_en" placeholder="Cash" /></label>
          </div>
          <div class="form-actions"><button class="btn primary" [disabled]="saving()" (click)="saveMethod()">حفظ الطريقة</button></div>
        </nb-panel>
        <nb-panel [flush]="true"><div class="table-wrap"><table class="nb-table">
          <thead><tr><th>الرمز</th><th>الاسم</th><th>الحالة</th></tr></thead>
          <tbody>
            @for (m of methods(); track m.id) { <tr><td><strong>{{ m.code }}</strong></td><td>{{ m.name_ar }} <span class="nm">{{ m.name_en }}</span></td>
              <td><span class="badge ok">{{ m.status === 'active' ? 'نشط' : 'غير نشط' }}</span></td></tr> }
            @if (!methods().length) { <tr><td colspan="3" class="empty">لا توجد طرق دفع.</td></tr> }
          </tbody></table></div></nb-panel>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .statusbar { display: flex; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
    .seg { height: 32px; padding: 0 14px; border: 1px solid var(--nb-border); background: var(--nb-surface);
      color: var(--nb-text-secondary); border-radius: var(--nb-radius); font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .seg.active { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: var(--nb-on-primary); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .nb-table tr:last-child td { border-bottom: none; }
    .nb-table tbody tr:hover td { background: var(--nb-surface-raised); }
    .nm { color: var(--nb-text-muted); font-size: 12px; margin-inline-start: 6px; }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.debit { background: var(--nb-info-bg); color: var(--nb-info); }
    .badge.credit { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.ok { background: var(--nb-success-bg); color: var(--nb-success); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: var(--nb-on-primary); } .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class FinanceSetupComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  tab = signal<'types' | 'cats' | 'methods'>('types');
  types = signal<any[]>([]);
  cats = signal<any[]>([]);
  methods = signal<any[]>([]);
  saving = signal(false);

  type: any = { code: '', name_ar: '', name_en: '', normal_balance: 'debit' };
  cat: any = { code: '', name_ar: '', name_en: '', account_type: '' };
  method: any = { code: '', name_ar: '', name_en: '' };

  ngOnInit() { this.loadAll(); }
  loadAll() {
    this.service.getAccountTypes().subscribe((r) => { if (r?.success) this.types.set(r.data); });
    this.service.getAccountCategories().subscribe((r) => { if (r?.success) this.cats.set(r.data); });
    this.service.getPaymentMethods().subscribe((r) => { if (r?.success) this.methods.set(r.data); });
  }
  typeName(id: string) { return this.types().find((x) => x.id === id)?.name_ar || '—'; }

  private handle(obs: any, okMsg: string, reset: () => void) {
    this.saving.set(true);
    obs.subscribe({
      next: (r: any) => { this.saving.set(false); if (r?.success) { this.notify.success(okMsg); reset(); this.loadAll(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e: any) => { this.saving.set(false); this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'); },
    });
  }
  saveType() {
    if (!this.type.code || !this.type.name_ar) { this.notify.error('يرجى إدخال الرمز والاسم.'); return; }
    this.handle(this.service.createAccountType(this.type), 'تمت إضافة نوع الحساب.', () => (this.type = { code: '', name_ar: '', name_en: '', normal_balance: 'debit' }));
  }
  saveCat() {
    if (!this.cat.code || !this.cat.name_ar || !this.cat.account_type) { this.notify.error('يرجى إدخال الرمز والاسم ونوع الحساب.'); return; }
    this.handle(this.service.createAccountCategory(this.cat), 'تمت إضافة التصنيف.', () => (this.cat = { code: '', name_ar: '', name_en: '', account_type: '' }));
  }
  saveMethod() {
    if (!this.method.code || !this.method.name_ar) { this.notify.error('يرجى إدخال الرمز والاسم.'); return; }
    this.handle(this.service.createPaymentMethod(this.method), 'تمت إضافة طريقة الدفع.', () => (this.method = { code: '', name_ar: '', name_en: '' }));
  }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
