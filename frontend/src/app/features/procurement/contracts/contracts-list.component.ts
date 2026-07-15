import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

/** عقود الشراء — الاتفاقيات الإطارية طويلة الأجل مع الموردين. */
@Component({
  selector: 'app-procurement-contracts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="عقود الشراء" subtitle="الاتفاقيات الإطارية والعقود طويلة الأجل مع الموردين.">
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث برقم العقد…" />
      </div>

      <section class="card">
        <div class="row head">
          <span>رقم العقد</span><span>المورّد</span><span>يبدأ</span><span>ينتهي</span><span class="ta-end">القيمة</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3]; track i) { <div class="sk"></div> }
        } @else {
          @for (c of filtered(); track c.id) {
            <div class="row">
              <span class="mono">{{ c.contract_number || '—' }}</span>
              <span>{{ c.vendor_name || c.vendor?.name_ar || '—' }}</span>
              <span class="muted">{{ c.start_date || '—' }}</span>
              <span class="muted">{{ c.end_date || '—' }}</span>
              <span class="ta-end strong">{{ fmt(c.total_value || c.value) }}</span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا توجد عقود مسجّلة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`.row { grid-template-columns: 1.3fr 1.5fr 1fr 1fr 1fr; }`],
})
export class ProcurementContractsComponent implements OnInit {
  private svc = inject(ProcurementService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly q = signal('');

  readonly filtered = computed(() => {
    const term = this.q().trim();
    return this.all().filter(c => !term || (c.contract_number || '').includes(term));
  });

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.svc.getContracts().subscribe({
      next: (d: any) => { this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  fmt(v: any) { return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
}
