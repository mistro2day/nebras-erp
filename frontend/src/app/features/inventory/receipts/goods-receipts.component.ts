import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { ProcurementService } from '../../procurement/procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * سندات استلام البضاعة — نقطة الوصل الثلاثية.
 * الاستلام لا ينشأ من فراغ: مصدره أمر شراء معتمد، وأثره قيد في المالية.
 * لذلك يعرض كل سند طرفيه معاً ورابطاً لكلٍّ منهما بدل عرضه معزولاً.
 */
@Component({
  selector: 'app-goods-receipts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="استلام البضاعة" subtitle="سندات الاستلام مقابل أوامر الشراء وأثرها المحاسبي.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <!-- شرح المسار: من أين يأتي السند وإلى أين ينتهي أثره -->
      <div class="flow">
        <span class="f-step">أمر شراء صادر</span>
        <span class="f-arrow">←</span>
        <span class="f-step on">سند استلام</span>
        <span class="f-arrow">←</span>
        <span class="f-step">رصيد المخزون</span>
        <span class="f-arrow">←</span>
        <span class="f-step">قيد في المالية</span>
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل سندات الاستلام…"></nb-loading>
      } @else if (!receipts().length) {
        <section class="empty-state">
          <h3>لا توجد سندات استلام بعد</h3>
          <p>يُنشأ سند الاستلام من أمر شراء صادر. افتح أمر الشراء وسجّل الكميات المستلمة فعلاً.</p>
          @if (issuedOrders().length) {
            <div class="ready">
              <span class="r-lbl">أوامر شراء جاهزة للاستلام</span>
              @for (o of issuedOrders(); track o.id) {
                <button class="r-po" (click)="openOrder(o.id)">
                  <strong>{{ o.po_number }}</strong>
                  <span>{{ o.total_amount | number:'1.2-2' }} ر.س</span>
                  <span class="r-go">فتح الأمر ‹</span>
                </button>
              }
            </div>
          } @else {
            <button class="btn primary" (click)="go('/procurement/orders')">الذهاب لأوامر الشراء</button>
          }
        </section>
      } @else {
        <section class="list">
          @for (r of receipts(); track r.id) {
            <article class="rc">
              <header class="rc-head">
                <div>
                  <strong>{{ r.receipt_number }}</strong>
                  <span class="rc-date">{{ r.received_date }}</span>
                </div>
                <span class="badge" [class]="r.status">{{ statusLabel(r.status) }}</span>
              </header>
              <div class="rc-links">
                <span class="rc-wh">📦 {{ warehouseName(r.warehouse) }}</span>
                @if (r.purchase_order_id) {
                  <button class="link" (click)="openOrder(r.purchase_order_id)">أمر الشراء المصدر ‹</button>
                }
                @if (r.journal_entry_id) {
                  <button class="link fin" (click)="go('/finance/journals')">القيد المحاسبي ‹</button>
                } @else {
                  <span class="no-je">لم يُنشأ قيد بعد</span>
                }
              </div>
            </article>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }

    .flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;
      padding: 11px 14px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); }
    .f-step { font-size: 12px; font-weight: 700; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 20px; padding: 4px 12px; }
    .f-step.on { background: var(--nb-primary-50); color: var(--nb-primary-700); border-color: var(--nb-primary-200, #d9dcf7); }
    .f-arrow { color: var(--nb-primary-400); font-size: 14px; }

    .empty-state { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 34px 24px; text-align: center; }
    .empty-state h3 { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .empty-state p { margin: 0 0 18px; font-size: 13px; color: var(--nb-text-muted); }

    .ready { display: flex; flex-direction: column; gap: 8px; max-width: 460px; margin: 0 auto; }
    .r-lbl { font-size: 11px; font-weight: 700; color: var(--nb-text-muted); text-align: start; }
    .r-po { display: flex; align-items: center; gap: 12px; font-family: inherit; cursor: pointer;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 10px; padding: 11px 14px; text-align: start; }
    .r-po:hover { border-color: var(--nb-primary-400); }
    .r-po strong { font-size: 13px; font-weight: 700; color: var(--nb-text); flex: 1; }
    .r-po span { font-size: 12px; color: var(--nb-text-muted); }
    .r-go { color: var(--nb-primary-600) !important; font-weight: 700; }

    .list { display: flex; flex-direction: column; gap: 10px; }
    .rc { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; }
    .rc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
    .rc-head strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .rc-date { font-size: 11px; color: var(--nb-text-muted); margin-inline-start: 8px; }
    .badge { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; }
    .badge.approved { background: #f0fdf4; color: #15803D; }
    .badge.pending { background: #fffaf0; color: #B45309; }
    .badge.draft { background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge.rejected { background: #fef2f2; color: #B91C1C; }

    .rc-links { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .rc-wh { font-size: 12px; color: var(--nb-text-muted); }
    .link { border: none; background: none; font-family: inherit; font-size: 12px; font-weight: 700;
      color: var(--nb-primary-600); cursor: pointer; padding: 0; }
    .link.fin { color: #15803D; }
    .no-je { font-size: 11.5px; color: var(--nb-text-muted); }
  `],
})
export class GoodsReceiptsComponent implements OnInit {
  private svc = inject(InventoryService);
  private procurement = inject(ProcurementService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly receipts = signal<any[]>([]);
  private warehouses = signal<any[]>([]);
  private orders = signal<any[]>([]);

  /** أوامر الشراء الصادرة هي وحدها القابلة للاستلام. */
  readonly issuedOrders = computed(() =>
    this.orders().filter((o) => o.status === 'issued' || o.status === 'partially_received'),
  );

  warehouseName(id: string): string {
    return this.warehouses().find((w) => w.id === id)?.name_ar || '—';
  }

  statusLabel(s: string): string {
    return ({ draft: 'مسودة', pending: 'تحت الفحص', approved: 'مستلم ومضاف', rejected: 'مرفوض' } as any)[s] || s;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getReceipts().subscribe({
      next: (d) => { this.receipts.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
    this.procurement.getPurchaseOrders({ page_size: 200 }).subscribe({
      next: (d) => this.orders.set(this.rows(d)), error: () => {},
    });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  openOrder(id: string) { this.router.navigate(['/procurement/orders', id]); }
  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
