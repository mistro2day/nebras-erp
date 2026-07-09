import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/**
 * السنوات الدراسية — وحدة عاملة (Nebras OS) مربوطة بـ academics/academic-years/.
 * إضافة/حذف/بحث حقيقي. السياق السوداني: العام الدراسي يمتد عادةً من يوليو حتى مارس/أبريل.
 */
@Component({
  selector: 'app-academic-years',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="السنوات الدراسية" subtitle="إدارة الأعوام الدراسية وفترات التسجيل والسنة النشطة.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())">{{ adding() ? 'إغلاق' : 'إضافة عام دراسي' }}</button>
      </nb-page-header>

      @if (adding()) {
        <nb-panel title="عام دراسي جديد" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>الاسم</label><input [(ngModel)]="f.name" placeholder="مثال: 2024/2025" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="AY-2024" /></div>
            <div class="fld req"><label>بداية العام</label><nb-datepicker [(value)]="f.start_date" ariaLabel="بداية العام"></nb-datepicker></div>
            <div class="fld req"><label>نهاية العام</label><nb-datepicker [(value)]="f.end_date" ariaLabel="نهاية العام"></nb-datepicker></div>
            <div class="fld"><label>الحالة</label>
              <select [(ngModel)]="f.status">
                <option value="draft">مسودة</option><option value="active">نشط</option>
                <option value="completed">مكتمل</option><option value="archived">مؤرشف</option>
              </select>
            </div>
            <div class="fld"><label>&nbsp;</label>
              <label class="chk"><input type="checkbox" [(ngModel)]="f.current_flag" /> السنة النشطة الحالية</label>
            </div>
            <div class="form-actions">
              <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
            </div>
          </div>
          @if (error()) { <p class="hint" style="color:var(--nb-danger)">{{ error() }}</p> }
        </nb-panel>
      }

      <!-- مؤشرات سريعة -->
      <div class="stats-grid">
        <div class="metric-card total">
          <span class="m-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </span>
          <span class="m-body">
            <span class="label">إجمالي السنوات</span>
            <span class="value">{{ rows().length }}</span>
          </span>
        </div>
        <div class="metric-card success">
          <span class="m-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
          </span>
          <span class="m-body">
            <span class="label">السنوات النشطة</span>
            <span class="value success">{{ countBy('active') }}</span>
          </span>
        </div>
        <div class="metric-card info">
          <span class="m-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </span>
          <span class="m-body">
            <span class="label">مسودّات</span>
            <span class="value info">{{ countBy('draft') }}</span>
          </span>
        </div>
        <div class="metric-card neutral">
          <span class="m-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
          </span>
          <span class="m-body">
            <span class="label">مكتملة / مؤرشفة</span>
            <span class="value">{{ countBy('completed') + countBy('archived') }}</span>
          </span>
        </div>
      </div>

      <!-- بطاقة السنة النشطة الحالية -->
      @if (currentYear(); as cy) {
        <div class="hero">
          <div class="hero-glow"></div>
          <div class="hero-main">
            <span class="hero-badge">السنة النشطة الحالية</span>
            <h2 class="hero-title">{{ cy.name }}</h2>
            <span class="hero-code mono">{{ cy.code }}</span>
          </div>
          <div class="hero-dates">
            <div class="hero-date">
              <span class="hd-label">بداية العام</span>
              <span class="hd-val mono">{{ cy.start_date }}</span>
            </div>
            <span class="hero-arrow">←</span>
            <div class="hero-date">
              <span class="hd-label">نهاية العام</span>
              <span class="hd-val mono">{{ cy.end_date }}</span>
            </div>
            @if (cy.registration_start || cy.registration_end) {
              <div class="hero-date reg">
                <span class="hd-label">فترة التسجيل</span>
                <span class="hd-val mono">{{ cy.registration_start || '—' }} — {{ cy.registration_end || '—' }}</span>
              </div>
            }
          </div>
        </div>
      }

      <div class="toolbar">
        <div class="search"><input [(ngModel)]="q" placeholder="بحث بالاسم أو الرمز…" /></div>
      </div>

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head" style="grid-template-columns:1.4fr 1fr 1fr 1fr 1fr 0.9fr 0.8fr">
            <span>الاسم</span><span>الرمز</span><span>البداية</span><span>النهاية</span><span>الحالة</span><span>النشطة</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (y of filtered(); track y.id) {
              <div class="tbl-row" style="grid-template-columns:1.4fr 1fr 1fr 1fr 1fr 0.9fr 0.8fr">
                <span class="strong">{{ y.name }}</span>
                <span class="mono">{{ y.code }}</span>
                <span class="mono">{{ y.start_date }}</span>
                <span class="mono">{{ y.end_date }}</span>
                <span><span [class]="badge(y.status)">{{ statusText(y.status) }}</span></span>
                <span>{{ y.current_flag ? 'نعم' : '—' }}</span>
                <span class="row-actions"><button class="nb-btn-danger sm" (click)="remove(y)">حذف</button></span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد سنوات دراسية. أضِف عامًا دراسيًا للبدء.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES + `
    .chk { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--nb-text); height:36px; }
    .chk input { width:16px; height:16px; accent-color: var(--nb-primary-600); }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .metric-card {
      position: relative; overflow: hidden;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
      transition: transform .2s cubic-bezier(0.4,0,0.2,1), box-shadow .2s, border-color .2s;
    }
    .metric-card:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,.08); border-color: var(--nb-border-soft); }
    /* شريط لوني علوي مميّز لكل بطاقة */
    .metric-card::before { content: ''; position: absolute; inset-block-start: 0; inset-inline: 0; height: 3px; background: var(--nb-text-faint); }
    .metric-card.total::before   { background: var(--nb-primary-500); }
    .metric-card.success::before { background: var(--nb-success); }
    .metric-card.info::before    { background: var(--nb-info); }
    .metric-card.neutral::before { background: var(--nb-text-muted); }
    .m-icon {
      flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: var(--nb-surface-raised); color: var(--nb-text-muted);
    }
    .m-icon svg { width: 22px; height: 22px; }
    .metric-card.total .m-icon   { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .metric-card.success .m-icon { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .metric-card.info .m-icon    { background: rgba(0,122,255,.12); color: var(--nb-info); }
    .metric-card.neutral .m-icon { background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .m-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .metric-card .label { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 500; }
    .metric-card .value { font-size: 28px; font-weight: 800; line-height: 1.1; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .metric-card .value.success { color: var(--nb-success); }
    .metric-card .value.info { color: var(--nb-info); }
    .hero { position: relative; overflow: hidden; background: linear-gradient(135deg, var(--nb-primary-600), var(--nb-primary-500)); border-radius: var(--nb-radius-card); padding: 20px 22px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; box-shadow: 0 8px 24px rgba(0,0,0,.10); }
    .hero-glow { position: absolute; inset-inline-start: -60px; top: -60px; width: 200px; height: 200px; background: rgba(255,255,255,.14); border-radius: 50%; filter: blur(8px); }
    .hero-main { position: relative; display: flex; flex-direction: column; gap: 4px; color: #fff; }
    .hero-badge { font-size: 11px; font-weight: 700; background: rgba(255,255,255,.22); padding: 3px 10px; border-radius: 999px; width: fit-content; }
    .hero-title { margin: 4px 0 0; font-size: 22px; font-weight: 800; color: #fff; }
    .hero-code { font-size: 12px; color: rgba(255,255,255,.85); }
    .hero-dates { position: relative; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .hero-date { display: flex; flex-direction: column; gap: 3px; background: rgba(255,255,255,.14); padding: 8px 14px; border-radius: 10px; }
    .hero-date.reg { background: rgba(255,255,255,.20); }
    .hd-label { font-size: 10.5px; color: rgba(255,255,255,.82); }
    .hd-val { font-size: 13px; font-weight: 700; color: #fff; }
    .hero-arrow { color: rgba(255,255,255,.7); font-size: 18px; }
  `],
})
export class AcademicYearsComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');
  q = '';

  f = { name: '', code: '', start_date: '', end_date: '', status: 'draft', current_flag: false };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    return this.rows().filter((y) => !s || `${y.name} ${y.code}`.toLowerCase().includes(s));
  });

  readonly currentYear = computed(() => this.rows().find((y) => y.current_flag) ?? null);
  countBy(status: string): number { return this.rows().filter((y) => y.status === status).length; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getAcademicYears().subscribe({
      next: (res) => { this.rows.set(pickList(res)); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  valid(): boolean { return !!this.f['name'] && !!this.f['code'] && !!this.f['start_date'] && !!this.f['end_date']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createAcademicYear(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { name: '', code: '', start_date: '', end_date: '', status: 'draft', current_flag: false }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || e?.error?.detail || 'تعذّر الحفظ (تحقق من عدم تداخل التواريخ).'); },
    });
  }

  remove(y: any): void {
    const data: ConfirmDialogData = { title: 'حذف العام الدراسي', message: `حذف «${y.name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteAcademicYear(y.id).subscribe({ next: () => this.load() });
    });
  }

  badge(s: string): string { return { active: 'nb-badge-success', draft: 'nb-badge-neutral', completed: 'nb-badge-info', archived: 'nb-badge-neutral' }[s] || 'nb-badge-neutral'; }
  statusText(s: string): string { return { active: 'نشط', draft: 'مسودة', completed: 'مكتمل', archived: 'مؤرشف' }[s] || s; }
}
