import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { QuotationEntryFormComponent } from './quotation-entry-form.component';
import { printDoc, ExportColumn } from '../../../shared/export';

/**
 * تفاصيل طلب عروض الأسعار — مركز المقارنة والترسية.
 *
 * التوقيع: **مصفوفة المقارنة** — العروض مصفوفة جنباً إلى جنب بفارق السعر عن
 * الأفضل ومدة التوريد، فالقرار يُتخذ من الشاشة لا من ذهن الموظف.
 *
 * قابلية التراجع: الترسية ليست نهائية ما دام أمر الشراء مسودة؛ فإن صدر
 * واستهلك الموازنة يُمنع التراجع (يُلغى الأمر من مساره).
 */
@Component({
  selector: 'app-procurement-rfq-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbLoadingComponent, QuotationEntryFormComponent],
  template: `
    <div class="page" dir="rtl">
      <button class="back" (click)="back()">‹ رجوع لعروض الأسعار</button>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل طلب عروض الأسعار…"></nb-loading>
      } @else if (rfq(); as r) {
        <!-- الترويسة -->
        <div class="hero">
          <div class="h-main">
            <div class="h-title">
              <h1>{{ r.rfq_number }}</h1>
              <span class="badge" [attr.data-s]="r.status">{{ statusText(r.status) }}</span>
              @if (isOverdue(r)) { <span class="over">⏰ تجاوز الموعد النهائي</span> }
            </div>
            <div class="meta">
              <span><b>الموعد النهائي:</b> {{ (r.deadline | slice:0:10) || '—' }}</span>
              <span><b>العروض المستلمة:</b> {{ quotes().length }}</span>
              @if (sourceRequest(); as pr) {
                <span><b>من طلب:</b>
                  <a class="lnk" (click)="openRequest(pr)">{{ pr.request_number }}</a>
                </span>
              }
            </div>
            @if (r.notes && !editing()) { <p class="notes">{{ r.notes }}</p> }
          </div>
          <div class="h-actions">
            <button class="btn ghost" (click)="print(r)">🖨️ طباعة</button>
            @if (canEdit(r) && !editing()) {
              <button class="btn ghost" (click)="startEdit(r)">✎ تعديل</button>
            }
            @if (r.status !== 'awarded' && !entering()) {
              <button class="btn primary" (click)="entering.set(true)">＋ تسجيل عرض سعر</button>
            }
            @if (r.status === 'awarded') {
              <button class="btn warn" [disabled]="busy()" (click)="revert(r)">↩︎ التراجع عن الترسية</button>
              <span class="hint">يُمنع التراجع إن صدر أمر الشراء واستهلك الموازنة.</span>
            }
          </div>
        </div>

        <!-- التعديل -->
        @if (editing()) {
          <section class="card pad">
            <div class="card-head"><h3>تعديل بيانات الطلب</h3></div>
            <div class="e-grid">
              <label>
                <span class="lbl">الموعد النهائي <b class="req">*</b></span>
                <input type="date" [(ngModel)]="form.deadline" />
              </label>
              <label class="wide">
                <span class="lbl">ملاحظات</span>
                <input [(ngModel)]="form.notes" placeholder="بدون" />
              </label>
            </div>
            <div class="e-foot">
              <button class="btn ghost" (click)="editing.set(false)">إلغاء</button>
              <button class="btn primary" [disabled]="busy()" (click)="save()">
                {{ busy() ? 'جارٍ الحفظ…' : 'حفظ التعديل' }}
              </button>
            </div>
          </section>
        }

        <!-- تسجيل عرض سعر -->
        @if (entering()) {
          <app-quotation-entry-form [rfqId]="r.id" [rfqNumber]="r.rfq_number"
            (saved)="onQuotationSaved()" (cancel)="entering.set(false)"></app-quotation-entry-form>
        }

        <!-- مصفوفة المقارنة -->
        <section class="card">
          <div class="card-head">
            <h3>مقارنة العروض والترسية</h3>
            <span class="c-sub">{{ quotes().length }} عرض</span>
          </div>
          @if (quotes().length === 0) {
            <div class="empty">
              <strong>لم تصل عروض أسعار بعد</strong>
              <p>سجّل عروض الموردين لتتمكّن من المقارنة والترسية وتوليد أمر الشراء.</p>
            </div>
          } @else {
            <div class="q head">
              <span>المورّد</span><span>المرجع</span><span class="ta-end">القيمة</span>
              <span class="ta-end">الفارق عن الأفضل</span><span class="ta-end">التوريد</span><span class="ta-end">إجراء</span>
            </div>
            @for (q of sortedQuotes(); track q.id) {
              <div class="q" [class.best]="q.id === bestId()" [class.won]="q.status === 'awarded'">
                <span class="who">
                  {{ vendorName(q.vendor) }}
                  @if (q.id === bestId() && r.status !== 'awarded') { <span class="tag best-tag">الأفضل سعراً</span> }
                  @if (q.status === 'awarded') { <span class="tag won-tag">✓ مُرسى عليه</span> }
                </span>
                <span class="mono muted">{{ q.quotation_reference || '—' }}</span>
                <span class="ta-end strong">{{ fmt(q.total_amount) }}</span>
                <span class="ta-end diff" [class.zero]="diff(q) === 0">
                  {{ diff(q) === 0 ? '—' : '+' + fmt(diff(q)) }}
                </span>
                <span class="ta-end muted">{{ q.lead_time_days }} يوم</span>
                <span class="ta-end">
                  @if (r.status !== 'awarded') {
                    <button class="award" [disabled]="busy()" (click)="award(q)">ترسية</button>
                  } @else { <span class="dash">—</span> }
                </span>
              </div>
            }
          }
        </section>

        <!-- البنود المطلوبة -->
        <section class="card">
          <div class="card-head"><h3>البنود المطلوبة</h3></div>
          <div class="it head"><span>الصنف</span><span class="ta-end">الكمية</span><span>الوحدة</span></div>
          @for (i of r.items || []; track i.id) {
            <div class="it">
              <span class="strong">{{ i.item_name }}</span>
              <span class="ta-end mono">{{ i.quantity }}</span>
              <span class="muted">{{ i.unit }}</span>
            </div>
          }
          @if (!r.items?.length) { <div class="empty">لا توجد بنود.</div> }
        </section>
      } @else {
        <div class="empty">تعذّر تحميل طلب عروض الأسعار.</div>
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
    .over { font-size: 11px; font-weight: 800; color: #92400e; background: #fef3c7; padding: 3px 9px; border-radius: 999px; }
    .meta { display: flex; gap: 20px; flex-wrap: wrap; font-size: 12.5px; color: var(--nb-text-muted); margin-top: 10px; }
    .meta b { color: var(--nb-text); font-weight: 700; }
    .lnk { color: var(--nb-primary-600); font-weight: 800; cursor: pointer; }
    .lnk:hover { text-decoration: underline; }
    .notes { margin: 10px 0 0; font-size: 12.5px; color: var(--nb-text-secondary); }
    .h-actions { flex: none; display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
    .hint { font-size: 11px; color: var(--nb-text-muted); text-align: center; max-width: 220px; }

    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow: hidden; margin-bottom: 14px; }
    .card.pad { padding: 0 16px 16px; }
    .card-head { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px 10px; }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .c-sub { font-size: 12px; color: var(--nb-text-muted); }

    .e-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; }
    @media (max-width: 720px) { .e-grid { grid-template-columns: 1fr; } }
    label { display: grid; grid-template-rows: 18px auto; gap: 6px; }
    .lbl { font-size: 12.5px; font-weight: 700; color: var(--nb-text); line-height: 18px; }
    .req { color: var(--nb-danger); }
    input { font-family: inherit; font-size: 13px; height: 38px; padding: 0 11px; width: 100%; box-sizing: border-box;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    input:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    .e-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

    /* مصفوفة المقارنة */
    .q { display: grid; grid-template-columns: 1.8fr 1fr 1fr 1.1fr 0.8fr 0.9fr; gap: 8px; align-items: center;
      padding: 11px 16px; font-size: 13px; border-top: 1px solid var(--nb-border-soft); }
    .q.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .q.best { background: #f0fdf4; }
    .q.won { background: var(--nb-primary-50); }
    .who { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--nb-text); }
    .tag { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 999px; }
    .best-tag { background: #16a34a; color: #fff; }
    .won-tag { background: var(--nb-primary-600); color: #fff; }
    .diff { font-weight: 700; color: var(--nb-danger); font-variant-numeric: tabular-nums; }
    .diff.zero { color: var(--nb-text-muted); font-weight: 400; }
    .award { background: var(--nb-primary-600); color: #fff; border: none; border-radius: 8px; padding: 6px 14px;
      font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .award:disabled { opacity: .6; }
    .dash { color: var(--nb-text-muted); }

    .it { display: grid; grid-template-columns: 2.4fr 0.7fr 0.7fr; gap: 8px; align-items: center;
      padding: 10px 16px; font-size: 13px; border-top: 1px solid var(--nb-border-soft); }
    .it.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }

    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; } .muted { color: var(--nb-text-muted); }
    .strong { font-weight: 700; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
      background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge[data-s="published"] { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge[data-s="awarded"] { background: #dcfce7; color: #166534; }
    .badge[data-s="closed"] { background: #fef3c7; color: #92400e; }

    .btn { height: 38px; padding: 0 18px; font-family: inherit; font-size: 13px; font-weight: 800;
      border-radius: var(--nb-radius); cursor: pointer; border: none; white-space: nowrap; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.warn { background: #fff; border: 1px solid #fde9c8; color: #b45309; }
    .btn:disabled { opacity: .6; }
    .empty { padding: 30px 16px; text-align: center; color: var(--nb-text-muted); font-size: 13px; }
    .empty strong { display: block; color: var(--nb-text); font-size: 14px; margin-bottom: 4px; }
    .empty p { margin: 0; font-size: 12.5px; }
  `]
})
export class ProcurementRfqDetailComponent implements OnInit {
  private svc = inject(ProcurementService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  readonly rfq = signal<any | null>(null);
  readonly quotes = signal<any[]>([]);
  readonly sourceRequest = signal<any | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly editing = signal(false);
  readonly entering = signal(false);

  private readonly vendorMap = signal<Record<string, string>>({});
  form: any = {};
  private id = '';

  private pick(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  readonly sortedQuotes = computed(() =>
    [...this.quotes()].sort((a, b) => (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0)));

  readonly bestId = computed(() => this.sortedQuotes()[0]?.id ?? null);

  /** فارق العرض عن أرخص عرض — يجعل المقارنة فورية بلا حساب ذهني. */
  diff(q: any): number {
    const best = Number(this.sortedQuotes()[0]?.total_amount) || 0;
    return (Number(q.total_amount) || 0) - best;
  }

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.load();
    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d: any) => this.vendorMap.set(
        Object.fromEntries(this.pick(d).map((v: any) => [String(v.id), v.name_ar || v.name_en]))),
      error: () => {},
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getRFQ(this.id).subscribe({
      next: (res: any) => {
        const r = res?.data ?? res;
        this.rfq.set(r);
        this.loading.set(false);
        if (r?.purchase_request) {
          this.svc.getPurchaseRequest(r.purchase_request).subscribe({
            next: (p: any) => this.sourceRequest.set(p?.data ?? p), error: () => {},
          });
        }
      },
      error: () => this.loading.set(false),
    });
    this.loadQuotes();
  }

