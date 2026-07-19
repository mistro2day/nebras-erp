import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaintenanceService } from '../maintenance.service';
import { AssetsService } from '../../assets/assets.service';
import { InventoryService } from '../../inventory/inventory.service';
import { FinanceService } from '../../finance/finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface PartLine { item: string; qty: number; }

/**
 * أوامر العمل — قلب الصيانة.
 *
 * التوقيع: مسار الأمر الواحد — الصيانة ليست قائمة حالات بل تسلسل يمرّ
 * بأربع محطات: إسناد ← قطع غيار من المخزون ← إكمال فني ← إقفال مالي.
 * كل أمر يُظهر أين توقّف، لأن السؤال العملي دائماً «ماذا ينقصه ليُغلق».
 */
@Component({
  selector: 'app-maintenance-work-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="أوامر العمل" subtitle="تنفيذ الصيانة على الأصول: قطع الغيار، الإكمال الفني، والإقفال المالي.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openNew()">＋ أمر عمل</button>
      </nb-page-header>

      <!-- إنشاء أمر عمل -->
      @if (showNew()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>أمر عمل جديد</h3>
            <button class="x" (click)="showNew.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label>
                <span>الأصل <i>*</i></span>
                <select [(ngModel)]="form.asset">
                  <option value="">اختر…</option>
                  @for (a of assets(); track a.id) {
                    <option [value]="a.id">{{ a.name_ar }} ({{ a.asset_number }})</option>
                  }
                </select>
              </label>
              <label>
                <span>البلاغ المرتبط</span>
                <select [(ngModel)]="form.request">
                  <option value="">— بلا بلاغ (عمل مباشر) —</option>
                  @for (r of openRequests(); track r.id) {
                    <option [value]="r.id">{{ r.request_number }} — {{ r.title }}</option>
                  }
                </select>
              </label>
              <label class="wide">
                <span>الفني المسؤول</span>
                <select [(ngModel)]="form.technician">
                  <option value="">— غير مسند —</option>
                  @for (t of technicians(); track t.id) {
                    <option [value]="t.id">
                      {{ t.specialty || 'فني' }} — {{ t.hourly_rate }} ر.س/ساعة
                    </option>
                  }
                </select>
              </label>
              <p class="hint-note">
                سعر ساعة الفني يُحتسب به أجر العمل عند إكمال الأمر ويُضاف لتكلفته.
                رقم أمر العمل يُولَّد تلقائياً.
              </p>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showNew.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="createOrder()">
              {{ saving() ? 'جارٍ الإنشاء…' : 'إنشاء أمر العمل' }}
            </button>
          </footer>
        </section>
      }

      @if (loading()) {
        <nb-loading message="جارٍ تحميل أوامر العمل…"></nb-loading>
      } @else if (!orders().length) {
        <div class="empty-card">لا توجد أوامر عمل بعد. ابدأ بأمر عمل على أصل يحتاج صيانة.</div>
      } @else {
        <section class="list">
          @for (o of orders(); track o.id) {
            <article class="wo" [class.closed]="o.status === 'closed'">
              <header class="wo-head">
                <div class="wo-id">
                  <strong>{{ o.wo_number }}</strong>
                  <span class="wo-asset">{{ assetName(o.asset) }}</span>
                </div>
                <span class="badge" [class]="o.status">{{ statusLabel(o.status) }}</span>
              </header>

              <!-- مسار الأمر: أين توقّف -->
              <div class="track">
                @for (st of steps(o); track st.key) {
                  <span class="st" [class.done]="st.done" [class.now]="st.now">
                    <i class="st-dot">{{ st.done ? '✓' : '○' }}</i>
                    <span class="st-l">{{ st.label }}</span>
                  </span>
                }
              </div>

              <div class="wo-meta">
                @if (costOf(o.id); as cst) {
                  <span>مواد: <b>{{ cst.material_cost | number:'1.2-2' }}</b></span>
                  <span>عمالة: <b>{{ cst.labor_cost | number:'1.2-2' }}</b></span>
                  <span class="total">الإجمالي: <b>{{ cst.total_cost | number:'1.2-2' }}</b> ر.س</span>
                } @else {
                  <span class="muted">لم تُسجَّل تكاليف بعد.</span>
                }
              </div>

              <footer class="wo-acts">
                @if (o.status !== 'closed' && o.status !== 'cancelled') {
                  <button class="act" (click)="openParts(o)">🔧 صرف قطع غيار</button>
                  @if (o.status !== 'completed') {
                    <button class="act" (click)="openComplete(o)">✓ إكمال فني</button>
                  }
                  @if (o.status === 'completed' && costOf(o.id)) {
                    <button class="act pri" (click)="openPost(o)">📒 ترحيل التكاليف</button>
                  }
                }
                @if (o.status === 'closed') { <span class="muted">أُقفل ماليّاً</span> }
              </footer>
            </article>
          }
        </section>
      }

      <!-- صرف قطع الغيار -->
      @if (partsFor(); as o) {
        <div class="overlay" (click)="partsFor.set(null)">
          <section class="form-card modal" (click)="$event.stopPropagation()">
            <header class="fc-head">
              <h3>صرف قطع غيار — {{ o.wo_number }}</h3>
              <button class="x" (click)="partsFor.set(null)" aria-label="إغلاق">✕</button>
            </header>
            <div class="fc-body">
              <p class="fc-note">القطع تُخصم من المخزون فعلياً، وقيمتها تُضاف لتكلفة أمر العمل.</p>
              <div class="fields">
                <label>
                  <span>المستودع <i>*</i></span>
                  <select [(ngModel)]="parts.warehouse" (ngModelChange)="partLines.set([{ item: '', qty: 0 }])">
                    <option value="">اختر…</option>
                    @for (w of warehouses(); track w.id) { <option [value]="w.id">{{ w.name_ar }}</option> }
                  </select>
                </label>
                <label>
                  <span>حساب مصروف الصيانة</span>
                  <select [(ngModel)]="parts.account">
                    <option value="">— بدون قيد —</option>
                    @for (a of expenseAccounts(); track a.id) {
                      <option [value]="a.id">{{ a.code }} — {{ a.name_ar }}</option>
                    }
                  </select>
                </label>
              </div>

              @if (parts.warehouse) {
                <div class="lines">
                  @for (l of partLines(); track $index) {
                    <div class="l-row">
                      <select [ngModel]="l.item" (ngModelChange)="setPart($index, $event)">
                        <option value="">اختر القطعة…</option>
                        @for (av of availableParts(); track av.id) {
                          <option [value]="av.id">{{ av.name }} — متوفر {{ av.available }}</option>
                        }
                      </select>
                      <input type="number" min="0" [ngModel]="l.qty" (ngModelChange)="setPartQty($index, $event)" />
                      <button class="rm" (click)="removePart($index)">✕</button>
                    </div>
                  }
                  <button class="add-line" (click)="addPart()">＋ قطعة</button>
                </div>
              }
              @if (error()) { <p class="err">{{ error() }}</p> }
            </div>
            <footer class="fc-acts">
              <button class="btn ghost" (click)="partsFor.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="submitParts(o)">
                {{ saving() ? 'جارٍ الصرف…' : 'صرف القطع' }}
              </button>
            </footer>
          </section>
        </div>
      }

      <!-- إكمال فني -->
      @if (completeFor(); as o) {
        <div class="overlay" (click)="completeFor.set(null)">
          <section class="form-card modal" (click)="$event.stopPropagation()">
            <header class="fc-head">
              <h3>إكمال أمر العمل — {{ o.wo_number }}</h3>
              <button class="x" (click)="completeFor.set(null)" aria-label="إغلاق">✕</button>
            </header>
            <div class="fc-body">
              <div class="fields">
                <label>
                  <span>ساعات العمل الفعلية</span>
                  <input type="number" min="0" step="0.5" [(ngModel)]="comp.hours" />
                </label>
                <label class="wide">
                  <span>ملخّص العمل المنفَّذ</span>
                  <input [(ngModel)]="comp.summary" placeholder="ما الذي أُصلح ولماذا" />
                </label>
              </div>
              @if (error()) { <p class="err">{{ error() }}</p> }
            </div>
            <footer class="fc-acts">
              <button class="btn ghost" (click)="completeFor.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="submitComplete(o)">
                {{ saving() ? 'جارٍ الحفظ…' : 'إكمال الأمر' }}
              </button>
            </footer>
          </section>
        </div>
      }

      <!-- ترحيل التكاليف -->
      @if (postFor(); as o) {
        <div class="overlay" (click)="postFor.set(null)">
          <section class="form-card modal" (click)="$event.stopPropagation()">
            <header class="fc-head">
              <h3>ترحيل تكاليف الصيانة — {{ o.wo_number }}</h3>
              <button class="x" (click)="postFor.set(null)" aria-label="إغلاق">✕</button>
            </header>
            <div class="fc-body">
              <p class="fc-note">
                يُنشأ قيد بقيمة <b>{{ costOf(o.id)?.total_cost | number:'1.2-2' }}</b> ر.س
                ويصل المالية <b>مسودة</b> بانتظار اعتماد المحاسب.
              </p>
              <div class="fields">
                <label>
                  <span>حساب مصروف الصيانة <i>*</i></span>
                  <select [(ngModel)]="pc.expense">
                    <option value="">اختر…</option>
                    @for (a of expenseAccounts(); track a.id) {
                      <option [value]="a.id">{{ a.code }} — {{ a.name_ar }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>الحساب المقابل <i>*</i></span>
                  <select [(ngModel)]="pc.offset">
                    <option value="">اختر…</option>
                    @for (a of liabilityAccounts(); track a.id) {
                      <option [value]="a.id">{{ a.code }} — {{ a.name_ar }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>مركز التكلفة</span>
                  <select [(ngModel)]="pc.cc">
                    <option value="">— بدون —</option>
                    @for (c of costCenters(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
                  </select>
                </label>
              </div>
              @if (error()) { <p class="err">{{ error() }}</p> }
            </div>
            <footer class="fc-acts">
              <button class="btn ghost" (click)="postFor.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="submitPost(o)">
                {{ saving() ? 'جارٍ الترحيل…' : 'ترحيل التكاليف' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .list { display: flex; flex-direction: column; gap: 11px; }
    .wo { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; }
    .wo.closed { opacity: .78; }
    .wo-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
    .wo-id { display: flex; flex-direction: column; gap: 1px; }
    .wo-id strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .wo-asset { font-size: 11.5px; color: var(--nb-text-muted); }
    .badge { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 11px; }
    .badge.draft { background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge.assigned, .badge.in_progress { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.on_hold { background: #fffaf0; color: #B45309; }
    .badge.completed { background: #f0fdf4; color: #15803D; }
    .badge.closed { background: #eef0f5; color: var(--nb-text-muted); }
    .badge.cancelled { background: #fef2f2; color: #B91C1C; }

    /* مسار الأمر — أين توقّف */
    .track { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .st { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px;
      color: var(--nb-text-muted); background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border); border-radius: 20px; padding: 4px 11px; }
    .st.done { background: #f0fdf4; color: #15803D; border-color: #bbf7d0; }
    .st.now { background: var(--nb-primary-50); color: var(--nb-primary-700);
      border-color: var(--nb-primary-200, #d9dcf7); font-weight: 700; }
    .st-dot { font-style: normal; font-size: 10px; }

    .wo-meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px;
      color: var(--nb-text-muted); padding-bottom: 10px;
      border-bottom: 1px solid var(--nb-border-soft, #f0f1f5); }
    .wo-meta b { color: var(--nb-text); font-weight: 700; font-variant-numeric: tabular-nums; }
    .wo-meta .total b { font-size: 14px; }
    .muted { color: var(--nb-text-muted); }

    .wo-acts { display: flex; gap: 7px; flex-wrap: wrap; padding-top: 10px; align-items: center; }
    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 8px;
      font-family: inherit; font-size: 12px; font-weight: 700; color: var(--nb-text);
      cursor: pointer; padding: 6px 12px; }
    .act:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }
    .act.pri { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .form-card.modal { width: 100%; max-width: 560px; margin: 0;
      box-shadow: 0 18px 50px rgba(16,20,40,.22); }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 0 0 14px; font-size: 12px; color: var(--nb-text-muted); }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .overlay { position: fixed; inset: 0; background: rgba(16,20,40,.42); backdrop-filter: blur(2px);
      display: grid; place-items: center; z-index: 60; padding: 20px; }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 640px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .lines { border: 1px solid var(--nb-border); border-radius: 10px; padding: 11px; margin-top: 12px; }
    .l-row { display: grid; grid-template-columns: 2.6fr 1fr 34px; gap: 8px; margin-bottom: 7px; }
    .l-row select, .l-row input { height: 36px; padding: 0 10px; font-family: inherit; font-size: 12.5px;
      border: 1px solid var(--nb-border); border-radius: 7px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .rm { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 7px;
      cursor: pointer; color: var(--nb-text-muted); }
    .add-line { border: 1px dashed var(--nb-border); background: none; border-radius: 8px;
      font-family: inherit; font-size: 12px; font-weight: 700; color: var(--nb-text-muted);
      cursor: pointer; padding: 7px 14px; width: 100%; }

    .hint-note { grid-column: 1 / -1; margin: 0; font-size: 11.5px; color: var(--nb-text-muted); }
    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 32px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }
  `],
})
export class MaintenanceWorkOrdersComponent implements OnInit {
  private svc = inject(MaintenanceService);
  private assetsSvc = inject(AssetsService);
  private invSvc = inject(InventoryService);
  private finance = inject(FinanceService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showNew = signal(false);
  readonly orders = signal<any[]>([]);
  readonly assets = signal<any[]>([]);
  readonly technicians = signal<any[]>([]);
  readonly warehouses = signal<any[]>([]);
  readonly costCenters = signal<any[]>([]);
  private requests = signal<any[]>([]);
  private costs = signal<any[]>([]);
  private accounts = signal<any[]>([]);
  private items = signal<any[]>([]);
  private balances = signal<any[]>([]);

  readonly partsFor = signal<any | null>(null);
  readonly completeFor = signal<any | null>(null);
  readonly postFor = signal<any | null>(null);
  readonly partLines = signal<PartLine[]>([{ item: '', qty: 0 }]);

  form: any = { asset: '', request: '', technician: '' };
  parts: any = { warehouse: '', account: '' };
  comp: any = { hours: 0, summary: '' };
  pc: any = { expense: '', offset: '', cc: '' };

  readonly expenseAccounts = computed(() => this.accounts().filter((a) => (a.code || '').startsWith('5')));
  readonly liabilityAccounts = computed(() => this.accounts().filter((a) => (a.code || '').startsWith('2')));
  readonly openRequests = computed(() =>
    this.requests().filter((r) => ['submitted', 'approved', 'in_progress'].includes(r.status)),
  );

  readonly availableParts = computed(() => {
    const wh = this.parts.warehouse;
    if (!wh) return [];
    const map = new Map(this.items().map((i) => [i.id, i]));
    return this.balances()
      .filter((b) => b.warehouse === wh && (Number(b.qty_on_hand) || 0) > 0)
      .map((b) => ({
        id: b.item,
        name: map.get(b.item)?.name_ar || '—',
        available: (Number(b.qty_on_hand) || 0) - (Number(b.qty_reserved) || 0),
      }));
  });

  assetName(id: string): string {
    const a = this.assets().find((x) => x.id === id);
    return a ? `${a.name_ar} (${a.asset_number})` : '—';
  }
  costOf(woId: string): any {
    return this.costs().find((c) => c.work_order === woId) || null;
  }
  statusLabel(s: string): string {
    return ({ draft: 'مسودة', assigned: 'مسند', in_progress: 'جارٍ العمل', on_hold: 'معلّق',
      completed: 'مكتمل فنيّاً', closed: 'مغلق ومقفل ماليّاً', cancelled: 'ملغى' } as any)[s] || s;
  }

  /** محطات الأمر الأربع — تُقرأ الحالة منها لا من الاسم وحده. */
  steps(o: any) {
    const hasCost = !!this.costOf(o.id);
    const done = {
      assign: !!o.assigned_technician || !!o.assigned_team,
      parts: hasCost && Number(this.costOf(o.id)?.material_cost) > 0,
      complete: ['completed', 'closed'].includes(o.status),
      posted: o.status === 'closed',
    };
    const order = [
      { key: 'assign', label: 'إسناد', done: done.assign },
      { key: 'parts', label: 'قطع غيار', done: done.parts },
      { key: 'complete', label: 'إكمال فني', done: done.complete },
      { key: 'posted', label: 'إقفال مالي', done: done.posted },
    ];
    const firstPending = order.find((s) => !s.done);
    return order.map((s) => ({ ...s, now: firstPending?.key === s.key }));
  }

  addPart() { this.partLines.update((l) => [...l, { item: '', qty: 0 }]); }
  removePart(i: number) { this.partLines.update((l) => l.filter((_, x) => x !== i)); }
  setPart(i: number, v: string) {
    this.partLines.update((ls) => ls.map((l, x) => (x === i ? { ...l, item: v } : l)));
  }
  setPartQty(i: number, v: any) {
    this.partLines.update((ls) => ls.map((l, x) => (x === i ? { ...l, qty: Number(v) || 0 } : l)));
  }

  openNew() { this.form = { asset: '', request: '', technician: '' }; this.error.set(''); this.showNew.set(true); }
  openParts(o: any) { this.parts = { warehouse: '', account: '' }; this.partLines.set([{ item: '', qty: 0 }]); this.error.set(''); this.partsFor.set(o); }
  openComplete(o: any) { this.comp = { hours: 0, summary: '' }; this.error.set(''); this.completeFor.set(o); }
  openPost(o: any) { this.pc = { expense: '', offset: '', cc: '' }; this.error.set(''); this.postFor.set(o); }

  createOrder() {
    if (!this.form.asset) {
      this.error.set('اختر الأصل المعني بالصيانة.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    // رقم أمر العمل يولّده الخادم — لا يُرسل من هنا
    this.svc.createWorkOrder({
      asset: this.form.asset,
      request: this.form.request || null,
      assigned_technician: this.form.technician || null,
      status: this.form.technician ? 'assigned' : 'draft',
    }).subscribe({
      next: () => { this.saving.set(false); this.showNew.set(false); this.load(); },
      error: (e) => this.fail(e, 'تعذّر إنشاء أمر العمل.'),
    });
  }

  submitParts(o: any) {
    const valid = this.partLines().filter((l) => l.item && l.qty > 0);
    if (!this.parts.warehouse || !valid.length) {
      this.error.set('اختر المستودع وقطعة واحدة على الأقل بكمية.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.svc.consumeParts(o.id, {
      warehouse_id: this.parts.warehouse,
      items: valid.map((l) => ({ item_id: l.item, qty: l.qty })),
      expense_account_id: this.parts.account || undefined,
      cost_center_id: undefined,
    }).subscribe({
      next: () => { this.saving.set(false); this.partsFor.set(null); this.load(); },
      error: (e) => this.fail(e, 'تعذّر صرف القطع.'),
    });
  }

  submitComplete(o: any) {
    this.saving.set(true);
    this.error.set('');
    this.svc.completeWorkOrder(o.id, {
      actual_labor_hours: Number(this.comp.hours) || 0,
      summary: this.comp.summary?.trim() || 'تمت عملية الصيانة الفنية',
    }).subscribe({
      next: () => { this.saving.set(false); this.completeFor.set(null); this.load(); },
      error: (e) => this.fail(e, 'تعذّر إكمال الأمر.'),
    });
  }

  submitPost(o: any) {
    if (!this.pc.expense || !this.pc.offset) {
      this.error.set('اختر حساب المصروف والحساب المقابل.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.svc.postCosts(o.id, {
      maintenance_expense_gl_account_id: this.pc.expense,
      offset_gl_account_id: this.pc.offset,
      cost_center_id: this.pc.cc || undefined,
    }).subscribe({
      next: () => { this.saving.set(false); this.postFor.set(null); this.load(); },
      error: (e) => this.fail(e, 'تعذّر ترحيل التكاليف.'),
    });
  }

  private fail(e: any, fallback: string) {
    this.saving.set(false);
    const d = e?.details?.error ?? e?.details;
    this.error.set(typeof d === 'string' ? d : (e?.message || fallback));
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getWorkOrders().subscribe({
      next: (d) => { this.orders.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getRequests().subscribe({ next: (d) => this.requests.set(rows(d)), error: () => {} });
    this.svc.getCosts().subscribe({ next: (d) => this.costs.set(rows(d)), error: () => {} });
    this.svc.getTechnicians().subscribe({ next: (d) => this.technicians.set(rows(d)), error: () => {} });
    this.assetsSvc.getAssets().subscribe({ next: (d) => this.assets.set(rows(d)), error: () => {} });
    this.invSvc.getWarehouses().subscribe({
      next: (d) => this.warehouses.set(rows(d).filter((w: any) => !w.is_virtual)), error: () => {},
    });
    this.invSvc.getItems().subscribe({ next: (d) => this.items.set(rows(d)), error: () => {} });
    this.invSvc.getBalances().subscribe({ next: (d) => this.balances.set(rows(d)), error: () => {} });
    this.finance.getCOA({ status: 'active', page_size: 300 }).subscribe({
      next: (r: any) => this.accounts.set(rows(r)), error: () => {},
    });
    this.finance.getCostCenters({ status: 'active' }).subscribe({
      next: (r: any) => this.costCenters.set(rows(r)), error: () => {},
    });
  }

  back() { this.router.navigateByUrl('/maintenance/dashboard'); }
}
