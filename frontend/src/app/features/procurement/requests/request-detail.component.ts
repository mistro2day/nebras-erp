import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * تفاصيل طلب الشراء — عرض الاستمارة (Form View) على نمط Odoo/D365.
 *
 * التوقيع: «مستندات مرتبطة» كأزرار ذكية (Smart Buttons) تربط الطلب بعروض الأسعار
 * وأوامر الشراء المتولّدة عنه، فتتضح دورة Source-to-Pay من مكان واحد.
 */
@Component({
  selector: 'app-procurement-request-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatDialogModule],
  template: `
    <div class="page" dir="rtl">
      <button class="back" (click)="back()">‹ رجوع لطلبات الشراء</button>

      @if (loading()) {
        <div class="sk hero"></div><div class="sk"></div>
      } @else if (pr(); as r) {
        <!-- ترويسة الطلب -->
        <div class="hero">
          <div class="hero-main">
            <div class="h-title">
              <h1>{{ r.request_number }}</h1>
              <span class="badge" [attr.data-s]="r.status">{{ statusText(r.status) }}</span>
              <span class="pri" [attr.data-p]="r.priority">{{ priText(r.priority) }}</span>
            </div>
            <p class="reason">{{ r.reason || '—' }}</p>
            <div class="meta">
              <span><b>القسم الطالب:</b> {{ deptName(r.department_id) }}</span>
              <span><b>التاريخ:</b> {{ r.date }}</span>
              <span><b>الإجمالي التقديري:</b> <em>{{ fmt(r.total_estimated_amount) }}</em></span>
            </div>
          </div>
          <div class="hero-actions">
            @if (r.status === 'draft') {
              <button class="btn primary" [disabled]="busy()" (click)="submit(r)">📤 إرسال للاعتماد</button>
              <span class="hint">الخطوة التالية: إرسال الطلب لمراجعته واعتماده.</span>
            } @else if (r.status === 'pending_approval') {
              <button class="btn ok" [disabled]="busy()" (click)="approve(r)">✓ اعتماد الطلب</button>
              <span class="hint">الخطوة التالية: الاعتماد ثم توليد عروض الأسعار.</span>
            } @else if (r.status === 'approved') {
              <button class="btn primary" [disabled]="busy()" (click)="makeRfq(r)">📨 توليد طلب عروض أسعار</button>
              <span class="hint">الخطوة التالية: استقبال عروض الموردين والترسية.</span>
            } @else if (r.status === 'rfq_created') {
              <a class="btn primary" routerLink="/procurement/rfqs">📨 فتح عروض الأسعار</a>
              <span class="hint">سجّل عروض الموردين ثم أرسِ لتوليد أمر الشراء.</span>
            } @else if (r.status === 'completed') {
              <a class="btn ok" routerLink="/procurement/orders">📦 أوامر الشراء</a>
            }
          </div>
        </div>

        <!-- مسار الطلب: أين يقف الآن وما التالي -->
        <div class="track">
          @for (s of steps; track s.key; let last = $last) {
            <div class="step" [class.done]="stepIndex() > $index" [class.now]="stepIndex() === $index">
              <span class="dot">{{ stepIndex() > $index ? '✓' : $index + 1 }}</span>
              <span class="st-label">{{ s.label }}</span>
            </div>
            @if (!last) { <span class="line" [class.done]="stepIndex() > $index"></span> }
          }
        </div>

        <!-- المستندات المرتبطة (أزرار ذكية) -->
        <div class="smart">
          <a class="sb" routerLink="/procurement/rfqs">
            <span class="sb-n">{{ rfqs().length }}</span>
            <span class="sb-l">📨 عروض أسعار</span>
          </a>
          <a class="sb" routerLink="/procurement/orders">
            <span class="sb-n">{{ orders().length }}</span>
            <span class="sb-l">📦 أوامر شراء</span>
          </a>
          <div class="sb static">
            <span class="sb-n">{{ r.items?.length || 0 }}</span>
            <span class="sb-l">🧾 بنود الطلب</span>
          </div>
        </div>

        <!-- البنود -->
        <section class="card">
          <div class="card-head"><h3>بنود الطلب</h3></div>
          <div class="row head">
            <span>الصنف</span><span class="ta-end">الكمية</span><span>الوحدة</span>
            <span class="ta-end">سعر تقديري</span><span>حساب الموازنة</span><span>مركز التكلفة</span>
            <span class="ta-end">الإجمالي</span>
          </div>
          @for (it of r.items || []; track it.id) {
            <div class="row">
              <span class="strong">{{ it.item_name }}</span>
              <span class="ta-end mono">{{ it.quantity }}</span>
              <span class="muted">{{ it.unit }}</span>
              <span class="ta-end mono">{{ fmt(it.estimated_unit_price) }}</span>
              <span class="dim">{{ accName(it.budget_account_id) }}</span>
              <span class="dim">{{ ccName(it.cost_center_id) }}</span>
              <span class="ta-end strong">{{ fmt(lineTotal(it)) }}</span>
            </div>
          }
          @if (!r.items?.length) { <div class="empty">لا توجد بنود.</div> }
        </section>

        <!-- أوامر الشراء المتولّدة -->
        @if (orders().length) {
          <section class="card">
            <div class="card-head"><h3>أوامر الشراء المتولّدة</h3></div>
            <div class="row po head"><span>رقم الأمر</span><span>المورّد</span><span class="ta-end">القيمة</span><span class="ta-end">الحالة</span></div>
            @for (o of orders(); track o.id) {
              <div class="row po">
                <span class="mono">{{ o.po_number }}</span>
                <span>{{ vendorName(o.vendor) }}</span>
                <span class="ta-end strong">{{ fmt(o.total_amount) }}</span>
                <span class="ta-end"><span class="badge" [attr.data-s]="o.status">{{ poStatus(o.status) }}</span></span>
              </div>
            }
          </section>
        }
      } @else {
        <div class="empty">تعذّر تحميل الطلب.</div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .back { background: none; border: none; color: var(--nb-primary-600); font-family: inherit; font-weight: 700;
      font-size: 13.5px; cursor: pointer; padding: 4px 0 12px; }

    .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 20px; margin-bottom: 14px; }
    @media (max-width: 820px) { .hero { flex-direction: column; } }
    .h-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .h-title h1 { margin: 0; font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .reason { margin: 8px 0 12px; font-size: 13.5px; color: var(--nb-text-secondary); }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 12.5px; color: var(--nb-text-muted); }
    .meta b { color: var(--nb-text); font-weight: 700; }
    .meta em { font-style: normal; font-weight: 800; color: var(--nb-text); font-size: 14px; }
    .hero-actions { flex: none; display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
    .hint { font-size: 11.5px; color: var(--nb-text-muted); text-align: center; max-width: 240px; }
    a.btn { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }

    /* مسار الطلب */
    .track { display: flex; align-items: center; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 18px; margin-bottom: 14px; overflow-x: auto; }
    .step { display: flex; align-items: center; gap: 8px; flex: none; }
    .dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none;
      font-size: 11px; font-weight: 800; background: var(--nb-surface-raised); color: var(--nb-text-muted);
      border: 1px solid var(--nb-border); }
    .st-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); white-space: nowrap; }
    .step.done .dot { background: #16a34a; color: #fff; border-color: transparent; }
    .step.done .st-label { color: var(--nb-text); }
    .step.now .dot { background: var(--nb-primary-600); color: #fff; border-color: transparent;
      box-shadow: 0 0 0 4px var(--nb-primary-50); }
    .step.now .st-label { color: var(--nb-primary-700); font-weight: 800; }
    .line { flex: 1; min-width: 24px; height: 2px; background: var(--nb-border); margin: 0 10px; }
    .line.done { background: #16a34a; }

    .btn { height: 38px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 800;
      border-radius: var(--nb-radius); cursor: pointer; border: none; white-space: nowrap; }
    .btn.ok { background: #16a34a; color: #fff; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .6; cursor: default; }

    /* الأزرار الذكية */
    .smart { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .sb { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 120px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 12px 16px; text-decoration: none; transition: border-color .15s ease, transform .15s ease; }
    .sb:not(.static):hover { border-color: var(--nb-primary-400); transform: translateY(-2px); }
    .sb-n { font-size: 20px; font-weight: 800; color: var(--nb-primary-700); font-variant-numeric: tabular-nums; }
    .sb-l { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .sb.static .sb-n { color: var(--nb-text); }

    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow: hidden; margin-bottom: 14px; }
    .card-head { padding: 14px 16px 10px; }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .row { display: grid; grid-template-columns: 1.6fr 0.6fr 0.6fr 0.9fr 1.3fr 1.2fr 0.9fr; gap: 8px; align-items: center;
      padding: 10px 16px; font-size: 13px; color: var(--nb-text); border-top: 1px solid var(--nb-border-soft); }
    .row.po { grid-template-columns: 1.2fr 1.6fr 1fr 1fr; }
    .row.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; } .muted { color: var(--nb-text-muted); }
    .strong { font-weight: 700; }
    .dim { color: var(--nb-primary-700); font-size: 12px; }

    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
      background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge[data-s="approved"] { background: #e0f2fe; color: #075985; }
    .badge[data-s="completed"] { background: #dcfce7; color: #166534; }
    .badge[data-s="rejected"] { background: #fee2e2; color: #991b1b; }
    .badge[data-s="pending_approval"], .badge[data-s="draft"] { background: #fef3c7; color: #92400e; }
    .badge[data-s="rfq_created"] { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .pri { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .pri[data-p="high"] { background: #fee2e2; color: #991b1b; }
    .pri[data-p="medium"] { background: #fef3c7; color: #92400e; }
    .pri[data-p="low"] { background: var(--nb-surface-raised); color: var(--nb-text-muted); }

    .empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
    .sk { height: 60px; border-radius: var(--nb-radius-card); margin-bottom: 12px;
      background: linear-gradient(90deg, var(--nb-surface-raised), var(--nb-surface), var(--nb-surface-raised));
      background-size: 200% 100%; animation: sh 1.2s infinite; }
    .sk.hero { height: 130px; }
    @keyframes sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `]
})
export class ProcurementRequestDetailComponent implements OnInit {
  private svc = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  readonly pr = signal<any | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly rfqs = signal<any[]>([]);
  readonly orders = signal<any[]>([]);