  loadQuotes() {
    this.svc.getQuotations().subscribe({
      next: (d: any) => this.quotes.set(this.pick(d).filter((q: any) => String(q.rfq) === this.id)),
      error: () => {},
    });
  }

  onQuotationSaved() { this.entering.set(false); this.loadQuotes(); }

  /** التعديل متاح ما لم تتم الترسية. */
  canEdit(r: any): boolean { return r.status !== 'awarded'; }

  isOverdue(r: any): boolean {
    return r.status === 'published' && !!r.deadline && new Date(r.deadline) < new Date();
  }

  startEdit(r: any) {
    this.form = { deadline: (r.deadline || '').slice(0, 10), notes: r.notes || '' };
    this.editing.set(true);
  }

  save() {
    if (!this.form.deadline) { this.notify.error('حدّد الموعد النهائي.'); return; }
    this.busy.set(true);
    this.svc.updateRFQ(this.id, {
      deadline: `${this.form.deadline}T23:59:59`,
      notes: (this.form.notes || '').trim() || null,
    }).subscribe({
      next: () => {
        this.busy.set(false); this.editing.set(false);
        this.notify.success('تم حفظ تعديل الطلب.'); this.load();
      },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر الحفظ.'); },
    });
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise(resolve =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(ok => resolve(!!ok)));
  }

