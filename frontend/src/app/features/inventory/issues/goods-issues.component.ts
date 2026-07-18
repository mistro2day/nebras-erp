import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { FinanceService } from '../../finance/finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface Line { item: string; qty: number; cost: number; }

/**
 * صرف المخزون للأقسام.
 *
 * الصرف عملية مزدوجة الأثر: يُنقص الرصيد فوراً، ويُنشئ قيداً في المالية
 * يصل **كمسودة** بانتظار اعتماد المحاسب. الشاشة تُظهر الأثرين معاً قبل
 * التنفيذ حتى لا يفاجأ أمين المستودع بأثر لم يقصده.
 */
@Component({
  selector: 'app-goods-issues',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="صرف المخزون" subtitle="صرف الأصناف للأقسام وأثره على الرصيد والدفاتر.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openForm()">＋ سند صرف</button>
      </nb-page-header>

      @if (showForm()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>سند صرف جديد</h3>
            <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
          </header>

          <div class="fc-body">
            <div class="fields">
              <label>
                <span>المستودع <i>*</i></span>
                <select [(ngModel)]="form.warehouse" (ngModelChange)="onWarehouse()">
                  <option value="">اختر…</option>
                  @for (w of stockWarehouses(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>جهة الصرف <i>*</i></span>
                <select [(ngModel)]="form.issue_type">
                  <option value="department">قسم إداري</option>
                  <option value="lab">مختبر</option>
                  <option value="student">طلاب</option>
                  <option value="clinic">عيادة</option>
                </select>
              </label>
              <label>
                <span>حساب المصروف <i>*</i></span>
                <select [(ngModel)]="form.account">
                  <option value="">اختر…</option>
                  @for (a of expenseAccounts(); track a.id) {
                    <option [value]="a.id">{{ a.code }} — {{ a.name_ar }}</option>
                  }
                </select>
              </label>
              <label>
                <span>مركز التكلفة</span>
                <select [(ngModel)]="form.cost_center">
                  <option value="">— بدون —</option>
                  @for (c of costCenters(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
                </select>
              </label>
            </div>

            <!-- البنود -->
            <div class="lines">
              <div class="l-head">
                <span>الصنف</span><span>الكمية</span><span>تكلفة الوحدة</span><span>الإجمالي</span><span></span>
              </div>
              @for (l of lines(); track $index) {
                <div class="l-row">
                  <select [ngModel]="l.item" (ngModelChange)="setItem($index, $event)">
                    <option value="">اختر الصنف…</option>
                    @for (o of availableItems(); track o.id) {
                      <option [value]="o.id">{{ o.name }} — متوفر {{ o.available }}</option>
                    }
                  </select>
                  <input type="number" min="0" [ngModel]="l.qty" (ngModelChange)="setQty($index, $event)" />
                  <input type="number" min="0" step="0.01" [ngModel]="l.cost" (ngModelChange)="setCost($index, $event)" />
                  <span class="l-total mono">{{ (l.qty * l.cost) | number:'1.2-2' }}</span>
                  <button class="rm" (click)="removeLine($index)" aria-label="حذف البند">✕</button>
                </div>
                @if (overIssue($index); as msg) { <p class="l-warn">{{ msg }}</p> }
              }
              <button class="add-line" (click)="addLine()">＋ إضافة بند</button>
            </div>

            <!-- الأثر المزدوج قبل التنفيذ -->
            <div class="impact">
              <div class="im">
                <span class="im-lbl">أثر المخزون</span>
                <span class="im-val">{{ totalQty() | number:'1.0-2' }} وحدة تُخصم فوراً</span>
              </div>
              <div class="im">
                <span class="im-lbl">أثر المالية</span>
                <span class="im-val">{{ total() | number:'1.2-2' }} ر.س</span>
                <span class="im-note">يصل قيداً <b>مسودة</b> بانتظار اعتماد المحاسب.</span>
              </div>
            </div>

            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>

          <footer class="fc-acts">
            <button class="btn ghost" (click)="closeForm()">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الصرف…' : 'تنفيذ الصرف' }}
            </button>
          </footer>
        </section>
      }

      <section class="card">
        <div class="row head">
          <span>رقم السند</span><span>المستودع</span><span>جهة الصرف</span>
          <span class="ta-end">الحالة</span><span class="ta-end">القيد</span>
        </div>
        @if (loading()) {
          <nb-loading message="جارٍ تحميل سندات الصرف…"></nb-loading>
        } @else {
          @for (i of issues(); track i.id) {
            <div class="row">
              <span class="mono strong">{{ i.issue_number }}</span>
              <span class="muted">{{ whName(i.warehouse) }}</span>
              <span class="muted">{{ typeLabel(i.issue_type) }}</span>
              <span class="ta-end"><span class="badge ok">{{ statusLabel(i.status) }}</span></span>
              <span class="ta-end">
                @if (i.journal_entry_id) {
                  <button class="link" (click)="go('/finance/journals')">عرض القيد ‹</button>
                } @else { <span class="muted">—</span> }
              </span>
            </div>
          }
          @if (!issues().length) { <div class="empty">لا توجد سندات صرف بعد.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.3fr 1.3fr 1.2fr 0.9fr 0.9fr; }
    .strong { font-weight: 800; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }
    .link { border: none; background: none; font-family: inherit; font-size: 12px;
      font-weight: 700; color: var(--nb-primary-600); cursor: pointer; padding: 0; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 900px) { .fields { grid-template-columns: repeat(2, 1fr); } }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .lines { border: 1px solid var(--nb-border); border-radius: 10px; padding: 12px; margin-bottom: 14px; }
    .l-head, .l-row { display: grid; grid-template-columns: 2.4fr 0.9fr 1fr 1fr 36px; gap: 8px; align-items: center; }
    .l-head { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); margin-bottom: 7px; }
    .l-row { margin-bottom: 7px; }
    .l-row select, .l-row input { height: 36px; padding: 0 10px; font-family: inherit; font-size: 12.5px;
      border: 1px solid var(--nb-border); border-radius: 7px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .l-total { font-size: 12.5px; font-weight: 700; text-align: end; font-variant-numeric: tabular-nums; }
    .rm { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 7px;
      height: 36px; cursor: pointer; color: var(--nb-text-muted); font-size: 12px; }
    .rm:hover { color: #B91C1C; border-color: #fecaca; }
    .l-warn { margin: -3px 0 8px; font-size: 11.5px; color: #B45309; }
    .add-line { border: 1px dashed var(--nb-border); background: none; border-radius: 8px;
      font-family: inherit; font-size: 12px; font-weight: 700; color: var(--nb-text-muted);
      cursor: pointer; padding: 7px 14px; width: 100%; }
    .add-line:hover { color: var(--nb-primary-700); border-color: var(--nb-primary-400); }

    .impact { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 700px) { .impact { grid-template-columns: 1fr; } }
    .im { background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 9px; padding: 11px 13px; display: flex; flex-direction: column; gap: 2px; }
    .im-lbl { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .im-val { font-size: 16px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .im-note { font-size: 11px; color: var(--nb-text-muted); }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class GoodsIssuesComponent implements OnInit {
  private svc = inject(InventoryService);
  private finance = inject(FinanceService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly issues = signal<any[]>([]);
  readonly lines = signal<Line[]>([{ item: '', qty: 0, cost: 0 }]);

  private warehouses = signal<any[]>([]);
  private items = signal<any[]>([]);
  private balances = signal<any[]>([]);
  private accounts = signal<any[]>([]);
  readonly costCenters = signal<any[]>([]);

  form: any = { warehouse: '', issue_type: 'department', account: '', cost_center: '' };

  readonly stockWarehouses = computed(() => this.warehouses().filter((w) => !w.is_virtual));
  readonly expenseAccounts = computed(() => this.accounts().filter((a) => (a.code || '').startsWith('5')));

  /** لا يُعرض للصرف إلا ما له رصيد فعلي في المستودع المختار. */
  readonly availableItems = computed(() => {
    const wh = this.form.warehouse;
    if (!wh) return [];
    const itemMap = new Map(this.items().map((i) => [i.id, i]));
    return this.balances()
      .filter((b) => b.warehouse === wh && (Number(b.qty_on_hand) || 0) > 0)
      .map((b) => ({
        id: b.item,
        name: itemMap.get(b.item)?.name_ar || '—',
        available: (Number(b.qty_on_hand) || 0) - (Number(b.qty_reserved) || 0),
      }));
  });

  readonly total = computed(() => this.lines().reduce((s, l) => s + (l.qty || 0) * (l.cost || 0), 0));
  readonly totalQty = computed(() => this.lines().reduce((s, l) => s + (l.qty || 0), 0));

  /** التحقق من الرصيد في الواجهة يمنع رحلة ذهاب وإياب لخطأ متوقّع. */
  overIssue(idx: number): string | null {
    const l = this.lines()[idx];
    if (!l?.item || !l.qty) return null;
    const av = this.availableItems().find((a) => a.id === l.item);
    if (av && l.qty > av.available) {
      return `الكمية المطلوبة (${l.qty}) تتجاوز المتاح (${av.available}).`;
    }
    return null;
  }

  addLine() { this.lines.update((l) => [...l, { item: '', qty: 0, cost: 0 }]); }
  removeLine(i: number) { this.lines.update((l) => l.filter((_, x) => x !== i)); }
  setItem(i: number, v: string) {
    this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, item: v } : l)));
  }
  setQty(i: number, v: any) {
    this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, qty: Number(v) || 0 } : l)));
  }
  setCost(i: number, v: any) {
    this.lines.update((ls) => ls.map((l, x) => (x === i ? { ...l, cost: Number(v) || 0 } : l)));
  }
  onWarehouse() { this.lines.set([{ item: '', qty: 0, cost: 0 }]); }

  openForm() {
    this.form = { warehouse: '', issue_type: 'department', account: '', cost_center: '' };
    this.lines.set([{ item: '', qty: 0, cost: 0 }]);
    this.error.set('');
    this.showForm.set(true);
  }
  closeForm() { this.showForm.set(false); this.error.set(''); }

  save() {
    const f = this.form;
    const valid = this.lines().filter((l) => l.item && l.qty > 0);
    if (!f.warehouse || !f.account) { this.error.set('المستودع وحساب المصروف مطلوبان.'); return; }
    if (!valid.length) { this.error.set('أضف بنداً واحداً على الأقل بكمية أكبر من صفر.'); return; }
    for (let i = 0; i < this.lines().length; i++) {
      const w = this.overIssue(i);
      if (w) { this.error.set(w); return; }
    }

    this.saving.set(true);
    this.error.set('');
    this.svc.issueStock({
      warehouse_id: f.warehouse,
      issue_type: f.issue_type,
      items: valid.map((l) => ({
        item_id: l.item,
        qty_issued: l.qty,
        unit_cost: l.cost,
        expense_account_id: f.account,
        cost_center_id: f.cost_center || null,
      })),
    }).subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر تنفيذ الصرف.'));
      },
    });
  }

  whName(id: string): string { return this.warehouses().find((w) => w.id === id)?.name_ar || '—'; }
  typeLabel(t: string): string {
    return ({ department: 'قسم إداري', lab: 'مختبر', student: 'طلاب', clinic: 'عيادة' } as any)[t] || t;
  }
  statusLabel(s: string): string {
    return ({ draft: 'مسودة', pending: 'قيد المراجعة', approved: 'منفّذ', rejected: 'مرفوض' } as any)[s] || s;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getIssues().subscribe({
      next: (d) => { this.issues.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
    this.svc.getBalances().subscribe({ next: (d) => this.balances.set(this.rows(d)), error: () => {} });
    this.finance.getCOA({ status: 'active', page_size: 300 }).subscribe({
      next: (r: any) => this.accounts.set(this.rows(r)), error: () => {},
    });
    this.finance.getCostCenters({ status: 'active' }).subscribe({
      next: (r: any) => this.costCenters.set(this.rows(r)), error: () => {},
    });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
