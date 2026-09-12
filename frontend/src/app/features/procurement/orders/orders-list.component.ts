import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InputDialogComponent, InputDialogData } from '../../../shared/components/input-dialog/input-dialog.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';
import { PurchaseOrderCreateModalComponent } from './purchase-order-create-modal.component';
import { printPurchaseOrder } from './purchase-order-print';

/** أوامر الشراء (PO) — الصادرة للموردين مع القيمة والحالة. */
@Component({
  selector: 'app-procurement-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    NbPageHeaderComponent,
    NbLoadingComponent,
    NbExportMenuComponent,
    PurchaseOrderCreateModalComponent,
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="أوامر الشراء (PO)" subtitle="أوامر الشراء الصادرة للموردين وحالات الإصدار والاستلام.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <nb-export-menu [columns]="exportCols" [rows]="filtered()"
          title="أوامر الشراء" [subtitle]="exportSubtitle()" filename="أوامر-الشراء"></nb-export-menu>
        <button class="btn primary" (click)="showCreateModal.set(true)">＋ أمر شراء جديد</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث برقم أمر الشراء…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل</button>
          <button [class.on]="filter()==='draft'" (click)="filter.set('draft')">مسودة</button>
          <button [class.on]="filter()==='approved'" (click)="filter.set('approved')">معتمد</button>
          <button [class.on]="filter()==='issued'" (click)="filter.set('issued')">مُرسل</button>
          <button [class.on]="filter()==='completed'" (click)="filter.set('completed')">مكتمل</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>رقم الأمر</span><span>المورّد</span><span>التاريخ</span>
          <span class="ta-end">القيمة</span><span class="ta-end">الحالة</span><span class="ta-end">إجراءات</span>
        </div>
        @if (loading()) {
          <nb-loading message="جارٍ تحميل أوامر الشراء…"></nb-loading>
        } @else {
          @for (o of filtered(); track o.id) {
            <div class="row clickable" (click)="open(o)" title="فتح تفاصيل أمر الشراء">
              <span class="mono">{{ o.po_number || '—' }}</span>
              <span>{{ vendorName(o.vendor) }}</span>
              <span class="muted">{{ o.date || '—' }}</span>
              <span class="ta-end strong">{{ fmt(o.total_amount) }}</span>
              <span class="ta-end"><span class="badge" [attr.data-s]="o.status">{{ statusText(o.status) }}</span></span>
              <!-- الإجراءات لا تفتح التفاصيل: نوقف انتشار الحدث -->
              <span class="ta-end actions" (click)="$event.stopPropagation()">
                <button class="act ghost-btn" title="طباعة أمر الشراء الرسمي A4" (click)="printOrder(o)">🖨️ طباعة</button>
                @if (o.status === 'draft') {
                  <button class="act pri-btn" [disabled]="busyId()===o.id" (click)="issue(o)">إصدار للمورّد</button>
                } @else if (o.status === 'approved' || o.status === 'issued') {
                  <button class="act ok-btn" [disabled]="busyId()===o.id" (click)="postInvoice(o)">🧾 فاتورة</button>
                } @else if (o.status === 'completed') {
                  <span class="posted">✓ مُرحّل</span>
                } @else { <span class="dash">—</span> }
              </span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد أوامر شراء مطابقة.</div> }
        }
      </section>

      <!-- معالج إنشاء أمر الشراء بنمط نبراس متعدد الخطوات -->
      <app-purchase-order-create-modal
        [open]="showCreateModal()"
        [vendors]="vendorsList()"
        [accounts]="accountsList()"
        [costCenters]="costCentersList()"
        [saving]="savingOrder()"
        (cancel)="showCreateModal.set(false)"
        (confirm)="handleCreateOrder($event)"
      >
      </app-purchase-order-create-modal>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.1fr 1.3fr 0.8fr 0.9fr 0.9fr 1.6fr; }
    .actions { display: flex; justify-content: flex-end; gap: 6px; }
    .act { border: none; border-radius: 8px; padding: 6px 10px; font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; }
    .act:disabled { opacity: .6; cursor: default; }
    .act.pri-btn { background: var(--nb-primary-600); color: #fff; }
    .act.ok-btn { background: #16a34a; color: #fff; }
    .act.ghost-btn { background: var(--nb-surface-raised, #f1f5f9); border: 1px solid var(--nb-border, #cbd5e1); color: var(--nb-text); }
    .act.ghost-btn:hover { background: #e2e8f0; }
    .posted { font-size: 11.5px; font-weight: 700; color: #166534; }
    .dash { color: var(--nb-text-muted); }
    .row.clickable { cursor: pointer; }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: #0f766e; color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class ProcurementOrdersComponent implements OnInit {
  private svc = inject(ProcurementService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);
  private router = inject(Router);

  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly q = signal('');
  readonly filter = signal('');

  readonly showCreateModal = signal(false);
  readonly savingOrder = signal(false);
  readonly vendorsList = signal<any[]>([]);
  readonly accountsList = signal<any[]>([]);
  readonly costCentersList = signal<any[]>([]);

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter(o =>
      (!f || o.status === f) && (!term || (o.po_number || '').includes(term)));
  });

  /** فتح تفاصيل أمر الشراء */
  open(o: any) { this.router.navigate(['/procurement/orders', o.id]); }

  /** خريطة معرّف المورّد → اسمه */
  private readonly vendorMap = signal<Record<string, string>>({});
  vendorName(id: any): string { return this.vendorMap()[String(id)] || '—'; }

  /** أعمدة التصدير/الطباعة */
  readonly exportCols: ExportColumn[] = [
    { key: 'po_number', label: 'رقم الأمر' },
    { key: 'vendor', label: 'المورّد', map: (o) => this.vendorName(o.vendor) },
    { key: 'date', label: 'التاريخ' },
    { key: 'total_amount', label: 'القيمة', align: 'end', map: (o) => Number(o.total_amount) || 0 },
    { key: 'status', label: 'الحالة', map: (o) => this.statusText(o.status) },
    { key: 'vendor_invoice_number', label: 'فاتورة المورّد', map: (o) => o.vendor_invoice_number || '—' },
  ];

  exportSubtitle(): string {
    const f = this.filter() ? this.statusText(this.filter()) : 'كل الحالات';
    return `${f} — ${this.filtered().length} أمر`;
  }

  ngOnInit() {
    this.load();
    this.loadLookups();
  }

  loadLookups() {
    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d: any) => {
        const list = Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
        this.vendorsList.set(list);
        this.vendorMap.set(Object.fromEntries(list.map((v: any) => [String(v.id), v.name_ar || v.name_en || v.name])));
      },
      error: () => {},
    });

    this.svc.getRequestReferenceData().subscribe({
      next: (ref: any) => {
        if (ref?.accounts) this.accountsList.set(ref.accounts);
        if (ref?.cost_centers) this.costCentersList.set(ref.cost_centers);
      },
      error: () => {}
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getPurchaseOrders({ page_size: 200 }).subscribe({
      next: (d) => {
        this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  printOrder(o: any) {
    if (o.items && o.items.length) {
      printPurchaseOrder({
        ...o,
        vendor_name: this.vendorName(o.vendor),
      });
    } else {
      this.svc.getPurchaseOrder(o.id).subscribe({
        next: (fullOrder: any) => {
          const ord = fullOrder?.data || fullOrder;
          printPurchaseOrder({
            ...ord,
            vendor_name: this.vendorName(ord.vendor),
          });
        },
        error: () => {
          printPurchaseOrder({
            ...o,
            vendor_name: this.vendorName(o.vendor),
          });
        }
      });
    }
  }

  handleCreateOrder(payload: any) {
    this.savingOrder.set(true);
    this.svc.createPurchaseOrder(payload).subscribe({
      next: (r: any) => {
        this.savingOrder.set(false);
        this.showCreateModal.set(false);
        this.notify.success('تم حفظ أمر الشراء بنجاح.');
        this.load();
      },
      error: (e: any) => {
        this.savingOrder.set(false);
        this.notify.error(e?.error?.message || e?.message || 'تعذّر إنشاء أمر الشراء.');
      }
    });
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise(resolve =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(ok => resolve(!!ok)));
  }

  async postInvoice(o: any): Promise<void> {
    const num: string | null = await new Promise(resolve =>
      this.dialog.open(InputDialogComponent, {
        panelClass: 'nb-dialog-panel',
        data: {
          title: 'تسجيل فاتورة المورّد',
          message: `سيُنشأ قيد محاسبي بقيمة ${this.fmt(o.total_amount)} (مدين: المصروف / دائن: ذمم الموردين) ويُرسل إلى المالية كمسودة بانتظار اعتماد المحاسب وترحيله.`,
          label: 'رقم فاتورة المورّد المستلمة',
          placeholder: 'كما هو مدوّن في فاتورة المورّد',
          value: `INV-${o.po_number}`,
          hint: 'يُحفظ الرقم مرجعاً على أمر الشراء وقيده المحاسبي.',
          confirmText: 'تسجيل الفاتورة',
        } as InputDialogData,
      }).afterClosed().subscribe(v => resolve(v ?? null)));

    if (!num) return;
    this.busyId.set(o.id);
    this.svc.postVendorInvoice(o.id, num).subscribe({
      next: (r: any) => {
        this.busyId.set(null);
        this.notify.success(r?.message || 'تم تسجيل الفاتورة وأُرسل قيدها للمالية كمسودة.');
        this.load();
      },
      error: (e) => { this.busyId.set(null); this.notify.error(e?.details?.error || e?.message || 'تعذّر تسجيل الفاتورة.'); },
    });
  }

  async issue(o: any): Promise<void> {
    const ok = await this.confirm({
      title: 'إصدار أمر الشراء',
      message: `سيتم إصدار أمر الشراء «${o.po_number}» للمورّد واستهلاك الموازنة المخصصة في المالية.`,
      confirmText: 'إصدار', color: 'primary',
    });
    if (!ok) return;
    this.busyId.set(o.id);
    this.svc.issuePurchaseOrder(o.id).subscribe({
      next: () => { this.busyId.set(null); this.notify.success('تم إصدار أمر الشراء للمورّد.'); this.load(); },
      error: (e) => { this.busyId.set(null); this.notify.error(e?.details?.error || e?.message || 'تعذّر إصدار أمر الشراء.'); },
    });
  }

  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  statusText(s: string) {
    return ({ draft: 'مسودة', approved: 'معتمد', issued: 'مُرسل ومؤكد', completed: 'مكتمل', cancelled: 'ملغى' } as any)[s] || s;
  }
}