  private readonly deptMap = signal<Record<string, string>>({});
  private readonly accMap = signal<Record<string, string>>({});
  private readonly ccMap = signal<Record<string, string>>({});
  private readonly vendorMap = signal<Record<string, string>>({});

  private id = '';

  /** مسار الطلب في دورة Source-to-Pay — يوضّح موضعه الحالي والخطوة التالية. */
  readonly steps = [
    { key: 'draft', label: 'مسودة' },
    { key: 'pending_approval', label: 'قيد الاعتماد' },
    { key: 'approved', label: 'معتمد' },
    { key: 'rfq_created', label: 'عروض أسعار' },
    { key: 'completed', label: 'مكتمل' },
  ];

  readonly stepIndex = computed(() => {
    const s = this.pr()?.status;
    const i = this.steps.findIndex(x => x.key === s);
    return i < 0 ? 0 : i;
  });

  private pick(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();

    this.svc.getRequestReferenceData().subscribe({
      next: (res: any) => {
        const d = res?.data ?? res ?? {};
        this.deptMap.set(Object.fromEntries((d.departments || []).map((x: any) => [String(x.id), x.name])));
        this.accMap.set(Object.fromEntries((d.accounts || []).map((x: any) => [String(x.id), `${x.code} — ${x.name}`])));
        this.ccMap.set(Object.fromEntries((d.cost_centers || []).map((x: any) => [String(x.id), x.name])));
      },
      error: () => {},
    });
    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d: any) => this.vendorMap.set(
        Object.fromEntries(this.pick(d).map((v: any) => [String(v.id), v.name_ar || v.name_en]))),
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getPurchaseRequest(this.id).subscribe({
      next: (res: any) => { this.pr.set(res?.data ?? res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    // المستندات المرتبطة بهذا الطلب (نمط الأزرار الذكية)
    this.svc.getRFQs({ page_size: 200 }).subscribe({
      next: (d: any) => this.rfqs.set(this.pick(d).filter((x: any) => String(x.purchase_request) === this.id)),
      error: () => {},
    });
    this.svc.getPurchaseOrders({ page_size: 200 }).subscribe({
      next: (d: any) => this.orders.set(this.pick(d).filter((x: any) => String(x.purchase_request) === this.id)),
      error: () => {},
    });
  }

  back() { this.router.navigate(['/procurement/requests']); }
  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  lineTotal(it: any) { return (Number(it.quantity) || 0) * (Number(it.estimated_unit_price) || 0); }
  deptName(id: any) { return this.deptMap()[String(id)] || '—'; }
  accName(id: any) { return this.accMap()[String(id)] || '—'; }
  ccName(id: any) { return this.ccMap()[String(id)] || '—'; }
  vendorName(id: any) { return this.vendorMap()[String(id)] || '—'; }

  priText(p: string) { return ({ high: 'عاجل', medium: 'متوسط', low: 'منخفض' } as any)[p] || p || '—'; }
  statusText(s: string) {
    return ({ draft: 'مسودة', pending_approval: 'تحت المراجعة', approved: 'معتمد للشراء',
      rejected: 'مرفوض', rfq_created: 'أُنشئ RFQ', completed: 'مكتمل' } as any)[s] || s;
  }
  poStatus(s: string) {
    return ({ draft: 'مسودة', approved: 'معتمد', issued: 'مُرسل', completed: 'مكتمل ومُرحّل', cancelled: 'ملغى' } as any)[s] || s;
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise(resolve =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(ok => resolve(!!ok)));
  }

  async submit(r: any) {
    const ok = await this.confirm({
      title: 'إرسال الطلب للاعتماد',
      message: `سيُرسل «${r.request_number}» لمراجعته واعتماده، ولن يبقى مسودة قابلة للتعديل.`,
      confirmText: 'إرسال', color: 'primary',
    });
    if (!ok) return;
    this.busy.set(true);
    this.svc.submitPurchaseRequest(r.id).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم إرسال الطلب للاعتماد.'); this.load(); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر الإرسال.'); },
    });
  }

  async approve(r: any) {
    const ok = await this.confirm({
      title: 'اعتماد طلب الشراء',
      message: `سيتم اعتماد «${r.request_number}» والمتابعة به في مسار الشراء.`,
      confirmText: 'اعتماد', color: 'primary',
    });
    if (!ok) return;
    this.busy.set(true);
    this.svc.approvePurchaseRequest(r.id, { approver_id: this.auth.currentUser()?.id }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم اعتماد الطلب.'); this.load(); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر الاعتماد.'); },
    });
  }

  async makeRfq(r: any) {
    const ok = await this.confirm({
      title: 'توليد طلب عروض أسعار',
      message: `سيُولَّد RFQ من «${r.request_number}» بموعد نهائي بعد 7 أيام.`,
      confirmText: 'توليد', color: 'primary',
    });
    if (!ok) return;
    const deadline = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 19);
    this.busy.set(true);
    this.svc.createRFQ({ purchase_request_id: r.id, deadline, notes: '' }).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم توليد طلب عروض الأسعار.'); this.load(); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر التوليد.'); },
    });
  }
}
