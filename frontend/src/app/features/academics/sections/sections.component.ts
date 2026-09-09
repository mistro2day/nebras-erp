import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/**
 * الفصول الدراسية — وحدة عاملة مربوطة بـ academics/sections/ ضمن الصفوف.
 * تدعم التعديل الكامل، وعرضاً بيانياً متطوراً للطاقة الاستيعابية وحجم الإشغال.
 */
@Component({
  selector: 'app-academic-sections',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الفصول الدراسية" subtitle="فصول وشعب كل صف مع متابعة السعة الاستيعابية وحجم الإشغال والفترات.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding() ? cancel() : openAdd()" [disabled]="grades().length === 0">
          {{ adding() ? 'إغلاق' : 'إضافة فصل جديد' }}
        </button>
      </nb-page-header>

      <!-- بطاقات الملخص الرسومي السريع لحجم الإشغال -->
      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon-wrap blue">🏫</div>
          <div class="stat-meta">
            <span class="stat-label">إجمالي الفصول</span>
            <span class="stat-val mono">{{ rows().length }}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap emerald">🪑</div>
          <div class="stat-meta">
            <span class="stat-label">الطاقة الاستيعابية</span>
            <span class="stat-val mono">{{ totalCapacity() }} مقعد</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrap amber">👥</div>
          <div class="stat-meta">
            <span class="stat-label">المقاعد المشغولة</span>
            <span class="stat-val mono">{{ totalOccupied() }} طالب</span>
          </div>
        </div>

        <div class="stat-card highlight">
          <div class="stat-meta w-100">
            <div class="stat-top-row">
              <span class="stat-label">نسبة الإشغال الكلية</span>
              <span class="stat-pct-badge mono" [ngClass]="getCapacityStatusClass(overallOccupancyPct())">
                {{ overallOccupancyPct() }}%
              </span>
            </div>
            <div class="overall-track">
              <div class="overall-fill" [ngClass]="getCapacityStatusClass(overallOccupancyPct())" [style.width.%]="overallOccupancyPct()"></div>
            </div>
            <span class="stat-sub">المتبقي: {{ totalCapacity() - totalOccupied() }} مقعد شاغر</span>
          </div>
        </div>
      </div>

      @if (grades().length === 0 && !loading()) {
        <nb-panel style="margin-bottom:16px"><p class="hint">لا توجد صفوف بعد. أنشئ الصفوف أولًا من صفحة «الصفوف الدراسية».</p></nb-panel>
      }

      @if (adding()) {
        <nb-panel [title]="editingId() ? 'تعديل الفصل الدراسي: ' + f.name : 'فصل دراسي جديد'" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>الصف</label>
              <select [(ngModel)]="f.grade"><option value="">اختر الصف…</option>
                @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
              </select>
            </div>
            <div class="fld req"><label>اسم الفصل</label><input [(ngModel)]="f.name" placeholder="مثال: الصف الأول أ" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="A" /></div>
            <div class="fld req"><label>الطاقة الاستيعابية للمقاعد</label><input type="number" min="1" [(ngModel)]="f.capacity" /></div>
            <div class="fld"><label>النوع</label>
              <select [(ngModel)]="f.gender">
                <option value="male">بنين</option>
                <option value="female">بنات</option>
                <option value="mixed">مختلط</option>
              </select>
            </div>
            <div class="fld"><label>الفترة الدراسية</label><input [(ngModel)]="f.academic_shift" placeholder="صباحية" /></div>
            <div class="form-actions">
              <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">
                {{ saving() ? 'جارٍ الحفظ…' : (editingId() ? 'حفظ التعديلات' : 'إضافة الفصل') }}
              </button>
              <button class="nb-btn-secondary" type="button" (click)="cancel()">إلغاء</button>
            </div>
          </div>
          @if (error()) { <p class="hint" style="color:var(--nb-danger)">{{ error() }}</p> }
        </nb-panel>
      }

      <div class="toolbar">
        <div class="search">
          <input [(ngModel)]="q" placeholder="بحث باسم الفصل أو الرمز أو الصف…" />
        </div>
        <div class="field">
          <select [ngModel]="gradeFilterSig()" (ngModelChange)="gradeFilterSig.set($event)">
            <option value="">كل الصفوف</option>
            @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
          </select>
        </div>
      </div>

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head grid-sections">
            <span>الفصل</span><span>الصف</span><span>الرمز</span><span>حجم الإشغال والسعة</span><span>النوع</span><span>الفترة</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (s of filtered(); track s.id) {
              <div class="tbl-row grid-sections">
                <span class="strong flex-center">
                  <span class="dot" [class]="s.gender"></span>
                  {{ s.name }}
                </span>
                <span>{{ gradeName(s.grade) }}</span>
                <span><span class="code-pill mono">{{ s.code }}</span></span>
                
                <!-- ويدجت رسومي متقدم لحجم الإشغال والسعة -->
                <div class="cap-visual-cell">
                  <div class="cap-visual-top">
                    <div class="cap-ratio mono">
                      <span class="cap-occ strong">{{ s.occupied_seats || 0 }}</span>
                      <span class="cap-sep">/</span>
                      <span class="cap-tot">{{ s.capacity || 0 }} مقعد</span>
                    </div>
                    <div class="cap-badges">
                      <span class="cap-status-pill" [ngClass]="getCapacityStatusClass(getOccupancyPct(s))">
                        {{ getCapacityStatusLabel(getOccupancyPct(s)) }}
                      </span>
                      <span class="cap-pct-badge mono" [ngClass]="getCapacityStatusClass(getOccupancyPct(s))">
                        {{ getOccupancyPct(s) }}%
                      </span>
                    </div>
                  </div>
                  
                  <div class="cap-meter-track">
                    <div class="cap-meter-fill" [ngClass]="getCapacityStatusClass(getOccupancyPct(s))" [style.width.%]="getOccupancyPct(s)"></div>
                  </div>

                  <div class="cap-visual-sub">
                    @if (getRemainingSeats(s) > 0) {
                      <span class="cap-avail">شاغر: {{ getRemainingSeats(s) }} مقعد</span>
                    } @else {
                      <span class="cap-full">مكتمل بالكامل</span>
                    }
                  </div>
                </div>

                <span>
                  <span class="gender-tag" [class]="s.gender">{{ genderText(s.gender) }}</span>
                </span>
                <span class="shift-tag">{{ s.academic_shift || 'صباحية' }}</span>
                <span class="row-actions">
                  <button class="nb-btn-secondary sm" (click)="edit(s)">تعديل</button>
                  <button class="nb-btn-danger sm" (click)="remove(s)">حذف</button>
                </span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد فصول دراسية مطابقة.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES + `
    /* بطاقات الملخص العلوي */
    .stats-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .stat-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 12px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .stat-card.highlight { background: var(--nb-surface-raised); }
    .stat-icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .stat-icon-wrap.blue { background: rgba(59, 130, 246, 0.1); }
    .stat-icon-wrap.emerald { background: rgba(16, 185, 129, 0.1); }
    .stat-icon-wrap.amber { background: rgba(245, 158, 11, 0.1); }
    .stat-meta { display: flex; flex-direction: column; gap: 2px; }
    .stat-meta.w-100 { width: 100%; }
    .stat-top-row { display: flex; justify-content: space-between; align-items: center; }
    .stat-label { font-size: 11.5px; color: var(--nb-text-muted); font-weight: 600; }
    .stat-val { font-size: 16px; font-weight: 700; color: var(--nb-text); }
    .stat-sub { font-size: 10.5px; color: var(--nb-text-muted); margin-top: 4px; }
    .stat-pct-badge { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }

    .overall-track { height: 6px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; margin-top: 6px; width: 100%; }
    .overall-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }

    /* شبكة الجدول */
    .grid-sections { display: grid; grid-template-columns: 1.2fr 1.2fr 0.6fr 1.8fr 0.8fr 0.9fr 1.1fr; gap: 10px; align-items: center; }
    
    .flex-center { display: flex; align-items: center; gap: 8px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--nb-text-faint); flex-shrink: 0; }
    .dot.male { background: #007aff; } .dot.female { background: #af52de; } .dot.mixed { background: var(--nb-success); }
    .code-pill { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); border-radius: 6px; padding: 2px 8px; font-size: 11.5px; color: var(--nb-text-secondary); }

    .gender-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: var(--nb-surface-raised); }
    .gender-tag.male { background: rgba(0,122,255,.1); color: #0056b3; }
    .gender-tag.female { background: rgba(175,82,222,.1); color: #7d26cd; }
    .gender-tag.mixed { background: rgba(16,185,129,.1); color: #065f46; }
    .shift-tag { font-size: 11.5px; color: var(--nb-text-secondary); }

    /* ودجت السعة الرسومية */
    .cap-visual-cell { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
    .cap-visual-top { display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .cap-ratio { color: var(--nb-text); }
    .cap-occ { color: var(--nb-text); font-weight: 700; }
    .cap-sep { color: var(--nb-text-faint); margin: 0 1px; }
    .cap-tot { color: var(--nb-text-muted); font-size: 11px; }
    .cap-badges { display: flex; align-items: center; gap: 4px; }
    
    .cap-status-pill { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
    .cap-pct-badge { font-size: 10.5px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }

    .cap-meter-track { height: 7px; background: rgba(0,0,0,0.06); border-radius: 999px; overflow: hidden; width: 100%; }
    .cap-meter-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }

    .cap-visual-sub { display: flex; justify-content: space-between; font-size: 10.5px; }
    .cap-avail { color: #059669; font-weight: 500; }
    .cap-full { color: #dc2626; font-weight: 600; }

    /* الحالات اللونية الثلاثية */
    .status-success { color: #059669; }
    .status-success.cap-meter-fill, .status-success.overall-fill { background: linear-gradient(90deg, #34d399, #10b981); }
    .status-success.cap-status-pill, .status-success.cap-pct-badge, .status-success.stat-pct-badge {
      background: rgba(16, 185, 129, 0.12); color: #059669;
    }

    .status-warning { color: #d97706; }
    .status-warning.cap-meter-fill, .status-warning.overall-fill { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
    .status-warning.cap-status-pill, .status-warning.cap-pct-badge, .status-warning.stat-pct-badge {
      background: rgba(245, 158, 11, 0.12); color: #d97706;
    }

    .status-danger { color: #dc2626; }
    .status-danger.cap-meter-fill, .status-danger.overall-fill { background: linear-gradient(90deg, #f87171, #ef4444); }
    .status-danger.cap-status-pill, .status-danger.cap-pct-badge, .status-danger.stat-pct-badge {
      background: rgba(239, 68, 68, 0.12); color: #dc2626;
    }

    .field select { height: 34px; min-width: 170px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
  `],
})
export class AcademicSectionsComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly error = signal('');
  readonly gradeFilterSig = signal('');
  q = '';

  f = { grade: '', name: '', code: '', capacity: 30, gender: 'mixed', academic_shift: 'صباحية' };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    const gFilter = this.gradeFilterSig();
    return this.rows().filter((x) => {
      const matchGrade = !gFilter || x.grade === gFilter;
      const matchSearch = !s || `${x.name} ${x.code} ${this.gradeName(x.grade)}`.toLowerCase().includes(s);
      return matchGrade && matchSearch;
    });
  });

  // ---------- المقاييس الإحصائية الإجمالية ----------
  readonly totalCapacity = computed(() => {
    return this.rows().reduce((acc, s) => acc + (Number(s.capacity) || 0), 0);
  });

  readonly totalOccupied = computed(() => {
    return this.rows().reduce((acc, s) => acc + (Number(s.occupied_seats) || 0), 0);
  });

  readonly overallOccupancyPct = computed(() => {
    const cap = this.totalCapacity();
    if (!cap) return 0;
    return Math.min(100, Math.round((this.totalOccupied() / cap) * 100));
  });

  ngOnInit(): void {
    this.svc.getGrades().subscribe((res) => this.grades.set(pickList(res)));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getSections().subscribe({
      next: (res) => { this.rows.set(pickList(res)); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  gradeName(id: string): string { return this.grades().find((g) => g.id === id)?.name || '—'; }
  genderText(g: string): string { return ({ male: 'بنين', female: 'بنات', mixed: 'مختلط' } as any)[g] || g; }

  // ---------- حسابات السعة والإشغال الرسومية ----------
  getOccupancyPct(s: any): number {
    if (s.occupancy_percentage !== undefined && s.occupancy_percentage !== null) {
      return Number(s.occupancy_percentage);
    }
    const cap = Number(s.capacity) || 0;
    if (!cap) return 0;
    return Math.min(100, Math.round(((Number(s.occupied_seats) || 0) / cap) * 100));
  }

  getRemainingSeats(s: any): number {
    if (s.available_seats !== undefined && s.available_seats !== null) {
      return Number(s.available_seats);
    }
    const cap = Number(s.capacity) || 0;
    const occ = Number(s.occupied_seats) || 0;
    return Math.max(0, cap - occ);
  }

  getCapacityStatusClass(pct: number): string {
    if (pct >= 90) return 'status-danger';
    if (pct >= 70) return 'status-warning';
    return 'status-success';
  }

  getCapacityStatusLabel(pct: number): string {
    if (pct >= 90) return 'مكتمل';
    if (pct >= 70) return 'شبه ممتلئ';
    return 'متسع';
  }

  // ---------- إضافة وتعديل الفصول ----------
  valid(): boolean { return !!this.f['grade'] && !!this.f['name']?.trim() && !!this.f['code']?.trim(); }

  openAdd(): void {
    const defaultGrade = this.gradeFilterSig() || (this.grades().length > 0 ? this.grades()[0].id : '');
    this.f = { grade: defaultGrade, name: '', code: '', capacity: 30, gender: 'mixed', academic_shift: 'صباحية' };
    this.editingId.set(null);
    this.error.set('');
    this.adding.set(true);
  }

  edit(s: any): void {
    this.editingId.set(s.id);
    this.f = {
      grade: s.grade,
      name: s.name,
      code: s.code,
      capacity: s.capacity || 30,
      gender: s.gender || 'mixed',
      academic_shift: s.academic_shift || 'صباحية',
    };
    this.error.set('');
    this.adding.set(true);
  }

  cancel(): void {
    this.adding.set(false);
    this.editingId.set(null);
    this.error.set('');
  }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    const id = this.editingId();
    const req$ = id
      ? this.svc.updateSection(id, this.f)
      : this.svc.createSection(this.f);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancel();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.message || (typeof e?.error === 'string' ? e.error : 'تعذّر حفظ الفصل.'));
      },
    });
  }

  remove(s: any): void {
    const data: ConfirmDialogData = { title: 'حذف الفصل', message: `حذف «${s.name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteSection(s.id).subscribe({ next: () => this.load() });
    });
  }
}