  async award(q: any) {
    const ok = await this.confirm({
      title: 'ترسية العرض',
      message: `سترسو المشتريات على «${this.vendorName(q.vendor)}» بقيمة ${this.fmt(q.total_amount)}، ويُولَّد أمر شراء مسودة.`,
      confirmText: 'ترسية', color: 'primary',
    });
    if (!ok) return;
    this.busy.set(true);
    this.svc.compareAndAward({ rfq_id: this.id, vendor_id: q.vendor, quotation_id: q.id }).subscribe({
      next: (r: any) => {
        this.busy.set(false);
        this.notify.success(`تمت الترسية وتوليد أمر شراء ${r?.po_number || ''}.`);
        this.load();
      },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّرت الترسية.'); },
    });
  }

  async revert(r: any) {
    const ok = await this.confirm({
      title: 'التراجع عن الترسية',
      message: `سيُلغى أمر الشراء المسودة المتولّد وتعود العروض للمقارنة في «${r.rfq_number}». `
        + `إن كان أمر الشراء قد صدر واستهلك الموازنة فسيُرفض التراجع.`,
      confirmText: 'تراجع', color: 'warn',
    });
    if (!ok) return;
    this.busy.set(true);
    this.svc.revertAward(this.id).subscribe({
      next: () => { this.busy.set(false); this.notify.success('تم التراجع عن الترسية.'); this.load(); },
      error: (e) => { this.busy.set(false); this.notify.error(e?.details?.error || e?.message || 'تعذّر التراجع.'); },
    });
  }

