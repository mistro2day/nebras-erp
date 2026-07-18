import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssetsService } from '../assets.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/** سجل الأصول الثابتة — الأصول وقيمها وحالتها في دورة الحياة. */
@Component({
  selector: 'app-asset-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="سجل الأصول" subtitle="الأصول الثابتة وقيمها الدفترية ومواقعها وحالتها في دورة الحياة.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <nb-export-menu [columns]="cols" [rows]="filtered()" title="سجل الأصول"
          subtitle="الأصول الثابتة وقيمها" filename="سجل-الاصول"></nb-export-menu>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث بالاسم أو رقم الأصل…" />
        <div class="chips">
          <button [class.on]="filter()===''" (click)="filter.set('')">الكل ({{ all().length }})</button>
          <button [class.on]="filter()==='registered'" (click)="filter.set('registered')">لم تُرسمل ({{ count('registered') }})</button>
          <button [class.on]="filter()==='capitalized'" (click)="filter.set('capitalized')">مرسملة ({{ count('capitalized') }})</button>
          <button [class.on]="filter()==='disposed'" (click)="filter.set('disposed')">مستبعدة ({{ count('disposed') }})</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>الأصل</span><span>الفئة</span><span>الموقع</span>
          <span class="ta-end">التكلفة</span><span class="ta-end">القيمة الدفترية</span><span class="ta-end">الحالة</span>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل سجل الأصول…"></nb-loading>
        } @else {
          @for (a of filtered(); track a.id) {
            <div class="row clickable" (click)="open(a)">
              <span class="cell-name">
                <strong>{{ a.name }}</strong>
                <span class="muted mono">{{ a.number }}</span>
              </span>
              <span class="muted">{{ a.category }}</span>
              <span class="muted">{{ a.location }}</span>
              <span class="ta-end mono">{{ a.cost | number:'1.0-0' }}</span>
              <span class="ta-end mono strong">{{ a.nbv | number:'1.0-0' }}</span>
              <span class="ta-end"><span class="badge" [class]="a.status">{{ statusLabel(a.status) }}</span></span>
            </div>
          }
          @if (!filtered().length) { <div class="empty">لا توجد أصول مطابقة.</div> }
        }
      </section>

      <!-- الأثر المالي الإجمالي: الأصول ليست سجلاً وصفياً بل قيمة في الميزانية -->
      @if (!loading() && filtered().length) {
        <div class="totals">
          <div class="t">
            <span class="t-lbl">إجمالي التكلفة</span>
            <span class="t-val">{{ totalCost() | number:'1.0-0' }} <small>ر.س</small></span>
          </div>
          <div class="t">
            <span class="t-lbl">مجمّع الإهلاك</span>
            <span class="t-val neg">{{ totalAccum() | number:'1.0-0' }} <small>ر.س</small></span>
          </div>
          <div class="t hero">
            <span class="t-lbl">صافي القيمة الدفترية</span>
            <span class="t-val">{{ totalNbv() | number:'1.0-0' }} <small>ر.س</small></span>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 2fr 1.1fr 1.1fr 1fr 1.1fr 1fr; }
    .row.clickable { cursor: pointer; }
    .cell-name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .cell-name strong { font-weight: 700; }
    .cell-name .muted { font-size: 11px; }
    .strong { font-weight: 800; }
    .badge.capitalized { background: #f0fdf4; color: #15803D; }
    .badge.registered { background: var(--nb-surface-raised); color: var(--nb-text-muted); border: 1px solid var(--nb-border); }
    .badge.disposed { background: #fef2f2; color: #B91C1C; }

    .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 14px; }
    @media (max-width: 720px) { .totals { grid-template-columns: 1fr; } }
    .t { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 16px; display: flex; flex-direction: column; gap: 2px; }
    .t.hero { border-color: var(--nb-primary-300, #c9cef2); background: var(--nb-primary-50, #f5f6ff); }
    .t-lbl { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .t-val { font-size: 21px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .t-val small { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .t-val.neg { color: #B91C1C; }
  `],
})
export class AssetRegisterComponent implements OnInit {
  private svc = inject(AssetsService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly q = signal('');
  readonly filter = signal('');

  private assets = signal<any[]>([]);
  private categories = signal<any[]>([]);
  private locations = signal<any[]>([]);

  readonly cols: ExportColumn[] = [
    { key: 'number', label: 'رقم الأصل' },
    { key: 'name', label: 'الأصل' },
    { key: 'category', label: 'الفئة' },
    { key: 'location', label: 'الموقع' },
    { key: 'cost', label: 'التكلفة' },
    { key: 'nbv', label: 'القيمة الدفترية' },
    { key: 'statusLabel', label: 'الحالة' },
  ];

  readonly all = computed(() => {
    const catMap = new Map(this.categories().map((c) => [c.id, c]));
    const locMap = new Map(this.locations().map((l) => [l.id, l]));
    return this.assets().map((a) => {
      const cost = Number(a.acquisition_cost) || 0;
      const nbv = Number(a.book_value) || 0;
      return {
        id: a.id,
        number: a.asset_number || '—',
        name: a.name_ar || a.name_en || 'أصل',
        category: catMap.get(a.category)?.name_ar || '—',
        location: locMap.get(a.location)?.name_ar || '—',
        cost, nbv,
        accum: Math.max(cost - nbv, 0),
        status: a.status,
        statusLabel: this.statusLabel(a.status),
      };
    });
  });

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const f = this.filter();
    return this.all().filter((a) =>
      (!f || a.status === f) &&
      (!term || a.name.includes(term) || (a.number || '').includes(term)));
  });

  readonly totalCost = computed(() => this.filtered().reduce((s, a) => s + a.cost, 0));
  readonly totalNbv = computed(() => this.filtered().reduce((s, a) => s + a.nbv, 0));
  readonly totalAccum = computed(() => this.filtered().reduce((s, a) => s + a.accum, 0));

  count(status: string): number { return this.all().filter((a) => a.status === status).length; }

  statusLabel(s: string): string {
    return ({ registered: 'مسجّل — لم يُرسمل', capitalized: 'مرسمل', disposed: 'مستبعد',
      under_maintenance: 'تحت الصيانة', retired: 'مشطوب' } as any)[s] || s;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAssets().subscribe({
      next: (d) => { this.assets.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getCategories().subscribe({ next: (d) => this.categories.set(this.rows(d)), error: () => {} });
    this.svc.getLocations().subscribe({ next: (d) => this.locations.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  open(a: any) { this.router.navigate(['/assets/register', a.id]); }
  back() { this.router.navigateByUrl('/assets/dashboard'); }
}
