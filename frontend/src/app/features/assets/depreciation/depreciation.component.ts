import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AssetsService } from '../assets.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { NbExportMenuComponent, ExportColumn } from '../../../shared/export';

/**
 * الإهلاك الدوري وأثره المحاسبي.
 * كل سطر إهلاك هو قيد في المالية — لذا يظهر الرابط للقيد بجانب المبلغ،
 * فالإهلاك بلا قيد يعني قيمة دفترية لا تطابق الدفاتر.
 */
@Component({
  selector: 'app-asset-depreciation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent, NbExportMenuComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الإهلاك" subtitle="سجل الإهلاك الدوري للأصول وقيوده المرحّلة للمالية.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <nb-export-menu [columns]="cols" [rows]="rowsView()" title="سجل الإهلاك"
          subtitle="الإهلاك الدوري للأصول" filename="سجل-الاهلاك"></nb-export-menu>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل سجل الإهلاك…"></nb-loading>
      } @else if (!rowsView().length) {
        <section class="empty-state">
          <h3>لم يُحتسب إهلاك بعد</h3>
          <p>
            يُحتسب الإهلاك للأصول المرسملة فقط، ويُرحَّل قيداً في الأستاذ العام
            يُنقص القيمة الدفترية ويُثبت المصروف.
          </p>
          <button class="btn primary" (click)="go('/assets/register')">فتح سجل الأصول</button>
        </section>
      } @else {
        <section class="summary">
          <div class="s">
            <span class="s-lbl">عدد القيود</span>
            <span class="s-val">{{ rowsView().length }}</span>
          </div>
          <div class="s">
            <span class="s-lbl">إجمالي الإهلاك المسجّل</span>
            <span class="s-val">{{ total() | number:'1.0-0' }} <small>ر.س</small></span>
          </div>
          <div class="s" [class.warn]="unposted() > 0">
            <span class="s-lbl">بلا قيد محاسبي</span>
            <span class="s-val">{{ unposted() }}</span>
          </div>
        </section>

        <section class="card">
          <div class="row head">
            <span>الأصل</span><span>التاريخ</span>
            <span class="ta-end">قيمة الإهلاك</span><span class="ta-end">المجمّع</span><span class="ta-end">القيد</span>
          </div>
          @for (d of rowsView(); track d.id) {
            <div class="row">
              <span><strong>{{ d.assetName }}</strong> <span class="muted mono">{{ d.assetNumber }}</span></span>
              <span class="muted mono">{{ d.date }}</span>
              <span class="ta-end mono strong">{{ d.amount | number:'1.2-2' }}</span>
              <span class="ta-end mono muted">{{ d.accum | number:'1.2-2' }}</span>
              <span class="ta-end">
                @if (d.hasJournal) {
                  <button class="link" (click)="go('/finance/journals')">عرض القيد ‹</button>
                } @else { <span class="badge none">بلا قيد</span> }
              </span>
            </div>
          }
        </section>
      }
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 2fr 1fr 1.1fr 1.1fr 1fr; }
    .strong { font-weight: 800; }
    .link { border: none; background: none; font-family: inherit; font-size: 12px; font-weight: 700;
      color: var(--nb-primary-600); cursor: pointer; padding: 0; }
    .badge.none { background: #fffaf0; color: #B45309; }

    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 720px) { .summary { grid-template-columns: 1fr; } }
    .s { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 16px; display: flex; flex-direction: column; gap: 2px; }
    .s.warn { border-color: #fde9c8; background: #fffdf8; }
    .s-lbl { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .s-val { font-size: 21px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .s-val small { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }

    .empty-state { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 34px 24px; text-align: center; }
    .empty-state h3 { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .empty-state p { margin: 0 auto 18px; font-size: 13px; color: var(--nb-text-muted); max-width: 460px; }
  `],
})
export class AssetDepreciationComponent implements OnInit {
  private svc = inject(AssetsService);
  private router = inject(Router);

  readonly loading = signal(true);
  private depreciations = signal<any[]>([]);
  private assets = signal<any[]>([]);

  readonly cols: ExportColumn[] = [
    { key: 'assetNumber', label: 'رقم الأصل' },
    { key: 'assetName', label: 'الأصل' },
    { key: 'date', label: 'التاريخ' },
    { key: 'amount', label: 'قيمة الإهلاك', align: 'end' },
    { key: 'accum', label: 'المجمّع', align: 'end' },
  ];

  readonly rowsView = computed(() => {
    const map = new Map(this.assets().map((a) => [a.id, a]));
    return this.depreciations()
      .map((d) => ({
        id: d.id,
        assetName: map.get(d.asset)?.name_ar || map.get(d.asset)?.name_en || '—',
        assetNumber: map.get(d.asset)?.asset_number || '',
        date: d.depreciation_date,
        amount: Number(d.depreciation_amount) || 0,
        accum: Number(d.accumulated_depreciation) || 0,
        hasJournal: !!d.journal_entry_id,
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  });

  readonly total = computed(() => this.rowsView().reduce((s, d) => s + d.amount, 0));
  readonly unposted = computed(() => this.rowsView().filter((d) => !d.hasJournal).length);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getDepreciations().subscribe({
      next: (d) => { this.depreciations.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getAssets().subscribe({ next: (d) => this.assets.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/assets/dashboard'); }
}