  print(r: any): void {
    const cols: ExportColumn[] = [
      { key: 'vendor', label: 'المورّد', map: (q) => this.vendorName(q.vendor) },
      { key: 'quotation_reference', label: 'المرجع', map: (q) => q.quotation_reference || '—' },
      { key: 'total_amount', label: 'القيمة', align: 'end', map: (q) => Number(q.total_amount) || 0 },
      { key: 'diff', label: 'الفارق عن الأفضل', align: 'end', map: (q) => this.diff(q) },
      { key: 'lead_time_days', label: 'مدة التوريد (يوم)', align: 'end' },
      { key: 'status', label: 'الحالة', map: (q) => q.status === 'awarded' ? 'مُرسى عليه' : 'مقدم' },
    ];
    printDoc(
      {
        title: `عروض أسعار ${r.rfq_number}`,
        subtitle: `الموعد النهائي: ${(r.deadline || '').slice(0, 10)} · الحالة: ${this.statusText(r.status)} · `
          + `العروض المستلمة: ${this.quotes().length}`,
        filename: `عروض-أسعار-${r.rfq_number}`,
      },
      cols,
      this.sortedQuotes()
    );
  }

  back() { this.router.navigate(['/procurement/rfqs']); }
  openRequest(pr: any) { this.router.navigate(['/procurement/requests', pr.id]); }
  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  vendorName(id: any) { return this.vendorMap()[String(id)] || 'مورّد'; }
  statusText(s: string) {
    return ({ draft: 'مسودة', published: 'منشور للموردين', closed: 'قيد التحليل', awarded: 'تمت الترسية' } as any)[s] || s;
  }
}
