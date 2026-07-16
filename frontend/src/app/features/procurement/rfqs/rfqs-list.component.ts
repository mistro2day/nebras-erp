import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { RfqAwardPanelComponent } from './rfq-award-panel.component';

/** طلبات عروض الأسعار (RFQ) — المرسلة للموردين وحالات التحليل والترسية. */
@Component({
  selector: 'app-procurement-rfqs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, RfqAwardPanelComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="عروض الأسعار (RFQ)" subtitle="طلبات عروض الأسعار المرسلة للموردين ومراحل التحليل والترسية.">
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث برقم الطلب…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل</button>
          <button [class.on]="filter()==='published'" (click)="filter.set('published')">منشور</button>
          <button [class.on]="filter()==='closed'" (click)="filter.set('closed')">قيد التحليل</button>
          <button [class.on]="filter()==='awarded'" (click)="filter.set('awarded')">تمت الترسية</button>
        </div>
      </div>

      @if (awardRfq(); as ar) {
        <app-rfq-award-panel [rfqId]="ar.id" [rfqNumber]="ar.rfq_number"
          (awarded)="onAwarded()" (close)="awardRfq.set(null)"></app-rfq-award-panel>
      }

      <section class="card">
        <div class="row head">
          <span>رقم الطلب</span><span>الموعد النهائي</span><span>ملاحظات</span>
          <span class="ta-end">الحالة</span><span class="ta-end">إجراء</span>
        </div>
        @if (loading()) {
          <nb-loading message="جارٍ تحميل عروض الأسعار…"></nb-loading>
        } @else {
          @for (r of filtered(); track r.id) {
            <div class="row">
              <span class="mono">{{ r.rfq_number || '—' }}</span>
              <span class="muted">{{ (r.deadline | slice:0:10) || '—' }}</span>
              <span class="muted ellipsis">{{ r.notes || '—' }}</span>
              <span class="ta-end"><span class="badge" [attr.data-s]="r.status">{{ statusText(r.status) }}</span></span>
              <span class="ta-end actions">
                @if (r.status === 'published' || r.status === 'closed') {
                  <button class="act pri-btn" (click)="awardRfq.set(r)">الترسية</button>
                } @else { <span class="dash">—</span> }
              </span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد طلبات عروض أسعار مطابقة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.2fr 1.1fr 1.6fr 1fr 0.9fr; }
    .ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .actions { display: flex; justify-content: flex-end; }
    .act { border: none; border-radius: 8px; padding: 6px 12px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
    .act.pri-btn { background: var(--nb-primary-600); color: #fff; }
    .dash { color: var(--nb-text-muted); }
  `],
})
export class ProcurementRfqsComponent implements OnInit {
  private svc = inject(ProcurementService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly q = signal('');
  readonly filter = signal('');
  readonly awardRfq = signal<any | null>(null);

  onAwarded() { this.awardRfq.set(null); this.load(); }

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter(r =>
      (!f || r.status === f) && (!term || (r.rfq_number || '').includes(term)));
  });

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.svc.getRFQs({ page_size: 200 }).subscribe({
      next: (d) => { this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusText(s: string) {
    return ({ draft: 'مسودة', published: 'منشور للموردين', closed: 'قيد التحليل', awarded: 'تمت الترسية' } as any)[s] || s;
  }
}
