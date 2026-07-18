import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InputDialogComponent, InputDialogData } from '../../../shared/components/input-dialog/input-dialog.component';
import { printDoc, ExportColumn } from '../../../shared/export';

/**
 * تفاصيل أمر الشراء — المستند الذي يحمل الالتزام المالي.
 *
 * التوقيع: «الأثر المالي» بارز في الترويسة — أمر الشراء يستهلك الموازنة عند
 * إصداره، ويولّد قيد فاتورة المورّد عند تسجيلها. لذا تُعرض حالته المالية
 * (موازنة مستهلكة / قيد مُرسل للمالية) لا حالته الإدارية فقط.
 */
@Component({
  selector: 'app-procurement-order-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatDialogModule, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <button class="back" (click)="back()">‹ رجوع لأوامر الشراء</button>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل أمر الشراء…"></nb-loading>
      } @else if (po(); as o) {
        <!-- الترويسة -->
        <div class="hero">
          <div class="h-main">
            <div class="h-title">
              <h1>{{ o.po_number }}</h1>
              <span class="badge" [attr.data-s]="o.status">{{ statusText(o.status) }}</span>
            </div>
            <div class="meta">
              <span><b>المورّد:</b> {{ vendorName(o.vendor) }}</span>
              <span><b>التاريخ:</b> {{ o.date }}</span>
              <span><b>القيمة:</b> <em>{{ fmt(o.total_amount) }}</em></span>
            </div>
            @if (o.payment_terms) { <p class="terms">شروط الدفع: {{ o.payment_terms }}</p> }
          </div>
          <div class="h-actions">
            <button class="btn ghost" (click)="print(o)">🖨️ طباعة</button>
            @if (o.status === 'draft') {
              <button class="btn primary" [disabled]="busy()" (click)="issue(o)">📦 إصدار للمورّد</button>
              <span class="hint">الإصدار يستهلك الموازنة المخصّصة في المالية.</span>
            } @else if (o.status === 'approved' || o.status === 'issued') {
              <button class="btn ok" [disabled]="busy()" (click)="postInvoice(o)">🧾 تسجيل فاتورة المورّد</button>
              <span class="hint">يُنشئ قيداً يُرسل للمالية كمسودة.</span>
            }
          </div>
        </div>

        <!-- الأثر المالي: ما فعله هذا الأمر في المالية فعلاً -->
        <div class="fin">
          <div class="fin-item" [class.done]="isIssued(o)">
            <span class="fi-ic">{{ isIssued(o) ? '✓' : '○' }}</span>
            <div>
              <strong>استهلاك الموازنة</strong>
              <small>{{ isIssued(o) ? 'خُصمت قيمة الأمر من موازنة مراكز التكلفة عند الإصدار.'
                                     : 'لم تُخصم بعد — تُخصم عند إصدار الأمر للمورّد.' }}</small>
            </div>
          </div>
          <div class="fin-item" [class.done]="isIssued(o)">
            <span class="fi-ic">{{ isIssued(o) ? '✓' : '○' }}</span>
            <div>
              <strong>استلام البضاعة</strong>
              @if (isIssued(o)) {
                <small>الأمر صادر — سجّل الكميات المستلمة ليدخل المخزون ويتحدّث الرصيد.</small>
                <a class="fi-link" routerLink="/inventory/receipts">سندات الاستلام ←</a>
              } @else {
                <small>يبدأ الاستلام بعد إصدار الأمر للمورّد.</small>
              }
            </div>
          </div>
          <div class="fin-item" [class.done]="!!o.journal_entry_id">
            <span class="fi-ic">{{ o.journal_entry_id ? '✓' : '○' }}</span>
            <div>
              <strong>قيد فاتورة المورّد</strong>
              @if (o.journal_entry_id) {
                <small>
                  فاتورة <b>{{ o.vendor_invoice_number }}</b> بتاريخ {{ o.vendor_invoice_date }} —
                  أُرسل القيد للمالية <b>كمسودة</b> بانتظار اعتماد المحاسب وترحيله.
                </small>
                <a class="fi-link" routerLink="/finance/journals">فتح قيود اليومية ←</a>
              } @else {
                <small>لم تُسجَّل فاتورة المورّد بعد.</small>
              }
            </div>
          </div>
        </div>

        <!-- البنود -->
        <section class="card">
          <div class="card-head">
            <h3>بنود أمر الشراء</h3>
            <span class="c-sub">{{ o.items?.length || 0 }} بند</span>
          </div>
          <div class="row head">
            <span>الصنف</span><span class="ta-end">الكمية</span><span>الوحدة</span>
            <span class="ta-end">سعر الوحدة</span><span>حساب الموازنة</span><span>مركز التكلفة</span>
            <span class="ta-end">الإجمالي</span>
          </div>
          @for (it of o.items || []; track it.id) {
            <div class="row">
              <span class="strong">{{ it.item_name }}</span>
              <span class="ta-end mono">{{ it.quantity }}</span>
              <span class="muted">{{ it.unit }}</span>
              <span class="ta-end mono">{{ fmt(it.unit_price) }}</span>
              <span class="dim">{{ accName(it.budget_account_id) }}</span>
              <span class="dim">{{ ccName(it.cost_center_id) }}</span>
              <span class="ta-end strong">{{ fmt(it.total_price) }}</span>
            </div>
          }
          @if (!o.items?.length) { <div class="empty">لا توجد بنود.</div> }
          <div class="total-row">
            <span>الإجمالي</span>
            <strong>{{ fmt(o.total_amount) }}</strong>
          </div>
        </section>

        <!-- المصدر: من أي طلب جاء هذا الأمر -->
        @if (sourceRequest(); as pr) {
          <section class="card">
            <div class="card-head"><h3>مصدر الأمر</h3></div>
            <button class="src" (click)="openRequest(pr)">
              <span class="src-ic">📝</span>
              <span class="src-body">
                <strong>طلب شراء {{ pr.request_number }}</strong>
                <small>{{ pr.reason || '—' }} · تقديري {{ fmt(pr.total_estimated_amount) }}</small>
              </span>
              <span class="src-go">فتح الطلب ←</span>
            </button>
          </section>
        }
      } @else {
        <div class="empty">تعذّر تحميل أمر الشراء.</div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .back { background: none; border: none; color: var(--nb-primary-600); font-family: inherit; font-weight: 700;
      font-size: 13.5px; cursor: pointer; padding: 4px 0 12px; }

    .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 20px; margin-bottom: 14px; }
    @media (max-width: 820px) { .hero { flex-direction: column; } }
    .h-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .h-title h1 { margin: 0; font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 12.5px; color: var(--nb-text-muted); margin-top: 10px; }
    .meta b { color: var(--nb-text); font-weight: 700; }
    .meta em { font-style: normal; font-weight: 800; color: var(--nb-text); font-size: 15px; }
    .terms { margin: 10px 0 0; font-size: 12.5px; color: var(--nb-text-secondary); }
    .h-actions { flex: none; display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
    .hint { font-size: 11.5px; color: var(--nb-text-muted); text-align: center; max-width: 230px; }

    /* الأثر المالي */
    .fin { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    @media (max-width: 820px) { .fin { grid-template-columns: 1fr; } }
    .fin-item { display: flex; gap: 12px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; }
    .fin-item.done { border-color: #bbf7d0; background: #f0fdf4; }
    .fi-ic { width: 26px; height: 26px; border-radius: 50%; flex: none; display: grid; place-items: center;
      font-size: 13px; font-weight: 800; background: var(--nb-surface-raised); color: var(--nb-text-muted);
      border: 1px solid var(--nb-border); }
    .fin-item.done .fi-ic { background: #16a34a; color: #fff; border-color: transparent; }
    .fin-item strong { display: block; font-size: 13px; font-weight: 800; color: var(--nb-text); }
    .fin-item small { display: block; font-size: 11.5px; color: var(--nb-text-muted); line-height: 1.7; margin-top: 2px; }
    .fi-link { display: inline-block; margin-top: 6px; font-size: 11.5px; font-weight: 800;
      color: var(--nb-primary-600); text-decoration: none; }
    .fi-link:hover { text-decoration: underline; }

    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow: hidden; margin-bottom: 14px; }
    .card-head { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px 10px; }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .c-sub { font-size: 12px; color: var(--nb-text-muted); }

    .row { display: grid; grid-template-columns: 1.6fr 0.6fr 0.6fr 0.9fr 1.3fr 1.2fr 0.9fr; gap: 8px;
      align-items: center; padding: 10px 16px; font-size: 13px; border-top: 1px solid var(--nb-border-soft); }
    .row.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; } .muted { color: var(--nb-text-muted); }
    .strong { font-weight: 700; } .dim { color: var(--nb-primary-700); font-size: 12px; }
    .total-row { display: flex; justify-content: space-between; padding: 12px 16px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); font-size: 13px; }
    .total-row strong { font-size: 17px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }

    .src { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer;
      background: none; border: none; border-top: 1px solid var(--nb-border-soft); font-family: inherit; text-align: start; }
    .src:hover { background: var(--nb-primary-50); }
    .src-ic { font-size: 20px; }
    .src-body { flex: 1; } .src-body strong { display: block; font-size: 13.5px; color: var(--nb-text); }
    .src-body small { font-size: 11.5px; color: var(--nb-text-muted); }
    .src-go { font-size: 12px; font-weight: 800; color: var(--nb-primary-600); }

    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
      background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge[data-s="approved"] { background: #e0f2fe; color: #075985; }
    .badge[data-s="completed"] { background: #dcfce7; color: #166534; }
    .badge[data-s="cancelled"] { background: #fee2e2; color: #991b1b; }
    .badge[data-s="draft"] { background: #fef3c7; color: #92400e; }

    .btn { height: 38px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 800;
      border-radius: var(--nb-radius); cursor: pointer; border: none; white-space: nowrap; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ok { background: #16a34a; color: #fff; }
    .btn:disabled { opacity: .6; }
    .empty { padding: 26px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class ProcurementOrderDetailComponent implements OnInit {
  private svc = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  readonly po = signal<any | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly sourceRequest = signal<any | null>(null);

  private readonly vendorMap = signal<Record<string, string>>({});
  private readonly accMap = signal<Record<string, string>>({});
  private readonly ccMap = signal<Record<string, string>>({});

  private id = '';

  private pick(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();

    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d: any) => this.vendorMap.set(
        Object.fromEntries(this.pick(d).map((v: any) => [String(v.id), v.name_ar || v.name_en]))),
      error: () => {},
    });
    this.svc.getRequestReferenceData().subscribe({
      next: (res: any) => {
        const d = res?.data ?? res ?? {};
        this.accMap.set(Object.fromEntries((d.accounts || []).map((a: any) => [String(a.id), `${a.code} — ${a.name}`])));
        this.ccMap.set(Object.fromEntries((d.cost_centers || []).map((c: any) => [String(c.id), c.name])));
      },
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getPurchaseOrder(this.id).subscribe({
      next: (res: any) => {
        const o = res?.data ?? res;
        this.po.set(o);
        this.loading.set(false);
        if (o?.purchase_request) {
          this.svc.getPurchaseRequest(o.purchase_request).subscribe({
            next: (r: any) => this.sourceRequest.set(r?.data ?? r), error: () => {},
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  /** الأمر استهلك الموازنة متى تجاوز المسودة. */
  isIssued(o: any): boolean { return ['approved', 'issued', 'completed'].includes(o?.status); }

  back() { this.router.navigate(['/procurement/orders']); }
  openRequest(pr: any) { this.router.navigate(['/procurement/requests', pr.id]); }
  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  vendorName(id: any) { return this.vendorMap()[String(id)] || '—'; }
  accName(id: any) { return this.accMap()[String(id)] || '—'; }
  ccName(id: any) { return this.ccMap()[String(id)] || '—'; }

  statusText(s: string) {
    return ({ draft: 'مسودة', approved: 'معتمد ومُصدر', issued: 'مُرسل ومؤكد',
      completed: 'مكتمل ومُرحّل', cancelled: 'ملغى' } as any)[s] || s;
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise(resolve =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(ok => resolve(!!ok)));
  }

  async issue(o: any) {
    const ok = await this.confirm({
      title: 'إصدار أمر الشراء',
      message: `سيُصدر «${o.po_number}» للمورّد وتُستهلك موازنة مراكز التكلفة بقيمة ${this.fmt(o.total_amount)}.`,
      confirmText: 'إصدار', color: 'primary',
    });
    if (!ok) return;
    this.busy.set(true);
    this.svc.issuePurchaseOrder(o.id).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم إصدار أمر الشراء واستهلاك الموازنة.'); this.load(); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر الإصدار.'); },
    });
  }

  async postInvoice(o: any) {
    const num: string | null = await new Promise(resolve =>
      this.dialog.open(InputDialogComponent, {
        panelClass: 'nb-dialog-panel',
        data: {
          title: 'تسجيل فاتورة المورّد',
          icon: '🧾',
          message: `سيُنشأ قيد بقيمة ${this.fmt(o.total_amount)} (مدين: المصروف / دائن: ذمم الموردين) ويُرسل إلى المالية كمسودة بانتظار اعتماد المحاسب.`,
          label: 'رقم فاتورة المورّد المستلمة',
          placeholder: 'كما هو مدوّن في فاتورة المورّد',
          value: `INV-${o.po_number}`,
          confirmText: 'تسجيل الفاتورة',
        } as InputDialogData,
      }).afterClosed().subscribe(v => resolve(v ?? null)));
    if (!num) return;

    this.busy.set(true);
    this.svc.postVendorInvoice(o.id, num).subscribe({
      next: (r: any) => {
        this.busy.set(false);
        this.notify.success(r?.message || 'تم تسجيل الفاتورة وأُرسل قيدها للمالية كمسودة.');
        this.load();
      },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر التسجيل.'); },
    });
  }

  /** طباعة أمر الشراء ببنوده وأبعاده المالية. */
  print(o: any): void {
    const cols: ExportColumn[] = [
      { key: 'item_name', label: 'الصنف' },
      { key: 'quantity', label: 'الكمية', align: 'end' },
      { key: 'unit', label: 'الوحدة' },
      { key: 'unit_price', label: 'سعر الوحدة', align: 'end', map: (i) => Number(i.unit_price) || 0 },
      { key: 'budget_account_id', label: 'حساب الموازنة', map: (i) => this.accName(i.budget_account_id) },
      { key: 'cost_center_id', label: 'مركز التكلفة', map: (i) => this.ccName(i.cost_center_id) },
      { key: 'total_price', label: 'الإجمالي', align: 'end', map: (i) => Number(i.total_price) || 0 },
    ];
    const inv = o.vendor_invoice_number ? ` · فاتورة المورّد: ${o.vendor_invoice_number}` : '';
    printDoc(
      {
        title: `أمر شراء ${o.po_number}`,
        subtitle: `المورّد: ${this.vendorName(o.vendor)} · التاريخ: ${o.date} · `
          + `الحالة: ${this.statusText(o.status)} · الإجمالي: ${this.fmt(o.total_amount)}${inv}`,
        filename: `أمر-شراء-${o.po_number}`,
      },
      cols,
      o.items || []
    );
  }
}
