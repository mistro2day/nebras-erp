import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../inventory.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface BinNode { id: string; code: string; maxWeight: number; active: boolean; itemCount: number; }
interface AisleNode { id: string; code: string; bins: BinNode[]; }
interface ZoneNode { id: string; code: string; name: string; aisles: AisleNode[]; binCount: number; }

/**
 * هيكل المستودع الداخلي.
 *
 * التوقيع: الشجرة الفعلية للمخزن — منطقة ← ممر ← رف. العنوان التخزيني
 * ليس بياناً وصفياً بل هو ما يقود العامل إلى الصنف؛ لذلك تُعرض الشجرة
 * بمسار كل رف كاملاً كما يُقرأ على اللوحة في المخزن.
 */
@Component({
  selector: 'app-warehouse-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header [title]="wh()?.name_ar || 'المستودع'"
        [subtitle]="'هيكل التخزين الداخلي — المناطق والممرات والرفوف.'">
        <button class="btn ghost" (click)="back()">‹ المستودعات</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل هيكل المستودع…"></nb-loading>
      } @else if (!wh()) {
        <div class="empty-card">تعذّر العثور على هذا المستودع.</div>
      } @else {
        <!-- ملخّص -->
        <section class="summary">
          <div class="s"><span class="s-lbl">الرمز</span><span class="s-val mono">{{ wh()!.code }}</span></div>
          <div class="s"><span class="s-lbl">المناطق</span><span class="s-val">{{ zones().length }}</span></div>
          <div class="s"><span class="s-lbl">الرفوف</span><span class="s-val">{{ totalBins() }}</span></div>
          <div class="s"><span class="s-lbl">أصناف مخزّنة</span><span class="s-val">{{ itemCount() }}</span></div>
        </section>

        <!-- شجرة التخزين -->
        <section class="panel">
          <div class="p-head">
            <div>
              <h3>هيكل التخزين</h3>
              <p>العنوان التخزيني هو ما يقود العامل إلى الصنف: منطقة ← ممر ← رف.</p>
            </div>
            <button class="btn primary sm" (click)="openZone()">＋ منطقة</button>
          </div>

          @if (!zones().length) {
            <div class="empty-tree">
              <p>لا توجد مناطق تخزين في هذا المستودع بعد.</p>
              <p class="hint">ابدأ بمنطقة، ثم أضف إليها ممراً، ثم رفوفاً يُخزَّن عليها فعلياً.</p>
            </div>
          } @else {
            <div class="tree">
              @for (z of zones(); track z.id) {
                <div class="zone">
                  <div class="z-head">
                    <span class="z-code">{{ z.code }}</span>
                    <strong class="z-name">{{ z.name }}</strong>
                    <span class="z-meta">{{ z.aisles.length }} ممر · {{ z.binCount }} رف</span>
                    <button class="add" (click)="openAisle(z.id)">＋ ممر</button>
                  </div>

                  @for (a of z.aisles; track a.id) {
                    <div class="aisle">
                      <div class="a-head">
                        <span class="a-code">{{ a.code }}</span>
                        <span class="a-meta">{{ a.bins.length }} رف</span>
                        <button class="add" (click)="openBin(a.id)">＋ رف</button>
                      </div>
                      @if (a.bins.length) {
                        <div class="bins">
                          @for (b of a.bins; track b.id) {
                            <span class="bin" [class.off]="!b.active" [class.used]="b.itemCount > 0"
                              [title]="b.maxWeight ? ('أقصى وزن ' + b.maxWeight + ' كجم') : ''">
                              {{ b.code }}
                              @if (b.itemCount > 0) { <i class="dot"></i> }
                            </span>
                          }
                        </div>
                      } @else {
                        <p class="no-bins">لا رفوف في هذا الممر بعد.</p>
                      }
                    </div>
                  }
                  @if (!z.aisles.length) { <p class="no-bins in-zone">لا ممرات في هذه المنطقة بعد.</p> }
                </div>
              }
            </div>
            <p class="legend"><i class="dot"></i> رف يحمل أصنافاً حالياً</p>
          }
        </section>
      }

      <!-- نموذج موحّد للمستويات الثلاثة -->
      @if (formKind()) {
        <div class="overlay" (click)="closeForm()">
          <section class="form-card" (click)="$event.stopPropagation()">
            <header class="fc-head">
              <h3>{{ formTitle() }}</h3>
              <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
            </header>
            <div class="fc-body">
              <div class="fields">
                @if (formKind() === 'zone') {
                  <label>
                    <span>اسم المنطقة <i>*</i></span>
                    <input [(ngModel)]="form.name_ar" placeholder="منطقة القرطاسية" />
                  </label>
                }
                <label>
                  <span>الرمز <i>*</i></span>
                  <input [(ngModel)]="form.code" [placeholder]="codeHint()" />
                </label>
                @if (formKind() === 'bin') {
                  <label>
                    <span>أقصى وزن (كجم)</span>
                    <input type="number" min="0" [(ngModel)]="form.max_weight" placeholder="0" />
                  </label>
                }
              </div>
              <p class="fc-note">{{ formNote() }}</p>
              @if (error()) { <p class="err">{{ error() }}</p> }
            </div>
            <footer class="fc-acts">
              <button class="btn ghost" (click)="closeForm()">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'جارٍ الحفظ…' : 'إضافة' }}
              </button>
            </footer>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.sm { padding: 6px 12px; font-size: 12px; }
    .btn:disabled { opacity: .55; cursor: default; }

    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
    @media (max-width: 800px) { .summary { grid-template-columns: repeat(2, 1fr); } }
    .s { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 16px; display: flex; flex-direction: column; gap: 2px; }
    .s-lbl { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .s-val { font-size: 21px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .mono { font-family: ui-monospace, monospace; font-size: 17px; }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; }
    .p-head { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
    .p-head h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .p-head p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }

    /* الشجرة: كل مستوى يزيح لما بعده ليُقرأ العنوان التخزيني كاملاً */
    .tree { display: flex; flex-direction: column; gap: 10px; }
    .zone { border: 1px solid var(--nb-border); border-radius: 10px; overflow: hidden; }
    .z-head { display: flex; align-items: center; gap: 10px; padding: 10px 13px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-border); }
    .z-code { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700;
      background: var(--nb-primary-600); color: #fff; border-radius: 5px; padding: 2px 8px; }
    .z-name { font-size: 13px; font-weight: 700; color: var(--nb-text); flex: 1; }
    .z-meta { font-size: 11px; color: var(--nb-text-muted); }

    .aisle { padding: 9px 13px 9px 13px; padding-inline-start: 26px;
      border-top: 1px solid var(--nb-border-soft, #f0f1f5); }
    .aisle:first-of-type { border-top: none; }
    .a-head { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
    .a-code { font-family: ui-monospace, monospace; font-size: 11.5px; font-weight: 700; color: var(--nb-text); }
    .a-meta { font-size: 11px; color: var(--nb-text-muted); flex: 1; }

    .bins { display: flex; flex-wrap: wrap; gap: 6px; padding-inline-start: 14px; }
    .bin { display: inline-flex; align-items: center; gap: 5px; font-family: ui-monospace, monospace;
      font-size: 11px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 6px; padding: 4px 9px; color: var(--nb-text); }
    .bin.used { border-color: var(--nb-primary-400); background: var(--nb-primary-50, #f5f6ff); }
    .bin.off { opacity: .5; text-decoration: line-through; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--nb-primary-500); display: inline-block; }

    .no-bins { margin: 0; font-size: 11.5px; color: var(--nb-text-muted); padding-inline-start: 14px; }
    .no-bins.in-zone { padding: 10px 13px; padding-inline-start: 26px; }
    .legend { margin: 12px 0 0; font-size: 11px; color: var(--nb-text-muted);
      display: flex; align-items: center; gap: 6px; }

    .add { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 6px;
      font-family: inherit; font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
      cursor: pointer; padding: 3px 9px; }
    .add:hover { color: var(--nb-primary-700); border-color: var(--nb-primary-400); }

    .empty-tree { padding: 30px; text-align: center; }
    .empty-tree p { margin: 0 0 4px; font-size: 13px; color: var(--nb-text); }
    .empty-tree .hint { font-size: 12px; color: var(--nb-text-muted); }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 32px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }

    /* النموذج */
    .overlay { position: fixed; inset: 0; background: rgba(16,20,40,.42); backdrop-filter: blur(2px);
      display: grid; place-items: center; z-index: 60; padding: 20px; }
    .form-card { width: 100%; max-width: 440px; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow: hidden; box-shadow: 0 18px 50px rgba(16,20,40,.22); }
    .fc-head { display: flex; align-items: center; justify-content: space-between;
      padding: 13px 18px; background: var(--nb-primary-50, #f5f6ff);
      border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-note { margin: 12px 0 0; font-size: 11.5px; color: var(--nb-text-muted); }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fields label:only-child { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .fields input:focus { outline: 2px solid var(--nb-primary-400); outline-offset: -1px; border-color: transparent; }
    .err { margin: 10px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class WarehouseDetailComponent implements OnInit {
  private svc = inject(InventoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly wh = signal<any | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formKind = signal<'zone' | 'aisle' | 'bin' | null>(null);
  private parentId = signal<string>('');
  form: any = { name_ar: '', code: '', max_weight: 0 };

  private zonesRaw = signal<any[]>([]);
  private aislesRaw = signal<any[]>([]);
  private binsRaw = signal<any[]>([]);
  private balances = signal<any[]>([]);

  readonly zones = computed<ZoneNode[]>(() => {
    const whId = this.wh()?.id;
    const binUse = new Map<string, number>();
    for (const b of this.balances()) {
      if (b.bin_location) binUse.set(b.bin_location, (binUse.get(b.bin_location) || 0) + 1);
    }
    return this.zonesRaw()
      .filter((z) => z.warehouse === whId)
      .map((z) => {
        const aisles = this.aislesRaw()
          .filter((a) => a.zone === z.id)
          .map((a) => ({
            id: a.id,
            code: a.code,
            bins: this.binsRaw()
              .filter((b) => b.aisle === a.id)
              .map((b) => ({
                id: b.id, code: b.code,
                maxWeight: Number(b.max_weight) || 0,
                active: b.is_active !== false,
                itemCount: binUse.get(b.id) || 0,
              })),
          }));
        return {
          id: z.id, code: z.code, name: z.name_ar || z.name_en,
          aisles,
          binCount: aisles.reduce((s, a) => s + a.bins.length, 0),
        };
      });
  });

  readonly totalBins = computed(() => this.zones().reduce((s, z) => s + z.binCount, 0));
  readonly itemCount = computed(
    () => this.balances().filter((b) => b.warehouse === this.wh()?.id).length,
  );

  formTitle(): string {
    return { zone: 'منطقة تخزين جديدة', aisle: 'ممر جديد', bin: 'رف جديد' }[this.formKind()!] || '';
  }
  codeHint(): string {
    return { zone: 'A', aisle: 'A-01', bin: 'A-01-01' }[this.formKind()!] || '';
  }
  formNote(): string {
    return {
      zone: 'المنطقة أكبر تقسيم داخل المستودع — مثل «منطقة القرطاسية».',
      aisle: 'الممر صفّ داخل المنطقة، ويحمل الرفوف.',
      bin: 'الرف هو الموقع الفعلي الذي يُخزَّن عليه الصنف، وإليه تُسند الأرصدة.',
    }[this.formKind()!] || '';
  }

  openZone() { this.formKind.set('zone'); this.parentId.set(''); this.reset(); }
  openAisle(zoneId: string) { this.formKind.set('aisle'); this.parentId.set(zoneId); this.reset(); }
  openBin(aisleId: string) { this.formKind.set('bin'); this.parentId.set(aisleId); this.reset(); }
  private reset() { this.form = { name_ar: '', code: '', max_weight: 0 }; this.error.set(''); }
  closeForm() { this.formKind.set(null); this.error.set(''); }

  save() {
    const kind = this.formKind();
    const f = this.form;
    if (!f.code?.trim() || (kind === 'zone' && !f.name_ar?.trim())) {
      this.error.set(kind === 'zone' ? 'الاسم والرمز مطلوبان.' : 'الرمز مطلوب.');
      return;
    }
    this.saving.set(true);
    this.error.set('');

    let req;
    if (kind === 'zone') {
      req = this.svc.createZone({
        warehouse: this.wh()!.id, name_ar: f.name_ar.trim(),
        name_en: f.code.trim(), code: f.code.trim(),
      });
    } else if (kind === 'aisle') {
      req = this.svc.createAisle({ zone: this.parentId(), code: f.code.trim() });
    } else {
      req = this.svc.createBin({
        aisle: this.parentId(), code: f.code.trim(),
        max_weight: Number(f.max_weight) || 0, is_active: true,
      });
    }

    req.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر الحفظ.'));
      },
    });
  }

  ngOnInit() { this.load(); }

  load() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.loading.set(true);
    this.svc.getWarehouses().subscribe({
      next: (d) => {
        this.wh.set(this.rows(d).find((w: any) => w.id === id) || null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.svc.getZones().subscribe({ next: (d) => this.zonesRaw.set(this.rows(d)), error: () => {} });
    this.svc.getAisles().subscribe({ next: (d) => this.aislesRaw.set(this.rows(d)), error: () => {} });
    this.svc.getBins().subscribe({ next: (d) => this.binsRaw.set(this.rows(d)), error: () => {} });
    this.svc.getBalances().subscribe({ next: (d) => this.balances.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/inventory/warehouses'); }
}
