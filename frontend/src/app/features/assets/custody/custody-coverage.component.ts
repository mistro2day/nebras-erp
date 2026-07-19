import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AssetsService } from '../assets.service';
import { environment } from '../../../../environments/environment';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

interface CoverageRow {
  id: string;
  kind: 'warranty' | 'insurance';
  assetName: string;
  assetNumber: string;
  ref: string;
  provider: string;
  end: string;
  daysLeft: number;
  amount: number;
  state: 'expired' | 'soon' | 'active';
}

/**
 * العهد والتغطية.
 *
 * التوقيع: الأفق الزمني — الضمان والتأمين قيمتهما في سريانهما، وتغطية
 * انتهت دون انتباه تعني إصلاحاً يُدفع من الجيب. لذلك يُرتّب العرض بما
 * يقترب انتهاؤه لا بتاريخ الإنشاء، ويُبرز ما انقضى وما يوشك.
 */
@Component({
  selector: 'app-custody-coverage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="العهد والتغطية" subtitle="من يحمل كل أصل، وحالة ضماناته ووثائق تأمينه.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <!-- ما انقضى أو يوشك: أول ما يجب أن يُرى -->
      @if (!loading() && (expiredCount() > 0 || soonCount() > 0)) {
        <div class="alert" [class.danger]="expiredCount() > 0">
          <span class="a-ic">{{ expiredCount() > 0 ? '⚠︎' : '◔' }}</span>
          <span class="a-body">
            @if (expiredCount() > 0) {
              <strong>{{ expiredCount() }}</strong> تغطية منتهية
              @if (soonCount() > 0) { و<strong>{{ soonCount() }}</strong> توشك على الانتهاء }
            } @else {
              <strong>{{ soonCount() }}</strong> تغطية تنتهي خلال 60 يوماً
            }
            <span class="a-hint">التغطية المنتهية تعني إصلاحاً يُدفع من الموازنة التشغيلية.</span>
          </span>
        </div>
      }

      <div class="tabs">
        <button [class.on]="tab()==='custody'" (click)="tab.set('custody')">العهد ({{ activeAssignments().length }})</button>
        <button [class.on]="tab()==='coverage'" (click)="tab.set('coverage')">الضمان والتأمين ({{ coverage().length }})</button>
      </div>

      <!-- العهد -->
      @if (tab() === 'custody') {
        <section class="form-card">
          <header class="fc-head"><h3>تسليم عهدة</h3></header>
          <div class="fc-body">
            <div class="fields">
              <label>
                <span>الأصل <i>*</i></span>
                <select [(ngModel)]="asg.asset">
                  <option value="">اختر…</option>
                  @for (a of assignableAssets(); track a.id) {
                    <option [value]="a.id">{{ a.name_ar }} ({{ a.asset_number }})</option>
                  }
                </select>
              </label>
              <label>
                <span>الموظف المستلم <i>*</i></span>
                <select [(ngModel)]="asg.user">
                  <option value="">اختر…</option>
                  @for (e of employees(); track e.id) {
                    <option [value]="e.id">{{ e.full_name_ar || e.full_name_en }}</option>
                  }
                </select>
              </label>
              <label class="wide">
                <span>ملاحظات</span>
                <input [(ngModel)]="asg.notes" placeholder="حالة الأصل عند التسليم، ملحقاته…" />
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn primary" [disabled]="saving()" (click)="saveAssignment()">
              {{ saving() ? 'جارٍ التسليم…' : 'تسليم العهدة' }}
            </button>
          </footer>
        </section>

        <section class="card">
          <div class="row head">
            <span>الأصل</span><span>المستلم</span><span>تاريخ التسليم</span>
            <span class="ta-end">المدة</span><span class="ta-end">إجراء</span>
          </div>
          @if (loading()) {
            <nb-loading message="جارٍ تحميل العهد…"></nb-loading>
          } @else {
            @for (a of activeAssignments(); track a.id) {
              <div class="row">
                <span><strong>{{ a.assetName }}</strong> <span class="muted mono">{{ a.assetNumber }}</span></span>
                <span class="muted">{{ a.holder }}</span>
                <span class="muted mono">{{ a.assigned_date }}</span>
                <span class="ta-end mono muted">{{ a.days }} يوماً</span>
                <span class="ta-end">
                  <button class="act" (click)="returnAsset(a)">استلام الأصل</button>
                </span>
              </div>
            }
            @if (!activeAssignments().length) { <div class="empty">لا توجد عهد قائمة حالياً.</div> }
          }
        </section>

        @if (returnedAssignments().length) {
          <h3 class="sec-t">عهد مُسترجعة</h3>
          <section class="card">
            <div class="row head">
              <span>الأصل</span><span>المستلم</span><span>التسليم</span><span class="ta-end">الإرجاع</span><span></span>
            </div>
            @for (a of returnedAssignments(); track a.id) {
              <div class="row muted-row">
                <span>{{ a.assetName }}</span>
                <span class="muted">{{ a.holder }}</span>
                <span class="muted mono">{{ a.assigned_date }}</span>
                <span class="ta-end mono muted">{{ a.return_date }}</span>
                <span></span>
              </div>
            }
          </section>
        }
      }

      <!-- الضمان والتأمين -->
      @if (tab() === 'coverage') {
        <section class="form-card">
          <header class="fc-head">
            <h3>إضافة تغطية</h3>
            <div class="kind-pick">
              <button [class.on]="cov.kind==='warranty'" (click)="cov.kind='warranty'">ضمان</button>
              <button [class.on]="cov.kind==='insurance'" (click)="cov.kind='insurance'">تأمين</button>
            </div>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label>
                <span>الأصل <i>*</i></span>
                <select [(ngModel)]="cov.asset">
                  <option value="">اختر…</option>
                  @for (a of assets(); track a.id) {
                    <option [value]="a.id">{{ a.name_ar }} ({{ a.asset_number }})</option>
                  }
                </select>
              </label>
              <label>
                <span>{{ cov.kind === 'warranty' ? 'رقم وثيقة الضمان' : 'رقم بوليصة التأمين' }} <i>*</i></span>
                <input [(ngModel)]="cov.ref" [placeholder]="cov.kind === 'warranty' ? 'W-2026-001' : 'P-2026-001'" />
              </label>
              <label>
                <span>{{ cov.kind === 'warranty' ? 'الجهة المانحة' : 'شركة التأمين' }} <i>*</i></span>
                <input [(ngModel)]="cov.provider" placeholder="اسم الجهة" />
              </label>
              <label>
                <span>تاريخ البدء <i>*</i></span>
                <input type="date" [(ngModel)]="cov.start" />
              </label>
              <label>
                <span>تاريخ الانتهاء <i>*</i></span>
                <input type="date" [(ngModel)]="cov.end" />
              </label>
              @if (cov.kind === 'insurance') {
                <label>
                  <span>قسط التأمين <i>*</i></span>
                  <input type="number" min="0" [(ngModel)]="cov.premium" placeholder="0.00" />
                </label>
                <label>
                  <span>مبلغ التغطية <i>*</i></span>
                  <input type="number" min="0" [(ngModel)]="cov.coverage" placeholder="0.00" />
                </label>
              } @else {
                <label class="wide">
                  <span>تفاصيل التغطية</span>
                  <input [(ngModel)]="cov.details" placeholder="ما يشمله الضمان" />
                </label>
              }
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn primary" [disabled]="saving()" (click)="saveCoverage()">
              {{ saving() ? 'جارٍ الحفظ…' : 'إضافة التغطية' }}
            </button>
          </footer>
        </section>

        <section class="card">
          <div class="row cov head">
            <span>الأصل</span><span>النوع</span><span>الجهة</span>
            <span class="ta-end">ينتهي</span><span class="ta-end">المتبقي</span><span class="ta-end">التغطية</span>
          </div>
          @if (loading()) {
            <nb-loading message="جارٍ تحميل التغطيات…"></nb-loading>
          } @else {
            @for (r of coverage(); track r.kind + r.id) {
              <div class="row cov" [class.expired]="r.state==='expired'" [class.soon]="r.state==='soon'">
                <span><strong>{{ r.assetName }}</strong> <span class="muted mono">{{ r.assetNumber }}</span></span>
                <span>
                  <span class="badge" [class.wr]="r.kind==='warranty'" [class.ins]="r.kind==='insurance'">
                    {{ r.kind === 'warranty' ? 'ضمان' : 'تأمين' }}
                  </span>
                  <span class="muted mono">{{ r.ref }}</span>
                </span>
                <span class="muted">{{ r.provider }}</span>
                <span class="ta-end mono muted">{{ r.end }}</span>
                <span class="ta-end">
                  @if (r.state === 'expired') { <span class="tag exp">انتهت</span> }
                  @else if (r.state === 'soon') { <span class="tag soon">{{ r.daysLeft }} يوماً</span> }
                  @else { <span class="tag ok">{{ r.daysLeft }} يوماً</span> }
                </span>
                <span class="ta-end mono">{{ r.amount ? (r.amount | number:'1.0-0') : '—' }}</span>
              </div>
            }
            @if (!coverage().length) { <div class="empty">لا توجد ضمانات أو وثائق تأمين مسجّلة.</div> }
          }
        </section>
      }
    </div>
  `,
  styleUrl: '../../procurement/shared/procurement-table.scss',
  styles: [`
    .row { grid-template-columns: 2fr 1.5fr 1.1fr 0.9fr 1fr; }
    .row.cov { grid-template-columns: 1.9fr 1.3fr 1.2fr 1fr 0.9fr 0.9fr; }
    .row.expired { background: #fef2f2; }
    .row.soon { background: #fffdf8; }
    .muted-row { opacity: .72; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }
    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 7px;
      font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--nb-text);
      cursor: pointer; padding: 5px 11px; }
    .act:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }

    .alert { display: flex; align-items: center; gap: 13px; background: #fffaf0; border: 1px solid #fde9c8;
      border-inline-start: 4px solid #F59E0B; border-radius: var(--nb-radius-card);
      padding: 13px 16px; margin-bottom: 14px; }
    .alert.danger { background: #fef2f2; border-color: #fecaca; border-inline-start-color: #DC2626; }
    .a-ic { font-size: 17px; color: #B45309; }
    .alert.danger .a-ic { color: #B91C1C; }
    .a-body { font-size: 13px; color: var(--nb-text); }
    .a-body strong { font-weight: 800; }
    .a-hint { color: var(--nb-text-muted); margin-inline-start: 6px; }

    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tabs button { font-family: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 7px 16px; }
    .tabs button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .kind-pick { display: flex; gap: 4px; }
    .kind-pick button { font-family: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 4px 13px; }
    .kind-pick button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .fc-body { padding: 16px 18px; }
    .fc-acts { display: flex; justify-content: flex-end; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 900px) { .fields { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }
    .fields input:focus, .fields select:focus { outline: 2px solid var(--nb-primary-400);
      outline-offset: -1px; border-color: transparent; }

    .badge.wr { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.ins { background: #f0fdf4; color: #15803D; }
    .tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; display: inline-block; }
    .tag.exp { background: #fef2f2; color: #B91C1C; }
    .tag.soon { background: #fffaf0; color: #B45309; }
    .tag.ok { background: #f0fdf4; color: #15803D; }

    .sec-t { margin: 18px 0 8px; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
  `],
})
export class CustodyCoverageComponent implements OnInit {
  private svc = inject(AssetsService);
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly tab = signal<'custody' | 'coverage'>('custody');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly assets = signal<any[]>([]);
  readonly employees = signal<any[]>([]);
  private assignments = signal<any[]>([]);
  private warranties = signal<any[]>([]);
  private insurances = signal<any[]>([]);

  asg: any = { asset: '', user: '', notes: '' };
  cov: any = { kind: 'warranty', asset: '', ref: '', provider: '', start: '', end: '', premium: null, coverage: null, details: '' };

  private assetName(id: string): string {
    const a = this.assets().find((x) => x.id === id);
    return a?.name_ar || a?.name_en || '—';
  }
  private assetNumber(id: string): string {
    return this.assets().find((x) => x.id === id)?.asset_number || '';
  }
  private holderName(id: string): string {
    const e = this.employees().find((x) => x.id === id);
    return e?.full_name_ar || e?.full_name_en || 'غير معروف';
  }

  /** الأصل المسلَّم فعلاً لا يُسلَّم مرتين — تُستبعد الأصول ذات العهدة القائمة. */
  readonly assignableAssets = computed(() => {
    const held = new Set(this.assignments().filter((a) => !a.return_date).map((a) => a.asset));
    return this.assets().filter((a) => a.status !== 'disposed' && !held.has(a.id));
  });

  private daysBetween(dateStr: string): number {
    if (!dateStr) return 0;
    const d = new Date(dateStr).getTime();
    return Math.round((d - Date.now()) / 86400000);
  }

  readonly activeAssignments = computed(() =>
    this.assignments()
      .filter((a) => !a.return_date)
      .map((a) => ({
        ...a,
        assetName: this.assetName(a.asset),
        assetNumber: this.assetNumber(a.asset),
        holder: this.holderName(a.assigned_to_user_id),
        days: Math.max(0, -this.daysBetween(a.assigned_date)),
      })),
  );

  readonly returnedAssignments = computed(() =>
    this.assignments()
      .filter((a) => !!a.return_date)
      .map((a) => ({
        ...a,
        assetName: this.assetName(a.asset),
        holder: this.holderName(a.assigned_to_user_id),
      })),
  );

  /** الضمان والتأمين صفّان من جنس واحد: تغطية لها أفق زمني. */
  readonly coverage = computed<CoverageRow[]>(() => {
    const rows: CoverageRow[] = [];
    const push = (r: any, kind: 'warranty' | 'insurance') => {
      const daysLeft = this.daysBetween(r.end_date);
      rows.push({
        id: r.id, kind,
        assetName: this.assetName(r.asset),
        assetNumber: this.assetNumber(r.asset),
        ref: kind === 'warranty' ? r.warranty_number : r.policy_number,
        provider: r.provider,
        end: r.end_date,
        daysLeft,
        amount: kind === 'insurance' ? Number(r.coverage_amount) || 0 : 0,
        state: daysLeft < 0 ? 'expired' : daysLeft <= 60 ? 'soon' : 'active',
      });
    };
    this.warranties().forEach((w) => push(w, 'warranty'));
    this.insurances().forEach((i) => push(i, 'insurance'));
    // الأقرب انتهاءً أولاً — المنتهي ثم الموشك
    return rows.sort((a, b) => a.daysLeft - b.daysLeft);
  });

  readonly expiredCount = computed(() => this.coverage().filter((r) => r.state === 'expired').length);
  readonly soonCount = computed(() => this.coverage().filter((r) => r.state === 'soon').length);

  saveAssignment() {
    if (!this.asg.asset || !this.asg.user) { this.error.set('اختر الأصل والموظف المستلم.'); return; }
    this.saving.set(true);
    this.error.set('');
    this.svc.createAssignment({
      asset: this.asg.asset,
      assigned_to_user_id: this.asg.user,
      notes: this.asg.notes?.trim() || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.asg = { asset: '', user: '', notes: '' };
        this.load();
      },
      error: (e: any) => this.fail(e, 'تعذّر تسليم العهدة.'),
    });
  }

  returnAsset(a: any) {
    const today = new Date().toISOString().slice(0, 10);
    this.svc.returnAssignment(a.id, today).subscribe({
      next: () => this.load(),
      error: (e: any) => this.fail(e, 'تعذّر تسجيل الإرجاع.'),
    });
  }

  saveCoverage() {
    const c = this.cov;
    if (!c.asset || !c.ref?.trim() || !c.provider?.trim() || !c.start || !c.end) {
      this.error.set('الأصل والرقم والجهة وتاريخا البدء والانتهاء حقول مطلوبة.');
      return;
    }
    if (c.end <= c.start) { this.error.set('تاريخ الانتهاء يجب أن يلي تاريخ البدء.'); return; }

    this.saving.set(true);
    this.error.set('');
    const done = () => {
      this.saving.set(false);
      this.cov = { kind: c.kind, asset: '', ref: '', provider: '', start: '', end: '', premium: null, coverage: null, details: '' };
      this.load();
    };

    if (c.kind === 'warranty') {
      this.svc.createWarranty({
        asset: c.asset, warranty_number: c.ref.trim(), provider: c.provider.trim(),
        start_date: c.start, end_date: c.end, coverage_details: c.details?.trim() || null,
      }).subscribe({ next: done, error: (e: any) => this.fail(e, 'تعذّر حفظ الضمان.') });
    } else {
      if (!c.premium || !c.coverage) { this.saving.set(false); this.error.set('القسط ومبلغ التغطية مطلوبان.'); return; }
      this.svc.createInsurance({
        asset: c.asset, policy_number: c.ref.trim(), provider: c.provider.trim(),
        premium: c.premium, coverage_amount: c.coverage,
        start_date: c.start, end_date: c.end,
      }).subscribe({ next: done, error: (e: any) => this.fail(e, 'تعذّر حفظ وثيقة التأمين.') });
    }
  }

  private fail(e: any, fallback: string) {
    this.saving.set(false);
    const d = e?.details?.error ?? e?.details;
    this.error.set(typeof d === 'string' ? d : (e?.message || fallback));
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAssignments().subscribe({
      next: (d) => { this.assignments.set(this.rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getAssets().subscribe({ next: (d) => this.assets.set(this.rows(d)), error: () => {} });
    this.svc.getWarranties().subscribe({ next: (d) => this.warranties.set(this.rows(d)), error: () => {} });
    this.svc.getInsurances().subscribe({ next: (d) => this.insurances.set(this.rows(d)), error: () => {} });
    // الموظفون مصدرهم موديول شؤون الموظفين — تُقرأ أسماؤهم للعرض فقط
    this.http.get<any>(`${environment.apiUrl}employees/employees/`, { params: { page_size: 300 } as any })
      .subscribe({ next: (d) => this.employees.set(this.rows(d)), error: () => {} });
  }

  private rows(d: any): any[] { return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []); }

  back() { this.router.navigateByUrl('/assets/dashboard'); }
}
