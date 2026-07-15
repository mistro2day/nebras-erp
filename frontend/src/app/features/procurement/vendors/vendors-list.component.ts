import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProcurementService } from '../procurement.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { VendorCreateFormComponent } from './vendor-create-form.component';

/** سجل الموردين — التأهيل، الحالة، والتقييم. بنمط نبراس على غرار Odoo / D365. */
@Component({
  selector: 'app-procurement-vendors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, VendorCreateFormComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الموردون" subtitle="سجل الموردين المعتمدين وحالات التأهيل والتقييم.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="creating.set(!creating())">
          {{ creating() ? 'إغلاق' : '＋ مورّد جديد' }}
        </button>
      </nb-page-header>

      @if (creating()) {
        <app-vendor-create-form (created)="onCreated()" (cancel)="creating.set(false)"></app-vendor-create-form>
      }

      <div class="toolbar">
        <input class="search" [(ngModel)]="q" (ngModelChange)="q.set($event)" placeholder="بحث باسم المورّد…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل</button>
          <button [class.on]="filter()==='approved'" (click)="filter.set('approved')">معتمد</button>
          <button [class.on]="filter()==='pending'" (click)="filter.set('pending')">تحت التأهيل</button>
          <button [class.on]="filter()==='blacklisted'" (click)="filter.set('blacklisted')">قائمة سوداء</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>المورّد</span><span>الرقم الضريبي</span><span>السجل التجاري</span>
          <span class="ta-end">التقييم</span><span class="ta-end">الحالة</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="sk"></div> }
        } @else {
          @for (v of filtered(); track v.id) {
            <div class="row">
              <span class="who"><span class="ava">{{ initial(v.name_ar || v.name_en) }}</span>{{ v.name_ar || v.name_en }}</span>
              <span class="mono muted">{{ v.tax_number || '—' }}</span>
              <span class="mono muted">{{ v.cr_number || '—' }}</span>
              <span class="ta-end"><span class="stars">{{ stars(v.rating) }}</span></span>
              <span class="ta-end"><span class="badge" [attr.data-s]="v.status">{{ statusText(v.status) }}</span></span>
            </div>
          }
          @if (filtered().length === 0) { <div class="empty">لا يوجد موردون مطابقون.</div> }
        }
      </section>
    </div>
  `,
  styleUrl: '../shared/procurement-table.scss',
  styles: [`.row { grid-template-columns: 2fr 1.2fr 1.2fr 1fr 1fr; }`],
})
export class ProcurementVendorsComponent implements OnInit {
  private svc = inject(ProcurementService);
  readonly all = signal<any[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly q = signal('');
  readonly filter = signal('');

  onCreated() { this.creating.set(false); this.load(); }

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter(v =>
      (!f || v.status === f) &&
      (!term || (v.name_ar || '').includes(term) || (v.name_en || '').toLowerCase().includes(term.toLowerCase())));
  });

  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.svc.getVendors({ page_size: 200 }).subscribe({
      next: (d) => { this.all.set(Array.isArray(d) ? d : (d?.data ?? d?.results ?? [])); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  initial(n: string) { return (n || '؟').trim().charAt(0); }
  stars(r: any) { const n = Math.round(Number(r) || 0); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  statusText(s: string) {
    return ({ approved: 'معتمد ونشط', pending: 'تحت التأهيل', blacklisted: 'قائمة سوداء', suspended: 'موقوف' } as any)[s] || s;
  }
}
