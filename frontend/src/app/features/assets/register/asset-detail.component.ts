import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AssetsService } from '../assets.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { printDoc, ExportColumn } from '../../../shared/export';

/**
 * تفاصيل الأصل — سيرة الأصل الواحد.
 * الأصل ليس سطراً في جدول: له تكلفة تتآكل، وعمر يمضي، وعهدة، وقيود في المالية.
 * تجمع الصفحة هذه الخيوط في مكان واحد بدل تفريقها على شاشات.
 */
@Component({
  selector: 'app-asset-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header [title]="asset()?.name_ar || 'تفاصيل الأصل'"
        [subtitle]="(asset()?.asset_number || '') + ' — سيرة الأصل وقيمته وأثره المحاسبي.'">
        <button class="btn ghost" (click)="back()">‹ سجل الأصول</button>
        <button class="btn ghost" (click)="print()">طباعة</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل بيانات الأصل…"></nb-loading>
      } @else if (!asset()) {
        <div class="empty-card">تعذّر العثور على هذا الأصل.</div>
      } @else {
        <div id="asset-print">
          <!-- القيمة: الحقيقة المركزية للأصل -->
          <section class="hero">
            <div class="h-main">
              <span class="h-lbl">القيمة الدفترية الحالية</span>
              <span class="h-val">{{ nbv() | number:'1.2-2' }} <small>ر.س</small></span>
              <div class="h-bar">
                <span class="h-fill" [style.width.%]="valuePct()"></span>
              </div>
              <span class="h-hint">
                استُهلك {{ accum() | number:'1.0-0' }} ر.س من أصل {{ cost() | number:'1.0-0' }} ر.س
                ({{ agePct() | number:'1.0-0' }}٪ من العمر الافتراضي)
              </span>
            </div>
            <div class="h-side">
              <span class="badge" [class]="asset()!.status">{{ statusLabel(asset()!.status) }}</span>
              @if (asset()!.status === 'registered') {
                <p class="h-note">لم يُرسمل بعد — لا يبدأ إهلاكه ولا يظهر أثره في المالية قبل الرسملة.</p>
              }
            </div>
          </section>

          <!-- البيانات -->
          <section class="grid">
            <article class="panel">
              <h3>بيانات الأصل</h3>
              <dl>
                <div><dt>رقم الأصل</dt><dd class="mono">{{ asset()!.asset_number || '—' }}</dd></div>
                <div><dt>الفئة</dt><dd>{{ categoryName() }}</dd></div>
                <div><dt>الموقع</dt><dd>{{ locationName() }}</dd></div>
                <div><dt>الشركة المصنعة</dt><dd>{{ asset()!.manufacturer || '—' }}</dd></div>
                <div><dt>الموديل</dt><dd>{{ asset()!.model || '—' }}</dd></div>
                <div><dt>الرقم التسلسلي</dt><dd class="mono">{{ asset()!.serial_number || '—' }}</dd></div>
                <div><dt>الباركود</dt><dd class="mono">{{ asset()!.barcode || '—' }}</dd></div>
              </dl>
            </article>

            <article class="panel">
              <h3>القيمة والإهلاك</h3>
              <dl>
                <div><dt>تكلفة الاقتناء</dt><dd class="mono">{{ cost() | number:'1.2-2' }}</dd></div>
                <div><dt>القيمة المتبقية</dt><dd class="mono">{{ salvage() | number:'1.2-2' }}</dd></div>
                <div><dt>مجمّع الإهلاك</dt><dd class="mono neg">{{ accum() | number:'1.2-2' }}</dd></div>
                <div><dt>القيمة الدفترية</dt><dd class="mono strong">{{ nbv() | number:'1.2-2' }}</dd></div>
                <div><dt>العمر الافتراضي</dt><dd>{{ asset()!.useful_life_months }} شهراً</dd></div>
                <div><dt>تاريخ الشراء</dt><dd class="mono">{{ asset()!.purchase_date || '—' }}</dd></div>
                <div><dt>بدء التشغيل</dt><dd class="mono">{{ asset()!.commission_date || '—' }}</dd></div>
              </dl>
            </article>
          </section>

          <!-- سجل الإهلاك -->
          <section class="panel">
            <h3>سجل الإهلاك</h3>
            @if (!depreciations().length) {
              <p class="muted-note">لم يُحتسب إهلاك لهذا الأصل بعد. كل احتساب يُرحَّل قيداً في المالية.</p>
            } @else {
              <div class="tbl">
                <div class="t-row t-head">
                  <span>التاريخ</span><span class="ta-end">قيمة الإهلاك</span>
                  <span class="ta-end">المجمّع</span><span class="ta-end">القيد</span>
                </div>
                @for (d of depreciations(); track d.id) {
                  <div class="t-row">
                    <span class="mono">{{ d.depreciation_date }}</span>
                    <span class="ta-end mono">{{ d.depreciation_amount | number:'1.2-2' }}</span>
                    <span class="ta-end mono muted">{{ d.accumulated_depreciation | number:'1.2-2' }}</span>
                    <span class="ta-end">
                      @if (d.journal_entry_id) {
                        <button class="link" (click)="go('/finance/journals')">عرض ‹</button>
                      } @else { <span class="muted">—</span> }
                    </span>
                  </div>
                }
              </div>
            }
          </section>
        </div>

        <!-- الروابط بالموديولات الأخرى -->
        <section class="links">
          <button class="lk" (click)="go('/finance/journals')">
            <span class="lk-t">القيود المحاسبية</span>
            <span class="lk-d">أثر الرسملة والإهلاك في الأستاذ العام</span>
          </button>
          <button class="lk" (click)="go('/maintenance')">
            <span class="lk-t">الصيانة</span>
            <span class="lk-d">أوامر صيانة هذا الأصل وتاريخها</span>
          </button>
          <button class="lk" (click)="go('/assets/custody')">
            <span class="lk-t">العهدة والتغطية</span>
            <span class="lk-d">من يحمل الأصل، وضمانه وتأمينه</span>
          </button>
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }

    .hero { display: flex; gap: 20px; flex-wrap: wrap; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 18px 20px; margin-bottom: 14px; }
    .h-main { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 6px; }
    .h-lbl { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .h-val { font-size: 32px; font-weight: 800; color: var(--nb-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
    .h-val small { font-size: 14px; font-weight: 700; color: var(--nb-text-muted); }
    .h-bar { height: 8px; border-radius: 5px; background: #eef0f5; position: relative; margin-top: 4px; }
    .h-fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 5px;
      background: var(--nb-primary-500); transition: width .5s cubic-bezier(.4,0,.2,1); }
    .h-hint { font-size: 11.5px; color: var(--nb-text-muted); }
    .h-side { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; max-width: 240px; }
    .h-note { margin: 0; font-size: 11.5px; color: var(--nb-text-muted); text-align: end; }

    .badge { font-size: 11.5px; font-weight: 700; border-radius: 20px; padding: 4px 12px; }
    .badge.capitalized { background: #f0fdf4; color: #15803D; }
    .badge.registered { background: var(--nb-surface-raised); color: var(--nb-text-muted); border: 1px solid var(--nb-border); }
    .badge.disposed { background: #fef2f2; color: #B91C1C; }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; margin-bottom: 14px; }
    .panel h3 { margin: 0 0 12px; font-size: 14px; font-weight: 700; color: var(--nb-text); }

    dl { margin: 0; display: flex; flex-direction: column; gap: 8px; }
    dl > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    dt { font-size: 12px; color: var(--nb-text-muted); }
    dd { margin: 0; font-size: 13px; font-weight: 600; color: var(--nb-text); text-align: end; }
    .mono { font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 800; }
    .neg { color: #B91C1C; }
    .muted { color: var(--nb-text-muted); }
    .muted-note { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); }

    .tbl { display: flex; flex-direction: column; }
    .t-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr 0.7fr; gap: 12px;
      padding: 9px 4px; border-top: 1px solid var(--nb-border-soft, #f0f1f5); font-size: 12.5px; }
    .t-row.t-head { border-top: none; font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .ta-end { text-align: end; }
    .link { border: none; background: none; font-family: inherit; font-size: 12px; font-weight: 700;
      color: var(--nb-primary-600); cursor: pointer; padding: 0; }

    .links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 820px) { .links { grid-template-columns: 1fr; } }
    .lk { text-align: start; font-family: inherit; cursor: pointer; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 13px 15px;
      display: flex; flex-direction: column; gap: 2px; }
    .lk:hover { border-color: var(--nb-primary-400); }
    .lk-t { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .lk-d { font-size: 11px; color: var(--nb-text-muted); }

    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 32px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }

    @media (prefers-reduced-motion: reduce) { .h-fill { transition: none; } }
  `],
})
export class AssetDetailComponent implements OnInit {
  private svc = inject(AssetsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly asset = signal<any | null>(null);
  readonly depreciations = signal<any[]>([]);
  private categories = signal<any[]>([]);
  private locations = signal<any[]>([]);

  readonly cost = computed(() => Number(this.asset()?.acquisition_cost) || 0);
  readonly nbv = computed(() => Number(this.asset()?.book_value) || 0);
  readonly salvage = computed(() => Number(this.asset()?.salvage_value) || 0);
  readonly accum = computed(() => Math.max(this.cost() - this.nbv(), 0));
  readonly valuePct = computed(() => (this.cost() ? Math.max(0, Math.min(100, (this.nbv() / this.cost()) * 100)) : 0));
  readonly agePct = computed(() => {
    const depreciable = Math.max(this.cost() - this.salvage(), 1);
    return Math.min(100, (this.accum() / depreciable) * 100);
  });

  categoryName(): string {
    return this.categories().find((c) => c.id === this.asset()?.category)?.name_ar || '—';
  }
  locationName(): string {
    return this.locations().find((l) => l.id === this.asset()?.location)?.name_ar || '—';
  }
  statusLabel(s: string): string {
    return ({ registered: 'مسجّل — لم يُرسمل', capitalized: 'مرسمل', disposed: 'مستبعد',
      under_maintenance: 'تحت الصيانة', retired: 'مشطوب' } as any)[s] || s;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.svc.getAsset(id).subscribe({
      next: (d: any) => { this.asset.set(d?.data ?? d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getDepreciations({ asset: id, page_size: 200 }).subscribe({
      next: (d) => this.depreciations.set(this.rows(d).filter((x: any) => x.asset === id)),
      error: () => {},
    });
    this.svc.getCategories().subscribe({ next: (d) => this.categories.set(this.rows(d)), error: () => {} });
    this.svc.getLocations().subscribe({ next: (d) => this.locations.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  print() {
    const a = this.asset();
    if (!a) return;
    const cols: ExportColumn[] = [
      { key: 'depreciation_date', label: 'التاريخ' },
      { key: 'depreciation_amount', label: 'قيمة الإهلاك', align: 'end' },
      { key: 'accumulated_depreciation', label: 'المجمّع', align: 'end' },
    ];
    printDoc(
      {
        title: `الأصل ${a.asset_number} — ${a.name_ar || ''}`,
        subtitle: `الفئة: ${this.categoryName()} · الموقع: ${this.locationName()} · `
          + `التكلفة: ${this.cost().toLocaleString('en-US')} · مجمّع الإهلاك: ${this.accum().toLocaleString('en-US')} · `
          + `القيمة الدفترية: ${this.nbv().toLocaleString('en-US')} ر.س`,
        filename: `اصل-${a.asset_number}`,
      },
      cols,
      this.depreciations(),
    );
  }

  go(route: string) { this.router.navigateByUrl(route); }
  back() { this.router.navigateByUrl('/assets/register'); }
}
