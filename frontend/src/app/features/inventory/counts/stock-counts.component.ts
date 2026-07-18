import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { FinanceService } from '../../finance/finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * الجرد الفعلي.
 *
 * التوقيع: ورقة الفروق — العمود الحاسم ليس الدفتري ولا الفعلي بل الفارق
 * بينهما، فهو وحده ما يستدعي قراراً. الجرد لا يعدّل الأرصدة مباشرة:
 * يولّد تسوية مخزنية بقيد مسودة يعتمده المحاسب، فلا يصير باباً خلفياً.
 */
@Component({
  selector: 'app-stock-counts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الجرد" subtitle="العدّ الفعلي ومطابقته بالأرصدة الدفترية، وتسوية الفروق.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openNew()">＋ فتح جرد</button>
      </nb-page-header>

      <!-- فتح محضر -->
      @if (showNew()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>فتح محضر جرد</h3>
            <button class="x" (click)="showNew.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <p class="fc-note">
              يلتقط المحضر الكميات الدفترية لحظة الفتح، فتُقارن بها نتيجة العدّ.
            </p>
            <div class="fields">
              <label>
                <span>المستودع <i>*</i></span>
                <select [(ngModel)]="newWarehouse">
                  <option value="">اختر…</option>
                  @for (w of stockWarehouses(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
                </select>
              </label>
              <label class="chk">
                <input type="checkbox" [(ngModel)]="isBlind" />
                <span>
                  <strong>جرد أعمى</strong>
                  <small>لا تُعرض الكميات الدفترية للعدّادين — يمنع تحيّز العدّ.</small>
                </span>
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showNew.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="openCount()">
              {{ saving() ? 'جارٍ الفتح…' : 'فتح المحضر' }}
            </button>
          </footer>
        </section>
      }

      <!-- ورقة الفروق للمحضر المفتوح -->
      @if (active(); as a) {
        <section class="sheet">
          <header class="s-head">
            <div>
              <h3>{{ a.count_number }}</h3>
              <p>{{ whName(a.warehouse) }} · فُتح {{ a.start_date }}
                @if (a.is_blind) { <span class="blind">جرد أعمى</span> }
              </p>
            </div>
            <div class="s-stats">
              <span class="st"><b>{{ countItems().length }}</b> صنف</span>
              <span class="st" [class.warn]="varianceCount() > 0"><b>{{ varianceCount() }}</b> فرق</span>
            </div>
          </header>

          <div class="c-head">
            <span>الصنف</span>
            @if (!a.is_blind) { <span class="ta-end">الدفتري</span> }
            <span class="ta-end">العدّ الفعلي</span>
            <span class="ta-end">الفرق</span>
          </div>

          @for (ci of countItems(); track ci.id) {
            <div class="c-row" [class.has-var]="variance(ci) !== 0">
              <span class="c-name">{{ itemName(ci.item) }}</span>
              @if (!a.is_blind) { <span class="ta-end mono muted">{{ ci.qty_book | number:'1.0-2' }}</span> }
              <input class="ta-end" type="number" min="0"
                [ngModel]="physical()[ci.id] ?? null" (ngModelChange)="setPhysical(ci.id, $event)"
                placeholder="—" />
              <span class="ta-end mono var" [class.neg]="variance(ci) < 0" [class.pos]="variance(ci) > 0">
                @if (physical()[ci.id] === undefined || physical()[ci.id] === null) { — }
                @else { {{ variance(ci) > 0 ? '+' : '' }}{{ variance(ci) | number:'1.0-2' }} }
              </span>
            </div>
          }

          @if (varianceCount() > 0) {
            <div class="post-box">
              <div class="pb-fields">
                <label>
                  <span>حساب فروق الجرد <i>*</i></span>
                  <select [(ngModel)]="postAccount">
                    <option value="">اختر…</option>
                    @for (ac of expenseAccounts(); track ac.id) {
                      <option [value]="ac.id">{{ ac.code }} — {{ ac.name_ar }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>مركز التكلفة</span>
                  <select [(ngModel)]="postCostCenter">
                    <option value="">— بدون —</option>
                    @for (cc of costCenters(); track cc.id) { <option [value]="cc.id">{{ cc.name_ar }}</option> }
                  </select>
                </label>
              </div>
              <p class="pb-note">
                ترحيل المحضر يُنشئ <b>تسوية مخزنية</b> تصحّح الأرصدة، وقيدها يصل المالية
                <b>مسودة</b> بانتظار اعتماد المحاسب.
              </p>
            </div>
          } @else {
            <p class="no-var">لا فروق حتى الآن — سجّل نتائج العدّ لتظهر.</p>
          }

          @if (error()) { <p class="err in-sheet">{{ error() }}</p> }

          <footer class="s-acts">
            <button class="btn ghost" [disabled]="saving()" (click)="saveCounts()">
              {{ saving() ? 'جارٍ الحفظ…' : 'حفظ العدّ' }}
            </button>
            <button class="btn primary" [disabled]="saving() || !canPost()" (click)="postCount()">
              ترحيل الجرد وتسوية الفروق
            </button>
          </footer>
        </section>
      }

      <!-- المحاضر السابقة -->
      <section class="card">
        <div class="row head">
          <span>رقم المحضر</span><span>المستودع</span><span>تاريخ البدء</span><span class="ta-end">الحالة</span>
        </div>
        @if (loading()) {
          <nb-loading message="جارٍ تحميل محاضر الجرد…"></nb-loading>
        } @else {
          @for (c of counts(); track c.id) {
            <div class="row" [class.clickable]="c.status !== 'completed'" (click)="select(c)">
              <span class="mono strong">{{ c.count_number }}</span>
              <span class="muted">{{ whName(c.warehouse) }}</span>
              <span class="muted mono">{{ c.start_date }}</span>
              <span class="ta-end"><span class="badge" [class]="c.status">{{ statusLabel(c.status) }}</span></span>
            </div>
          }
          @if (!counts().length) { <div class="empty">لا توجد محاضر جرد بعد.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.4fr 1.4fr 1.2fr 0.9fr; }
    .row.clickable { cursor: pointer; }
    .strong { font-weight: 800; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }
    .badge.completed { background: #f0fdf4; color: #15803D; }
    .badge.in_progress { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.scheduled { background: var(--nb-surface-raised); color: var(--nb-text-muted); }

    .form-card, .sheet { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head, .s-head { display: flex; align-items: center; justify-content: space-between;
      gap: 14px; padding: 13px 18px; background: var(--nb-primary-50, #f5f6ff);
      border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); flex-wrap: wrap; }
    .fc-head h3, .s-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .s-head p { margin: 2px 0 0; font-size: 11.5px; color: var(--nb-text-muted); }
    .blind { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 20px;
      padding: 1px 8px; font-weight: 700; margin-inline-start: 6px; }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 0 0 14px; font-size: 12px; color: var(--nb-text-muted); }
    .fc-acts, .s-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .s-stats { display: flex; gap: 14px; }
    .st { font-size: 11.5px; color: var(--nb-text-muted); }
    .st b { font-size: 16px; font-weight: 800; color: var(--nb-text); margin-inline-end: 3px; }
    .st.warn b { color: #B45309; }

    .fields { display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; align-items: start; }
    @media (max-width: 720px) { .fields { grid-template-columns: 1fr; } }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .fields .chk { display: flex; grid-template-rows: none; align-items: flex-start; gap: 9px;
      border: 1px solid var(--nb-border); border-radius: 10px; padding: 10px 12px; cursor: pointer; }
    .fields .chk input { margin-top: 2px; accent-color: var(--nb-primary-600); }
    .fields .chk span { display: flex; flex-direction: column; gap: 1px; }
    .fields .chk strong { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .fields .chk small { font-size: 11px; color: var(--nb-text-muted); }

    /* ورقة الفروق — العمود الحاسم هو الفارق */
    .c-head, .c-row { display: grid; grid-template-columns: 2.6fr 1fr 1fr 1fr; gap: 12px;
      align-items: center; padding: 0 18px; }
    .c-head { font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
      padding-block: 10px; border-bottom: 1px solid var(--nb-border); }
    .c-row { padding-block: 8px; border-bottom: 1px solid var(--nb-border-soft, #f0f1f5); }
    .c-row.has-var { background: #fffdf8; }
    .c-name { font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .c-row input { height: 34px; padding: 0 10px; font-family: inherit; font-size: 12.5px;
      border: 1px solid var(--nb-border); border-radius: 7px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .var { font-size: 13px; font-weight: 800; }
    .var.neg { color: #B91C1C; }
    .var.pos { color: #15803D; }
    .mono { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    .muted { color: var(--nb-text-muted); }
    .ta-end { text-align: end; }

    .post-box { padding: 14px 18px; background: var(--nb-surface-raised);
      border-top: 1px solid var(--nb-border); }
    .pb-fields { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; margin-bottom: 10px; }
    @media (max-width: 720px) { .pb-fields { grid-template-columns: 1fr; } }
    .pb-fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .pb-fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .pb-fields label i { color: #DC2626; font-style: normal; }
    .pb-fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .pb-note { margin: 0; font-size: 11.5px; color: var(--nb-text-muted); }
    .no-var { margin: 0; padding: 18px; text-align: center; font-size: 12.5px; color: var(--nb-text-muted); }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
    .err.in-sheet { margin: 12px 18px; }
  `],
})
export class StockCountsComponent implements OnInit {
  private svc = inject(InventoryService);
  private finance = inject(FinanceService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showNew = signal(false);
  readonly counts = signal<any[]>([]);
  readonly active = signal<any | null>(null);
  readonly physical = signal<Record<string, number>>({});

  private warehouses = signal<any[]>([]);
  private items = signal<any[]>([]);
  private accounts = signal<any[]>([]);
  readonly costCenters = signal<any[]>([]);

  newWarehouse = '';
  isBlind = false;
  postAccount = '';
  postCostCenter = '';

  readonly stockWarehouses = computed(() => this.warehouses().filter((w) => !w.is_virtual));
  readonly expenseAccounts = computed(() => this.accounts().filter((a) => (a.code || '').startsWith('5')));
  readonly countItems = computed(() => this.active()?.items || []);

  variance(ci: any): number {
    const p = this.physical()[ci.id];
    if (p === undefined || p === null) return 0;
    return Number(p) - (Number(ci.qty_book) || 0);
  }
  readonly varianceCount = computed(
    () => this.countItems().filter((ci: any) => this.variance(ci) !== 0).length,
  );

  setPhysical(id: string, v: any) {
    this.physical.update((p) => ({ ...p, [id]: v === null || v === '' ? undefined as any : Number(v) }));
  }

  canPost(): boolean { return this.varianceCount() > 0 && !!this.postAccount; }

  itemName(id: string): string {
    return this.items().find((i) => i.id === id)?.name_ar || '—';
  }
  whName(id: string): string { return this.warehouses().find((w) => w.id === id)?.name_ar || '—'; }
  statusLabel(s: string): string {
    return ({ scheduled: 'مجدول', in_progress: 'قيد العدّ', completed: 'مُرحّل', cancelled: 'ملغى' } as any)[s] || s;
  }

  openNew() { this.newWarehouse = ''; this.isBlind = false; this.error.set(''); this.showNew.set(true); }

  openCount() {
    if (!this.newWarehouse) { this.error.set('اختر المستودع.'); return; }
    this.saving.set(true);
    this.error.set('');
    this.svc.openStockCount({ warehouse_id: this.newWarehouse, is_blind: this.isBlind }).subscribe({
      next: (r: any) => {
        this.saving.set(false);
        this.showNew.set(false);
        this.active.set(r?.data ?? r);
        this.physical.set({});
        this.load();
      },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر فتح المحضر.'));
      },
    });
  }

  select(c: any) {
    if (c.status === 'completed') return;
    this.svc.getStockCount(c.id).subscribe({
      next: (r: any) => { this.active.set(r?.data ?? r); this.physical.set({}); this.error.set(''); },
      error: () => {},
    });
  }

  private recordPayload() {
    const p = this.physical();
    return Object.keys(p)
      .filter((k) => p[k] !== undefined && p[k] !== null)
      .map((k) => ({ count_item_id: k, qty_physical: Number(p[k]) }));
  }

  saveCounts() {
    const payload = this.recordPayload();
    if (!payload.length) { this.error.set('سجّل كمية واحدة على الأقل.'); return; }
    this.saving.set(true);
    this.error.set('');
    this.svc.recordStockCount(this.active()!.id, payload).subscribe({
      next: (r: any) => { this.saving.set(false); this.active.set(r?.data ?? r); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر حفظ العدّ.'));
      },
    });
  }

  postCount() {
    if (!this.canPost()) return;
    this.saving.set(true);
    this.error.set('');
    // الحفظ أولاً ليضمن أن الخادم يحمل آخر الأرقام قبل احتساب الفروق
    this.svc.recordStockCount(this.active()!.id, this.recordPayload()).subscribe({
      next: () => {
        this.svc.postStockCount(this.active()!.id, {
          expense_account_id: this.postAccount,
          cost_center_id: this.postCostCenter || undefined,
        }).subscribe({
          next: () => {
            this.saving.set(false);
            this.active.set(null);
            this.physical.set({});
            this.load();
          },
          error: (e: any) => {
            this.saving.set(false);
            const d = e?.details?.error ?? e?.details;
            this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر ترحيل الجرد.'));
          },
        });
      },
      error: () => { this.saving.set(false); this.error.set('تعذّر حفظ العدّ قبل الترحيل.'); },
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getStockCounts().subscribe({
      next: (d) => { this.counts.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
    this.finance.getCOA({ status: 'active', page_size: 300 }).subscribe({
      next: (r: any) => this.accounts.set(this.rows(r)), error: () => {},
    });
    this.finance.getCostCenters({ status: 'active' }).subscribe({
      next: (r: any) => this.costCenters.set(this.rows(r)), error: () => {},
    });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
