import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

type SortKey = 'name' | 'code' | 'order' | 'passing_percentage' | 'max_capacity';

/**
 * الصفوف الدراسية — عرض مجمّع قابل للطي حسب المرحلة، مع بحث وفلترة وفرز،
 * وصفوف قابلة للتوسّع تُظهر الشعب المرتبطة بكل صف. (Nebras OS / academics)
 */
@Component({
  selector: 'app-academic-grades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('220ms cubic-bezier(0.4,0,0.2,1)', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('180ms cubic-bezier(0.4,0,0.2,1)', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الصفوف الدراسية" subtitle="الصفوف داخل كل مرحلة تعليمية مع الطاقة الاستيعابية ونسبة النجاح والشعب المرتبطة.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())" [disabled]="stages().length === 0">{{ adding() ? 'إغلاق' : 'إضافة صف' }}</button>
      </nb-page-header>

      @if (stages().length === 0 && !loading()) {
        <nb-panel style="margin-bottom:16px"><p class="hint">لا توجد مراحل تعليمية بعد. أنشئ المراحل أولًا من صفحة «المراحل التعليمية».</p></nb-panel>
      }

      @if (adding()) {
        <nb-panel title="صف جديد" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>المرحلة</label>
              <select [(ngModel)]="f.stage"><option value="">اختر…</option>
                @for (s of stages(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
              </select>
            </div>
            <div class="fld req"><label>اسم الصف</label><input [(ngModel)]="f.name" placeholder="مثال: الصف الأول أساس" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="G1" /></div>
            <div class="fld"><label>الترتيب</label><input type="number" min="1" [(ngModel)]="f.order" /></div>
            <div class="fld"><label>نسبة النجاح %</label><input type="number" min="0" max="100" [(ngModel)]="f.passing_percentage" /></div>
            <div class="fld"><label>الطاقة الاستيعابية</label><input type="number" min="0" [(ngModel)]="f.max_capacity" /></div>
            <div class="form-actions">
              <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
            </div>
          </div>
          @if (error()) { <p class="hint" style="color:var(--nb-danger)">{{ error() }}</p> }
        </nb-panel>
      }

      <!-- شريط الأدوات: بحث + فلترة المرحلة + طي/فتح الكل -->
      <div class="toolbar">
        <div class="search">
          <svg class="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input [(ngModel)]="q" (ngModelChange)="onSearch()" placeholder="بحث بالاسم أو الرمز…" />
        </div>
        <div class="field">
          <select [ngModel]="stageFilterSig()" (ngModelChange)="stageFilterSig.set($event)">
            <option value="">كل المراحل</option>
            @for (s of stages(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
          </select>
        </div>
        <button class="nb-btn-ghost sm" (click)="toggleAll()">{{ allExpanded() ? 'طيّ الكل' : 'فتح الكل' }}</button>
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل الصفوف والشعب…"></nb-loading>
      } @else if (groups().length === 0) {
        <nb-panel><p class="hint">لا توجد صفوف مطابقة للبحث.</p></nb-panel>
      } @else {
        <!-- مجموعات المراحل القابلة للطي -->
        @for (grp of groups(); track grp.stageId) {
          <div class="stage-group">
            <button class="stage-head" (click)="toggleStage(grp.stageId)" [class.open]="!isStageCollapsed(grp.stageId)">
              <span class="chev" [class.rot]="!isStageCollapsed(grp.stageId)">▸</span>
              <span class="stage-name">{{ grp.stageName }}</span>
              <span class="stage-count">{{ grp.grades.length }} صف</span>
              <span class="stage-sum">{{ totalSections(grp) }} شعبة · سعة {{ totalCapacity(grp) }}</span>
            </button>

            @if (!isStageCollapsed(grp.stageId)) {
              <div class="stage-body" @expand>
                <div class="tbl">
                  <!-- رأس الجدول القابل للفرز -->
                  <div class="tbl-head grid7">
                    <span></span>
                    <button class="th" (click)="sortBy('name')">الصف {{ sortArrow('name') }}</button>
                    <button class="th" (click)="sortBy('code')">الرمز {{ sortArrow('code') }}</button>
                    <button class="th" (click)="sortBy('order')">الترتيب {{ sortArrow('order') }}</button>
                    <button class="th" (click)="sortBy('passing_percentage')">نسبة النجاح {{ sortArrow('passing_percentage') }}</button>
                    <button class="th" (click)="sortBy('max_capacity')">السعة {{ sortArrow('max_capacity') }}</button>
                    <span class="ta-end">إجراءات</span>
                  </div>

                  @for (g of grp.grades; track g.id) {
                    <div class="grade-row grid7" [class.expanded]="isExpanded(g.id)" (click)="toggleExpand(g.id)">
                      <span class="chev-cell"><span class="chev" [class.rot]="isExpanded(g.id)">▸</span></span>
                      <span class="strong">{{ g.name }}</span>
                      <span><span class="code-pill mono">{{ g.code }}</span></span>
                      <span class="mono">{{ g.order }}</span>
                      <span class="mono">{{ g.passing_percentage }}%</span>
                      <span class="cap-cell">
                        <span class="mono">{{ sectionsOf(g.id).length }}/{{ g.max_capacity }}</span>
                        <span class="mini-bar"><span class="mini-fill" [style.width.%]="fillPct(g)"></span></span>
                      </span>
                      <span class="row-actions" (click)="$event.stopPropagation()">
                        <button class="nb-btn-danger sm" (click)="remove(g)">حذف</button>
                      </span>
                    </div>

                    @if (isExpanded(g.id)) {
                      <div class="sections-panel" @expand (click)="$event.stopPropagation()">
                        <div class="sp-head">
                          <span class="sp-title">الشعب المرتبطة بـ «{{ g.name }}»</span>
                          <span class="sp-count">{{ sectionsOf(g.id).length }} شعبة</span>
                        </div>
                        @if (sectionsOf(g.id).length === 0) {
                          <div class="sp-empty">لا توجد شعب لهذا الصف بعد. أضِفها من صفحة «الشعب الدراسية».</div>
                        } @else {
                          <div class="sec-grid">
                            @for (sec of sectionsOf(g.id); track sec.id) {
                              <div class="sec-card">
                                <div class="sec-top">
                                  <span class="dot" [class]="sec.gender"></span>
                                  <span class="sec-name">{{ sec.name }}</span>
                                  <span class="code-pill mono sm">{{ sec.code }}</span>
                                </div>
                                <div class="sec-meta">
                                  <span class="sec-tag" [class]="sec.gender">{{ genderText(sec.gender) }}</span>
                                  <span class="sec-cap mono">السعة {{ sec.capacity }}</span>
                                  <span class="sec-shift">{{ sec.academic_shift }}</span>
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES + `
    .toolbar { align-items: center; }
    .search { position: relative; }
    .s-icon { width: 16px; height: 16px; color: var(--nb-text-faint); flex-shrink: 0; }
    .field select { height: 34px; min-width: 170px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }

    .stage-group { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      overflow: hidden; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.03); }
    .stage-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer;
      background: var(--nb-surface-raised); border: none; border-bottom: 1px solid transparent; font-family: var(--nb-font-family);
      text-align: right; transition: background .15s; }
    .stage-head:hover { background: var(--nb-primary-50); }
    .stage-head.open { border-bottom-color: var(--nb-border-soft); }
    .chev { display: inline-block; font-size: 12px; color: var(--nb-text-muted); transition: transform .2s cubic-bezier(0.4,0,0.2,1); }
    .chev.rot { transform: rotate(-90deg); }
    .stage-name { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .stage-count { background: var(--nb-primary-50); color: var(--nb-primary-700); border: 1px solid var(--nb-primary-200);
      border-radius: 999px; padding: 2px 10px; font-size: 11.5px; font-weight: 700; }
    .stage-sum { margin-inline-start: auto; font-size: 11.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }

    .stage-body { overflow: hidden; }
    .grid7 { display: grid; grid-template-columns: 42px 1.6fr 0.9fr 0.8fr 1fr 1.1fr 0.9fr; gap: 8px; align-items: center; }
    .tbl-head { background: transparent; border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; }
    .th { background: none; border: none; font-family: var(--nb-font-family); font-size: 11px; font-weight: 700;
      color: var(--nb-text-muted); cursor: pointer; text-align: right; padding: 0; transition: color .15s; }
    .th:hover { color: var(--nb-primary-600); }
    .ta-end { text-align: end; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }

    .grade-row { padding: 10px 16px; border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text);
      cursor: pointer; transition: background .15s; }
    .grade-row:hover { background: var(--nb-surface-raised); }
    .grade-row.expanded { background: var(--nb-primary-50); }
    .chev-cell { display: flex; justify-content: center; }
    .code-pill { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: 6px;
      padding: 2px 8px; font-size: 11.5px; color: var(--nb-text-secondary); }
    .code-pill.sm { padding: 1px 6px; font-size: 10.5px; }
    .cap-cell { display: flex; flex-direction: column; gap: 4px; }
    .mini-bar { height: 4px; background: var(--nb-surface-raised); border-radius: 2px; overflow: hidden; max-width: 90px; }
    .mini-fill { display: block; height: 100%; background: var(--nb-primary-500); border-radius: 2px; transition: width .5s ease; }

    .sections-panel { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-row); padding: 14px 18px 16px; }
    .sp-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .sp-title { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .sp-count { font-size: 11px; color: var(--nb-text-muted); }
    .sp-empty { font-size: 12.5px; color: var(--nb-text-muted); padding: 8px 0; }
    .sec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .sec-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 10px; padding: 10px 12px;
      display: flex; flex-direction: column; gap: 8px; transition: border-color .15s, transform .15s; }
    .sec-card:hover { border-color: var(--nb-primary-300); transform: translateY(-2px); }
    .sec-top { display: flex; align-items: center; gap: 8px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nb-text-faint); flex-shrink: 0; }
    .dot.male { background: #007aff; } .dot.female { background: #af52de; } .dot.mixed { background: var(--nb-success); }
    .sec-name { font-size: 13px; font-weight: 700; color: var(--nb-text); flex: 1; }
    .sec-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .sec-tag { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: var(--nb-surface-raised); color: var(--nb-text-secondary); }
    .sec-tag.male { background: rgba(0,122,255,.12); color: #0056b3; }
    .sec-tag.female { background: rgba(175,82,222,.12); color: #7d26cd; }
    .sec-tag.mixed { background: rgba(52,199,89,.12); color: var(--nb-success); }
    .sec-cap { font-size: 11px; color: var(--nb-text-muted); }
    .sec-shift { font-size: 11px; color: var(--nb-text-muted); margin-inline-start: auto; }
  `],
})
export class AcademicGradesComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly stages = signal<any[]>([]);
  readonly sections = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');

  q = '';
  readonly qSig = signal('');
  readonly stageFilterSig = signal('');
  readonly sortKey = signal<SortKey>('order');
  readonly sortDir = signal<'asc' | 'desc'>('asc');

  readonly expanded = signal<Set<string>>(new Set());
  readonly collapsedStages = signal<Set<string>>(new Set());

  f = { stage: '', name: '', code: '', order: 1, passing_percentage: 50, max_capacity: 40 };

  /** الصفوف بعد البحث والفلترة والفرز. */
  readonly filtered = computed(() => {
    const term = this.qSig().trim().toLowerCase();
    const stage = this.stageFilterSig();
    const key = this.sortKey();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return this.rows()
      .filter((g) => (!stage || g.stage === stage) && (!term || `${g.name} ${g.code}`.toLowerCase().includes(term)))
      .sort((a, b) => {
        const av = a[key], bv = b[key];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av ?? '').localeCompare(String(bv ?? ''), 'ar') * dir;
      });
  });

  /** تجميع الصفوف المفلترة حسب المرحلة، مع احترام ترتيب المراحل. */
  readonly groups = computed(() => {
    const byStage = new Map<string, any[]>();
    for (const g of this.filtered()) {
      const arr = byStage.get(g.stage) ?? [];
      arr.push(g); byStage.set(g.stage, arr);
    }
    return this.stages()
      .filter((s) => byStage.has(s.id))
      .map((s) => ({ stageId: s.id, stageName: s.name, grades: byStage.get(s.id)! }));
  });

  readonly allExpanded = computed(() => {
    const total = this.stages().filter((s) => this.groups().some((g) => g.stageId === s.id)).length;
    return total > 0 && this.collapsedStages().size === 0;
  });

  ngOnInit(): void {
    this.svc.getStages().subscribe((res) => this.stages.set(pickList(res)));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getGrades().subscribe({
      next: (res) => {
        this.rows.set(pickList(res));
        this.svc.getSections().subscribe({
          next: (sres) => { this.sections.set(pickList(sres)); this.loading.set(false); },
          error: () => { this.sections.set([]); this.loading.set(false); },
        });
      },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  onSearch(): void { this.qSig.set(this.q); }

  // ---------- عرض ----------
  sectionsOf(gradeId: string): any[] { return this.sections().filter((s) => s.grade === gradeId); }
  totalSections(grp: any): number { return grp.grades.reduce((n: number, g: any) => n + this.sectionsOf(g.id).length, 0); }
  totalCapacity(grp: any): number { return grp.grades.reduce((n: number, g: any) => n + (g.max_capacity || 0), 0); }
  fillPct(g: any): number { const cap = g.max_capacity || 0; return cap ? Math.min(100, Math.round((this.sectionsOf(g.id).length / Math.max(1, cap)) * 100)) : 0; }
  genderText(g: string): string { return ({ male: 'بنين', female: 'بنات', mixed: 'مختلط' } as any)[g] || g; }

  // ---------- فرز ----------
  sortBy(key: SortKey): void {
    if (this.sortKey() === key) { this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc'); }
    else { this.sortKey.set(key); this.sortDir.set('asc'); }
  }
  sortArrow(key: SortKey): string { return this.sortKey() === key ? (this.sortDir() === 'asc' ? '↑' : '↓') : ''; }

  // ---------- طي/توسّع ----------
  toggleStage(id: string): void {
    const next = new Set(this.collapsedStages());
    next.has(id) ? next.delete(id) : next.add(id);
    this.collapsedStages.set(next);
  }
  isStageCollapsed(id: string): boolean { return this.collapsedStages().has(id); }
  toggleAll(): void {
    if (this.allExpanded()) { this.collapsedStages.set(new Set(this.groups().map((g) => g.stageId))); }
    else { this.collapsedStages.set(new Set()); }
  }

  toggleExpand(id: string): void {
    const next = new Set(this.expanded());
    next.has(id) ? next.delete(id) : next.add(id);
    this.expanded.set(next);
  }
  isExpanded(id: string): boolean { return this.expanded().has(id); }

  // ---------- CRUD ----------
  valid(): boolean { return !!this.f['stage'] && !!this.f['name'] && !!this.f['code']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createGrade(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { stage: '', name: '', code: '', order: 1, passing_percentage: 50, max_capacity: 40 }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(g: any): void {
    const data: ConfirmDialogData = { title: 'حذف الصف', message: `حذف «${g.name}»؟ سيؤثر ذلك على الشعب المرتبطة.`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteGrade(g.id).subscribe({ next: () => this.load() });
    });
  }
}
