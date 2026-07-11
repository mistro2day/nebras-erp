import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FinanceService } from '../finance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * الموازنات التقديرية (Budgets) — رصد الموازنات لكل مركز تكلفة ومتابعة الاستهلاك،
 * على غرار Budgets في Odoo و Budget control في D365 Finance.
 */
@Component({
  selector: 'app-budgets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الموازنات التقديرية" subtitle="رصد الموازنات لكل مركز تكلفة، اعتمادها، ومتابعة نسب الاستهلاك مقابل المرصود.">
        <button class="btn ghost" (click)="back()">رجوع لمساحة العمل</button>
        <button class="btn primary" (click)="showForm.set(!showForm())">＋ موازنة جديدة</button>
      </nb-page-header>

      @if (showForm()) {
        <nb-panel title="إنشاء موازنة" class="mb">
          <div class="grid4">
            <label>اسم الموازنة<input class="fld" [(ngModel)]="form.name" placeholder="موازنة التشغيل 2026" /></label>
            <label>السنة المالية<select class="fld" [(ngModel)]="form.fiscal_year"><option value="">اختر…</option>@for (y of years(); track y.id) { <option [value]="y.id">{{ y.name }}</option> }</select></label>
            <label>مركز التكلفة<select class="fld" [(ngModel)]="form.cost_center"><option [ngValue]="null">— عام —</option>@for (c of centers(); track c.id) { <option [ngValue]="c.id">{{ c.name_ar }}</option> }</select></label>
          </div>
          <div class="items-head"><span>الحساب</span><span>المبلغ المرصود</span><span></span></div>
          @for (it of form.items; track $index) {
            <div class="item-row">
              <select class="fld" [(ngModel)]="it.account"><option value="">— اختر الحساب —</option>@for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.code }} - {{ a.name_ar }}</option> }</select>
              <input class="fld num" type="number" min="0" [(ngModel)]="it.amount" />
              <button class="icon-btn" (click)="removeItem($index)">✕</button>
            </div>
          }
          <button class="btn ghost sm" (click)="addItem()">＋ إضافة بند</button>
          <div class="form-actions"><button class="btn primary" (click)="save()">حفظ الموازنة</button><button class="btn ghost" (click)="showForm.set(false)">إلغاء</button></div>
        </nb-panel>
      }

      <div class="cards">
        @for (b of budgets(); track b.id) {
          <nb-panel [title]="b.name" [subtitle]="yearName(b.fiscal_year) + ' • ' + centerName(b.cost_center)">
            <div class="usage">
              <div class="row"><span class="lbl">المرصود</span><span class="val">{{ allocated(b) | number:'1.2-2' }} ر.س</span></div>
              <div class="row"><span class="lbl">المستهلَك</span><span class="val">{{ consumed(b) | number:'1.2-2' }} ر.س</span></div>
              <div class="bar"><span class="fill" [class.warn]="rate(b) > 90" [style.width.%]="clamp(rate(b))"></span></div>
              <div class="row"><span class="lbl">نسبة الاستهلاك</span><span class="val" [class.danger]="rate(b) > 90">{{ rate(b) | number:'1.0-1' }}%</span></div>
            </div>
            <div class="foot">
              <span class="badge" [class]="b.status">{{ statusLabel(b.status) }}</span>
              @if (b.status !== 'approved') { <button class="btn primary xs" (click)="approve(b)">اعتماد الموازنة</button> }
            </div>
          </nb-panel>
        }
        @if (!budgets().length) { <nb-panel><div class="empty">لا توجد موازنات مسجلة بعد.</div></nb-panel> }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-background); font-family: var(--nb-font-family); }
    .mb { margin-bottom: 16px; }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; box-sizing: border-box; width: 100%; }
    .fld.num { text-align: end; }
    .grid4 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 800px) { .grid4 { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .items-head, .item-row { display: grid; grid-template-columns: 2.5fr 1.2fr 34px; gap: 8px; align-items: center; }
    .items-head { margin: 16px 0 6px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .item-row { margin-bottom: 8px; }
    .icon-btn { width: 30px; height: 30px; border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: var(--nb-radius); cursor: pointer; color: var(--nb-danger); }
    .form-actions { display: flex; gap: 10px; margin-top: 14px; }

    .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (max-width: 800px) { .cards { grid-template-columns: 1fr; } }
    .usage { display: flex; flex-direction: column; gap: 8px; }
    .usage .row { display: flex; justify-content: space-between; font-size: 13px; }
    .usage .lbl { color: var(--nb-text-muted); } .usage .val { font-weight: 700; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .usage .val.danger { color: var(--nb-danger); }
    .bar { height: 8px; border-radius: 6px; background: var(--nb-border-soft); overflow: hidden; }
    .fill { display: block; height: 100%; background: var(--nb-primary-600); } .fill.warn { background: var(--nb-danger); }
    .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--nb-border-soft); }
    .badge { display: inline-flex; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: var(--nb-radius-sm); }
    .badge.draft { background: var(--nb-border-soft); color: var(--nb-text-secondary); }
    .badge.approved { background: var(--nb-success-bg); color: var(--nb-success); }
    .badge.revised { background: var(--nb-info-bg); color: var(--nb-info); }
    .empty { text-align: center; padding: 26px; color: var(--nb-text-muted); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 30px; } .btn.xs { height: 28px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; } .btn.primary:hover { background: var(--nb-primary-700); }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class BudgetsComponent implements OnInit {
  private service = inject(FinanceService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  budgets = signal<any[]>([]);
  years = signal<any[]>([]);
  centers = signal<any[]>([]);
  accounts = signal<any[]>([]);
  showForm = signal(false);
  form: any = this.blank();

  ngOnInit() {
    this.service.getFiscalYears().subscribe((r) => { if (r?.success) this.years.set(r.data); });
    this.service.getCostCenters().subscribe((r) => { if (r?.success) this.centers.set(r.data); });
    this.service.getCOA({ status: 'active' }).subscribe((r) => { if (r?.success) this.accounts.set(r.data); });
    this.load();
  }
  blank() { return { name: '', fiscal_year: '', cost_center: null, status: 'draft', items: [{ account: '', amount: 0 }] }; }
  load() { this.service.getBudgets().subscribe((r) => { if (r?.success) this.budgets.set(r.data); }); }

  addItem() { this.form.items = [...this.form.items, { account: '', amount: 0 }]; }
  removeItem(i: number) { this.form.items = this.form.items.filter((_: any, idx: number) => idx !== i); }

  allocated(b: any) { return (b.items || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0); }
  consumed(b: any) { return (b.items || []).reduce((s: number, i: any) => s + (Number(i.consumed_amount) || 0), 0); }
  rate(b: any) { const a = this.allocated(b); return a > 0 ? (this.consumed(b) / a) * 100 : 0; }
  clamp(v: number) { return Math.max(0, Math.min(100, v)); }
  yearName(id: string) { return this.years().find((y) => y.id === id)?.name || '—'; }
  centerName(id: string) { return id ? (this.centers().find((c) => c.id === id)?.name_ar || 'مركز') : 'موازنة عامة'; }
  statusLabel(s: string) { return ({ draft: 'مسودة', approved: 'معتمدة', revised: 'معدلة' } as any)[s] || s; }

  save() {
    if (!this.form.name || !this.form.fiscal_year) { this.notify.error('يرجى إدخال اسم الموازنة والسنة المالية.'); return; }
    const payload = { ...this.form, items: this.form.items.filter((i: any) => i.account && Number(i.amount) > 0) };
    this.service.createBudget(payload).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ الموازنة.'); this.showForm.set(false); this.form = this.blank(); this.load(); } else this.notify.error(r?.message || 'تعذر الحفظ.'); },
      error: (e) => this.notify.error(e?.error?.message || 'حدث خطأ أثناء الاتصال بالخادم.'),
    });
  }
  approve(b: any) { this.service.approveBudget(b.id).subscribe({ next: (r) => { if (r?.success) { this.notify.success('تم اعتماد الموازنة.'); this.load(); } else this.notify.error(r?.message || 'تعذر الاعتماد.'); }, error: (e) => this.notify.error(e?.error?.message || 'تعذر اعتماد الموازنة.') }); }
  back() { this.router.navigateByUrl('/finance/dashboard'); }
}
