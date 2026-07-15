import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

/** أوامر الشراء (PO) — الصادرة للموردين مع القيمة والحالة. */
@Component({
  selector: 'app-procurement-orders',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
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
          <span class="ta-end">القيمة</span><span class="ta-end">الحالة</span>
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
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد أوامر شراء مطابقة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`.row { grid-template-columns: 1.3fr 1.5fr 1fr 1fr 1.1fr; }`],
})
export class ProcurementOrdersComponent implements OnInit {
  private svc = inject(ProcurementService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
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

  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  statusText(s: string) {
    return ({ draft: 'مسودة', approved: 'معتمد', issued: 'مُرسل ومؤكد', completed: 'مكتمل', cancelled: 'ملغى' } as any)[s] || s;
  }
}
