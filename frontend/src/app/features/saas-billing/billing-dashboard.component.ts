import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../core/services/notification.service';
import {
  SaasBillingService, SubscriptionPlan, TenantSubscription, Invoice, BillingMetrics,
} from './saas-billing.service';

type Tab = 'overview' | 'plans' | 'subscriptions' | 'invoices';

/** فوترة المنصّة (SaaS): مؤشرات الإيراد، خطط الاشتراك، اشتراكات المستأجرين، الفواتير والمدفوعات. */
@Component({
  selector: 'app-saas-billing-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="فوترة المنصّة والاشتراكات"
        subtitle="إدارة اشتراكات المدارس المستأجِرة في نبراس: الخطط، الفواتير، والمدفوعات ومؤشرات الإيراد.">
      </nb-page-header>

      <!-- التبويبات -->
      <div class="tabs no-print">
        @for (t of tabs; track t.id) {
          <button [class.on]="tab() === t.id" (click)="tab.set(t.id)">{{ t.label }}</button>
        }
      </div>

      <!-- ===== نظرة عامة ===== -->
      @if (tab() === 'overview') {
        <div class="bar-actions no-print">
          <button class="btn ghost" [disabled]="cycling()" (click)="runCycle()">
            {{ cycling() ? '⏳ جارٍ التشغيل…' : '🔄 تشغيل دورة الفوترة الآن' }}
          </button>
        </div>
        @if (metrics(); as m) {
          <div class="kpi-row">
            <div class="kpi accent">
              <span class="k-lbl">الإيراد الشهري المتكرّر (MRR)</span>
              <span class="k-val">{{ m.mrr | number:'1.0-0' }}</span>
              <span class="k-sub">ج.س / شهرياً</span>
            </div>
            <div class="kpi">
              <span class="k-lbl">اشتراكات نشطة</span>
              <span class="k-val">{{ m.active_subscriptions }}</span>
              <span class="k-sub">{{ m.trial_subscriptions }} تجريبية</span>
            </div>
            <div class="kpi ok">
              <span class="k-lbl">محصّل هذا العام</span>
              <span class="k-val">{{ m.collected_this_year | number:'1.0-0' }}</span>
              <span class="k-sub">ج.س</span>
            </div>
            <div class="kpi warn">
              <span class="k-lbl">مستحقّات غير مدفوعة</span>
              <span class="k-val">{{ m.outstanding | number:'1.0-0' }}</span>
              <span class="k-sub">{{ m.overdue_invoices }} فاتورة متأخرة</span>
            </div>
          </div>
        } @else {
          <div class="empty">جارٍ تحميل المؤشرات…</div>
        }

        <!-- الاستخدام مقابل حدود الخطة (للمستأجر الحالي) -->
        @if (usage(); as u) {
          @if (u.has_plan) {
            <div class="panel usage-panel">
              <h3>الاستخدام مقابل حدود الخطة — {{ u.plan_name }}</h3>
              <div class="usage-grid">
                @for (r of usageRows(u); track r.key) {
                  <div class="usage-item" [class.over]="r.exceeded">
                    <div class="u-top">
                      <span class="u-lbl">{{ r.label }}</span>
                      <span class="u-num">{{ r.current | number }} / {{ r.unlimited ? '∞' : (r.limit | number) }}</span>
                    </div>
                    <div class="u-track">
                      <div class="u-fill" [class.hot]="r.pct >= 90" [style.width.%]="r.unlimited ? 4 : r.pct"></div>
                    </div>
                    @if (r.exceeded) { <span class="u-warn">تجاوزت الحدّ — يلزم ترقية الخطة</span> }
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- توزيع الاشتراكات على الخطط -->
        <div class="panel">
          <h3>توزيع الاشتراكات على الخطط</h3>
          @if (planDistribution().length === 0) {
            <div class="muted">لا توجد اشتراكات بعد.</div>
          } @else {
            <div class="bar-chart">
              @for (d of planDistribution(); track d.label; let i = $index) {
                <div class="bc-row">
                  <span class="bc-label">{{ d.label }}</span>
                  <div class="bc-track">
                    <div class="bc-fill" [style.width.%]="d.pct" [style.transition-delay.ms]="i * 60"></div>
                    <span class="bc-value">{{ d.value }}</span>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ===== الخطط ===== -->
      @if (tab() === 'plans') {
        <div class="bar-actions no-print"><button class="btn primary" (click)="openNewPlan()">+ خطة جديدة</button></div>
        <div class="plans-grid">
          @for (p of plans(); track p.id) {
            <article class="plan-card" [class.inactive]="!p.is_active">
              <header>
                <b>{{ p.name_ar }}</b>
                <span class="cycle">{{ p.billing_cycle_display }}</span>
              </header>
              <div class="price">{{ p.price | number:'1.0-0' }} <small>{{ p.currency }}</small></div>
              <p class="desc">{{ p.description }}</p>
              <ul class="limits">
                <li><span>الطلاب</span><b>{{ p.max_students ? (p.max_students | number) : 'بلا حدّ' }}</b></li>
                <li><span>الموظفون</span><b>{{ p.max_staff ? (p.max_staff | number) : 'بلا حدّ' }}</b></li>
                <li><span>الفروع</span><b>{{ p.max_branches || 'بلا حدّ' }}</b></li>
                <li><span>الوحدات</span><b>{{ p.modules.length }}</b></li>
              </ul>
              <footer>
                <span class="subs">{{ p.active_subscriptions || 0 }} مشترك</span>
                <button class="btn ghost sm" (click)="openEditPlan(p)">تعديل</button>
              </footer>
            </article>
          }
        </div>
      }

      <!-- ===== الاشتراكات ===== -->
      @if (tab() === 'subscriptions') {
        <div class="scroll-x">
          <table class="data">
            <thead><tr>
              <th>المستأجر</th><th>الخطة</th><th>الحالة</th><th>بداية الدورة</th>
              <th>نهاية الدورة</th><th>القيمة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>
              @for (s of subscriptions(); track s.id) {
                <tr>
                  <td>{{ s.tenant_name }}</td>
                  <td>{{ s.plan_name }}</td>
                  <td><span class="chip" [class]="'st-' + s.status">{{ s.status_display }}</span></td>
                  <td>{{ s.current_period_start }}</td>
                  <td>{{ s.current_period_end }}</td>
                  <td>{{ s.plan_price | number:'1.0-0' }} {{ s.plan_currency }}</td>
                  <td class="acts">
                    <button class="btn ghost xs" (click)="genInvoice(s)">توليد فاتورة</button>
                  </td>
                </tr>
              } @empty { <tr><td colspan="7" class="muted">لا توجد اشتراكات.</td></tr> }
            </tbody>
          </table>
        </div>
      }

      <!-- ===== الفواتير ===== -->
      @if (tab() === 'invoices') {
        <div class="scroll-x">
          <table class="data">
            <thead><tr>
              <th>رقم الفاتورة</th><th>المستأجر</th><th>الإصدار</th><th>الاستحقاق</th>
              <th>الإجمالي</th><th>المدفوع</th><th>المتبقّي</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>
              @for (inv of invoices(); track inv.id) {
                <tr>
                  <td class="mono">{{ inv.number }}</td>
                  <td>{{ inv.tenant_name }}</td>
                  <td>{{ inv.issue_date }}</td>
                  <td>{{ inv.due_date }}</td>
                  <td>{{ inv.total | number:'1.0-0' }}</td>
                  <td>{{ inv.amount_paid | number:'1.0-0' }}</td>
                  <td>{{ inv.balance_due | number:'1.0-0' }}</td>
                  <td><span class="chip" [class]="'iv-' + inv.status">{{ inv.status_display }}</span></td>
                  <td class="acts">
                    @if (inv.status !== 'paid' && inv.status !== 'void') {
                      <button class="btn ghost xs" (click)="openPay(inv)">تسجيل دفعة</button>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="9" class="muted">لا توجد فواتير.</td></tr> }
            </tbody>
          </table>
        </div>
      }

      <!-- مودال الخطة -->
      @if (editingPlan()) {
        <div class="overlay" (click)="editingPlan.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ planForm.id ? 'تعديل الخطة' : 'خطة جديدة' }}</h3>
            <div class="fields">
              <label>الاسم<input [(ngModel)]="planForm.name_ar" /></label>
              <label>الرمز<input [(ngModel)]="planForm.code" [disabled]="!!planForm.id" /></label>
              <label>الوصف<textarea rows="2" [(ngModel)]="planForm.description"></textarea></label>
              <div class="grid2">
                <label>السعر<input type="number" [(ngModel)]="planForm.price" /></label>
                <label>دورة الفوترة
                  <select [(ngModel)]="planForm.billing_cycle">
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="annual">سنوي</option>
                  </select>
                </label>
                <label>حدّ الطلاب<input type="number" [(ngModel)]="planForm.max_students" /></label>
                <label>حدّ الموظفين<input type="number" [(ngModel)]="planForm.max_staff" /></label>
              </div>
              <label class="chk"><input type="checkbox" [(ngModel)]="planForm.is_active" /> خطة نشطة</label>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="editingPlan.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving() || !planForm.name_ar || !planForm.code" (click)="savePlan()">
                {{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال الدفع -->
      @if (payingInvoice(); as inv) {
        <div class="overlay" (click)="payingInvoice.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>تسجيل دفعة — {{ inv.number }}</h3>
            <p class="muted">المتبقّي: <b>{{ inv.balance_due | number:'1.0-0' }} {{ inv.currency }}</b></p>
            <div class="fields">
              <label>المبلغ<input type="number" [(ngModel)]="payForm.amount" /></label>
              <label>طريقة الدفع
                <select [(ngModel)]="payForm.method">
                  <option value="bank_transfer">تحويل بنكي</option>
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="manual">تسوية يدوية</option>
                </select>
              </label>
              <label>المرجع<input [(ngModel)]="payForm.reference" placeholder="رقم الحوالة/الإيصال" /></label>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="payingInvoice.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving() || !payForm.amount" (click)="submitPay()">
                {{ saving() ? 'جارٍ الحفظ…' : 'تسجيل الدفعة' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 28px; padding: 0 12px; font-size: 12px; }
    .btn.xs { height: 26px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .bar-actions { display: flex; justify-content: flex-end; margin-bottom: 12px; }

    .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--nb-border); margin: 8px 0 20px; }
    .tabs button { height: 38px; padding: 0 16px; border: none; background: transparent; color: var(--nb-text-muted);
      font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; border-bottom: 2px solid transparent; }
    .tabs button.on { color: var(--nb-primary-600); border-bottom-color: var(--nb-primary-600); }

    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; position: relative; overflow: hidden; }
    .kpi::before { content:''; position:absolute; inset-block:0; inset-inline-start:0; width:4px; background: var(--nb-primary-600); }
    .kpi.ok::before { background: var(--nb-success); }
    .kpi.warn::before { background: var(--nb-danger); }
    .kpi.accent { background: color-mix(in srgb, var(--nb-primary-600) 8%, var(--nb-surface)); }
    .k-lbl { font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val { font-size: 27px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .k-sub { font-size: 11.5px; color: var(--nb-text-faint); }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 18px; }
    .panel h3 { margin: 0 0 14px; font-size: 14px; font-weight: 700; }
    .muted, .empty { color: var(--nb-text-muted); }
    .empty { text-align: center; padding: 30px; }

    .bar-chart { display: flex; flex-direction: column; gap: 12px; }
    .bc-row { display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 12px; }
    .bc-label { font-size: 12.5px; font-weight: 600; text-align: end; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bc-track { position: relative; display: flex; align-items: center; gap: 8px;
      background: color-mix(in srgb, var(--nb-primary-600) 5%, transparent); border-radius: 4px; padding: 2px; }
    .bc-fill { height: 16px; min-width: 4px; border-radius: 4px;
      background: linear-gradient(90deg, var(--nb-primary-500), var(--nb-primary-600)); width: 0; transition: width .7s cubic-bezier(.22,.61,.36,1); }
    .bc-value { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; }

    .usage-panel { margin-bottom: 16px; }
    .usage-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .usage-item { display: flex; flex-direction: column; gap: 6px; }
    .u-top { display: flex; justify-content: space-between; align-items: baseline; }
    .u-lbl { font-size: 12.5px; font-weight: 700; }
    .u-num { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--nb-text-muted); }
    .u-track { height: 8px; border-radius: 99px; background: color-mix(in srgb, var(--nb-primary-600) 8%, transparent); overflow: hidden; }
    .u-fill { height: 100%; border-radius: 99px; background: var(--nb-primary-600); width: 0; transition: width .7s cubic-bezier(.22,.61,.36,1); }
    .u-fill.hot { background: var(--nb-danger); }
    .usage-item.over .u-fill { background: var(--nb-danger); }
    .u-warn { font-size: 11px; font-weight: 700; color: var(--nb-danger); }

    .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .plan-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 18px; display: flex; flex-direction: column; gap: 12px; }
    .plan-card.inactive { opacity: .6; }
    .plan-card header { display: flex; align-items: center; justify-content: space-between; }
    .plan-card header b { font-size: 15px; font-weight: 800; }
    .cycle { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 99px;
      background: color-mix(in srgb, var(--nb-primary-600) 12%, transparent); color: var(--nb-primary-600); }
    .price { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .price small { font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }
    .desc { font-size: 12.5px; color: var(--nb-text-muted); margin: 0; min-height: 34px; }
    .limits { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .limits li { display: flex; justify-content: space-between; font-size: 12.5px; }
    .limits li span { color: var(--nb-text-muted); }
    .limits li b { font-weight: 700; }
    .plan-card footer { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--nb-border-soft); padding-top: 12px; }
    .subs { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }

    .scroll-x { overflow-x: auto; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    table.data { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    table.data th { background: var(--nb-primary-600); color: #fff; text-align: center; padding: 11px 12px; font-weight: 700; white-space: nowrap; }
    table.data td { text-align: center; padding: 10px 12px; border-bottom: 1px solid var(--nb-border-soft); white-space: nowrap; }
    table.data tbody tr:nth-child(even) { background: color-mix(in srgb, var(--nb-primary-600) 3%, transparent); }
    .mono { font-family: ui-monospace, monospace; direction: ltr; }
    .acts { display: flex; gap: 6px; justify-content: center; }

    .chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: var(--nb-bg); }
    .st-active, .iv-paid { background: color-mix(in srgb, var(--nb-success) 16%, transparent); color: var(--nb-success); }
    .st-trial { background: color-mix(in srgb, #2563eb 16%, transparent); color: #2563eb; }
    .st-past_due, .iv-overdue { background: color-mix(in srgb, var(--nb-danger) 16%, transparent); color: var(--nb-danger); }
    .st-suspended, .st-canceled, .st-expired, .iv-void { background: color-mix(in srgb, var(--nb-text-muted) 16%, transparent); color: var(--nb-text-muted); }
    .iv-open { background: color-mix(in srgb, #d97706 16%, transparent); color: #d97706; }

    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--nb-surface); border-radius: var(--nb-radius-card); padding: 22px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,.25); max-height: 90vh; overflow-y: auto; }
    .modal h3 { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
    .fields { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fields label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 600; }
    .fields label.chk { flex-direction: row; align-items: center; gap: 8px; }
    .fields input:not([type=checkbox]), .fields select, .fields textarea { border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 8px 12px; font-family: inherit; font-size: 13px; background: var(--nb-surface); color: var(--nb-text); outline: none; }
    .fields input:focus, .fields select:focus, .fields textarea:focus { border-color: var(--nb-primary-500); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  `]
})
export class SaasBillingDashboardComponent implements OnInit {
  private svc = inject(SaasBillingService);
  private notify = inject(NotificationService);

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'plans', label: 'الخطط' },
    { id: 'subscriptions', label: 'الاشتراكات' },
    { id: 'invoices', label: 'الفواتير' },
  ];
  readonly tab = signal<Tab>('overview');

  readonly metrics = signal<BillingMetrics | null>(null);
  readonly usage = signal<any | null>(null);
  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly subscriptions = signal<TenantSubscription[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly saving = signal(false);
  readonly cycling = signal(false);

  readonly editingPlan = signal<SubscriptionPlan | null>(null);
  readonly payingInvoice = signal<Invoice | null>(null);
  planForm: Partial<SubscriptionPlan> = {};
  payForm: { amount: number | null; method: string; reference: string } = { amount: null, method: 'bank_transfer', reference: '' };

  readonly planDistribution = computed(() => {
    const subs = this.subscriptions();
    const counts = new Map<string, number>();
    for (const s of subs) {
      const k = s.plan_name || '—';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const items = [...counts.entries()].map(([label, value]) => ({ label, value }));
    const max = Math.max(...items.map(i => i.value), 1);
    return items.map(i => ({ ...i, pct: Math.round((i.value / max) * 100) }));
  });

  ngOnInit(): void { this.loadAll(); }

  private loadAll(): void {
    this.svc.getMetrics().subscribe({ next: r => this.metrics.set(r?.data ?? r) });
    this.svc.getUsage().subscribe({ next: r => this.usage.set(r?.data ?? null), error: () => this.usage.set(null) });
    this.svc.getPlans().subscribe({ next: r => this.plans.set(r?.data ?? []) });
    this.svc.getSubscriptions().subscribe({ next: r => this.subscriptions.set(r?.data ?? []) });
    this.svc.getInvoices().subscribe({ next: r => this.invoices.set(r?.data ?? []) });
  }

  usageRows(u: any): any[] {
    const res = u?.resources || {};
    return Object.keys(res).map(key => ({ key, ...res[key] }));
  }

  runCycle(): void {
    this.cycling.set(true);
    this.svc.runCycle().subscribe({
      next: (r) => {
        this.cycling.set(false);
        const d = r?.data ?? {};
        this.notify.success(`دورة الفوترة: ${d.renewed || 0} تجديد، ${d.invoiced || 0} فاتورة، ${d.suspended || 0} إيقاف.`);
        this.loadAll();
      },
      error: () => { this.cycling.set(false); this.notify.error('تعذّر تشغيل دورة الفوترة.'); },
    });
  }

  // ---- الخطط ----
  openNewPlan(): void {
    this.planForm = { name_ar: '', code: '', description: '', billing_cycle: 'annual', price: 0,
      currency: 'SDG', max_students: 0, max_staff: 0, max_branches: 0, modules: [], is_active: true, is_public: true };
    this.editingPlan.set({} as SubscriptionPlan);
  }
  openEditPlan(p: SubscriptionPlan): void { this.planForm = { ...p }; this.editingPlan.set(p); }
  savePlan(): void {
    this.saving.set(true);
    const done = () => { this.saving.set(false); this.editingPlan.set(null); this.loadAll(); };
    const fail = () => { this.saving.set(false); this.notify.error('تعذّر حفظ الخطة.'); };
    const req = this.planForm.id
      ? this.svc.updatePlan(this.planForm.id, this.planForm)
      : this.svc.createPlan(this.planForm);
    req.subscribe({ next: () => { this.notify.success('تم حفظ الخطة.'); done(); }, error: fail });
  }

  // ---- الاشتراكات ----
  genInvoice(s: TenantSubscription): void {
    this.svc.generateInvoice(s.id).subscribe({
      next: () => { this.notify.success('تم توليد الفاتورة.'); this.loadAll(); this.tab.set('invoices'); },
      error: () => this.notify.error('تعذّر توليد الفاتورة.'),
    });
  }

  // ---- الدفع ----
  openPay(inv: Invoice): void {
    this.payForm = { amount: inv.balance_due, method: 'bank_transfer', reference: '' };
    this.payingInvoice.set(inv);
  }
  submitPay(): void {
    const inv = this.payingInvoice();
    if (!inv || !this.payForm.amount) return;
    this.saving.set(true);
    this.svc.recordPayment(inv.id, { amount: this.payForm.amount, method: this.payForm.method, reference: this.payForm.reference })
      .subscribe({
        next: () => { this.saving.set(false); this.payingInvoice.set(null); this.notify.success('تم تسجيل الدفعة.'); this.loadAll(); },
        error: () => { this.saving.set(false); this.notify.error('تعذّر تسجيل الدفعة.'); },
      });
  }
}
