import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

/** طلبات الشراء — الواردة من الأقسام مع الأولوية والحالة والقيمة التقديرية. */
@Component({
  selector: 'app-procurement-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="طلبات الشراء" subtitle="طلبات الشراء الواردة من الأقسام في مسار الاعتماد والتوريد.">
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث برقم الطلب…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل</button>
          <button [class.on]="filter()==='pending_approval'" (click)="filter.set('pending_approval')">تحت المراجعة</button>
          <button [class.on]="filter()==='approved'" (click)="filter.set('approved')">معتمد</button>
          <button [class.on]="filter()==='rfq_created'" (click)="filter.set('rfq_created')">أُنشئ RFQ</button>
          <button [class.on]="filter()==='completed'" (click)="filter.set('completed')">مكتمل</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>رقم الطلب</span><span>التاريخ</span><span>الأولوية</span>
          <span class="ta-end">تقديري</span><span class="ta-end">الحالة</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="sk"></div> }
        } @else {
          @for (r of filtered(); track r.id) {
            <div class="row">
              <span class="mono">{{ r.request_number || '—' }}</span>
              <span class="muted">{{ r.date || '—' }}</span>
              <span><span class="pri" [attr.data-p]="r.priority">{{ priText(r.priority) }}</span></span>
              <span class="ta-end strong">{{ fmt(r.total_estimated_amount) }}</span>
              <span class="ta-end"><span class="badge" [attr.data-s]="r.status">{{ statusText(r.status) }}</span></span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد طلبات شراء مطابقة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`.row { grid-template-columns: 1.4fr 1fr 1fr 1fr 1.2fr; }`],
})
export class ProcurementRequestsComponent implements OnInit {
  private svc = inject(ProcurementService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly q = signal('');
  readonly filter = signal('');

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter(r =>
      (!f || r.status === f) && (!term || (r.request_number || '').includes(term)));
  });

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.svc.getPurchaseRequests({ page_size: 200 }).subscribe({
      next: (d) => { this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  priText(p: string) { return ({ high: 'عاجل', medium: 'متوسط', low: 'منخفض' } as any)[p] || p || '—'; }
  statusText(s: string) {
    return ({ draft: 'مسودة', pending_approval: 'تحت المراجعة', approved: 'معتمد للشراء',
      rejected: 'مرفوض', rfq_created: 'أُنشئ RFQ', completed: 'مكتمل' } as any)[s] || s;
  }
}
