import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/** أوامر الشراء (PO) — الصادرة للموردين مع القيمة والحالة. */
@Component({
  selector: 'app-procurement-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="أوامر الشراء (PO)" subtitle="أوامر الشراء الصادرة للموردين وحالات الإصدار والاستلام.">
        <button class="btn ghost" (click)="load()">تحديث</button>
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
          <span class="ta-end">القيمة</span><span class="ta-end">الحالة</span><span class="ta-end">إجراء</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="sk"></div> }
        } @else {
          @for (o of filtered(); track o.id) {
            <div class="row">
              <span class="mono">{{ o.po_number || '—' }}</span>
              <span>{{ o.vendor_name || o.vendor?.name_ar || '—' }}</span>
              <span class="muted">{{ o.date || '—' }}</span>
              <span class="ta-end strong">{{ fmt(o.total_amount) }}</span>
              <span class="ta-end"><span class="badge" [attr.data-s]="o.status">{{ statusText(o.status) }}</span></span>
              <span class="ta-end actions">
                @if (o.status === 'draft') {
                  <button class="act pri-btn" [disabled]="busyId()===o.id" (click)="issue(o)">إصدار للمورّد</button>
                } @else if (o.status === 'approved' || o.status === 'issued') {
                  <button class="act ok-btn" [disabled]="busyId()===o.id" (click)="postInvoice(o)">🧾 فاتورة المورّد</button>
                } @else if (o.status === 'completed') {
                  <span class="posted">✓ مُرحّل</span>
                } @else { <span class="dash">—</span> }
              </span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد أوامر شراء مطابقة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.2fr 1.4fr 0.9fr 1fr 1fr 1.1fr; }
    .actions { display: flex; justify-content: flex-end; }
    .act { border: none; border-radius: 8px; padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .act:disabled { opacity: .6; cursor: default; }
    .act.pri-btn { background: var(--nb-primary-600); color: #fff; }
    .act.ok-btn { background: #16a34a; color: #fff; }
    .posted { font-size: 11.5px; font-weight: 700; color: #166534; }
    .dash { color: var(--nb-text-muted); }
  `],
})
export class ProcurementOrdersComponent implements OnInit {
  private svc = inject(ProcurementService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly q = signal('');
  readonly filter = signal('');

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter(o =>
      (!f || o.status === f) && (!term || (o.po_number || '').includes(term)));
  });

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.svc.getPurchaseOrders({ page_size: 200 }).subscribe({
      next: (d) => { this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise(resolve =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe(ok => resolve(!!ok)));
  }

  /**
   * تسجيل فاتورة المورّد وترحيلها — أمر الشراء التزام لا يُرحَّل، والفاتورة هي
   * ما يُرحَّل محاسبياً (نمط Vendor Bill في Odoo و Vendor invoice في D365).
   */
  async postInvoice(o: any): Promise<void> {
    const suggested = `INV-${o.po_number}`;
    const num = window.prompt('رقم فاتورة المورّد المستلمة:', suggested);
    if (!num || !num.trim()) return;
    const ok = await this.confirm({
      title: 'ترحيل فاتورة المورّد',
      message: `سيُرحَّل قيد محاسبي في دفتر الأستاذ: من ح/ المصروف ${this.fmt(o.total_amount)} إلى ح/ ذمم الموردين الدائنة.`,
      confirmText: 'ترحيل', color: 'primary',
    });
    if (!ok) return;
    this.busyId.set(o.id);
    this.svc.postVendorInvoice(o.id, num.trim()).subscribe({
      next: () => { this.busyId.set(null); this.notify.success('تم ترحيل فاتورة المورّد في دفتر الأستاذ.'); this.load(); },
      error: (e) => { this.busyId.set(null); this.notify.error(e?.details?.error || e?.message || 'تعذّر ترحيل الفاتورة.'); },
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
