import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/**
 * حركة المخزون (كارت الصنف).
 * كل سطر يحمل الفارق والرصيد الناتج عنه — فيُقرأ السجل كقصة متصلة
 * لا كأرقام منفصلة، وهو جوهر كارت الصنف في الأنظمة المحاسبية.
 */
@Component({
  selector: 'app-stock-movements',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="حركة المخزون" subtitle="كارت الصنف — سجل الوارد والمنصرف والرصيد بعد كل حركة.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <nb-export-menu [columns]="cols" [rows]="filtered()" title="حركة المخزون"
          subtitle="سجل حركات الأصناف" filename="حركة-المخزون"></nb-export-menu>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث باسم الصنف أو المستند…" />
        <div class="chips">
          <button [class.on]="dir()===''" (click)="dir.set('')">الكل</button>
          <button [class.on]="dir()==='in'" (click)="dir.set('in')">وارد</button>
          <button [class.on]="dir()==='out'" (click)="dir.set('out')">منصرف</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>الصنف</span><span>المستودع</span><span>المستند</span>
          <span class="ta-end">الحركة</span><span class="ta-end">الرصيد بعدها</span><span class="ta-end">التاريخ</span>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل حركات المخزون…"></nb-loading>
        } @else {
          @for (m of filtered(); track m.id) {
            <div class="row">
              <span><strong>{{ m.item }}</strong></span>
              <span class="muted">{{ m.warehouse }}</span>
              <span class="muted mono">{{ m.ref }}</span>
              <span class="ta-end mono" [class.pos]="m.delta > 0" [class.neg]="m.delta < 0">
                {{ m.delta > 0 ? '+' : '' }}{{ m.delta | number:'1.0-2' }}
              </span>
              <span class="ta-end mono strong">{{ m.balance | number:'1.0-2' }}</span>
              <span class="ta-end muted mono">{{ m.date }}</span>
            </div>
          }
          @if (!filtered().length) { <div class="empty">لا توجد حركات مطابقة.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 1.8fr 1.2fr 1.3fr 0.9fr 1fr 1fr; }
    .strong { font-weight: 800; }
    .pos { color: #15803D; font-weight: 700; }
    .neg { color: #B91C1C; font-weight: 700; }
  `],
})
export class StockMovementsComponent implements OnInit {
  private svc = inject(InventoryService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly q = signal('');
  readonly dir = signal('');

  private movements = signal<any[]>([]);
  private items = signal<any[]>([]);
  private warehouses = signal<any[]>([]);

  readonly cols: ExportColumn[] = [
    { key: 'item', label: 'الصنف' },
    { key: 'warehouse', label: 'المستودع' },
    { key: 'ref', label: 'المستند' },
    { key: 'delta', label: 'الحركة' },
    { key: 'balance', label: 'الرصيد بعدها' },
    { key: 'date', label: 'التاريخ' },
  ];

  readonly all = computed(() => {
    const itemMap = new Map(this.items().map((i) => [i.id, i]));
    const whMap = new Map(this.warehouses().map((w) => [w.id, w]));
    return this.movements().map((m) => ({
      id: m.id,
      item: itemMap.get(m.item)?.name_ar || itemMap.get(m.item)?.name_en || '—',
      warehouse: whMap.get(m.warehouse)?.name_ar || '—',
      ref: m.reference_document || '—',
      delta: Number(m.quantity_delta) || 0,
      balance: Number(m.new_balance) || 0,
      date: (m.timestamp || '').slice(0, 10),
    }));
  });

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const d = this.dir();
    return this.all().filter((m) =>
      (!d || (d === 'in' ? m.delta > 0 : m.delta < 0)) &&
      (!term || m.item.includes(term) || m.ref.includes(term)));
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getMovements().subscribe({
      next: (d) => { this.movements.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getItems().subscribe({ next: (d) => this.items.set(this.rows(d)), error: () => {} });
    this.svc.getWarehouses().subscribe({ next: (d) => this.warehouses.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/inventory/dashboard'); }
}
