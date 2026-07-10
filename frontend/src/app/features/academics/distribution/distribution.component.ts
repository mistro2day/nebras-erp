import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { forkJoin, of } from 'rxjs';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../core/services/notification.service';
import { pickList } from '../shared/academics.shared';

interface DistStudent {
  id: string;
  student_number: string;
  name: string;
  gender: string;
  status: string;
  gradeId: string | null;   // صف الطالب الحالي في السنة المختارة (من التسجيل النشط)
  sectionId: string | null; // شعبته الحالية (إن وُجدت)
}

/**
 * توزيع الطلاب على الشعب — لوحة تسكين تفاعلية.
 * اختر السنة الدراسية والصف، فتظهر شعب الصف كأعمدة مع أشرطة السعة،
 * ومجمّع للطلاب غير الموزّعين. يدعم التوزيع التلقائي المتوازن، التعيين
 * اليدوي، النقل بين الشعب، وتخطّي الصف للطلاب المتميّزين.
 */
@Component({
  selector: 'app-academic-distribution',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbLoadingComponent],
  animations: [
    trigger('chipList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          stagger('25ms', [animate('260ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'none' }))]),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="توزيع الطلاب على الفصول"
        subtitle="تسكين الطلاب في فصول الصف — توزيع تلقائي متوازن أو تعيين ونقل يدوي، مع مراعاة السعة والنوع.">
        <button class="nb-btn-secondary" (click)="reload()" [disabled]="!gradeId()">تحديث</button>
        <button class="nb-btn-primary" (click)="autoDistribute()"
          [disabled]="!gradeId() || unassigned().length === 0 || sections().length === 0 || busy()">
          توزيع تلقائي متوازن
        </button>
      </nb-page-header>

      <!-- اختيار السياق -->
      <div class="context-bar">
        <div class="fld">
          <label>السنة الدراسية</label>
          <select [(ngModel)]="yearIdModel" (change)="onYearChange()">
            <option value="">اختر السنة…</option>
            @for (y of years(); track y.id) {
              <option [value]="y.id">{{ y.name }}{{ y.current_flag ? ' (الحالية)' : '' }}</option>
            }
          </select>
        </div>
        <div class="fld">
          <label>الصف الدراسي</label>
          <select [(ngModel)]="gradeIdModel" (change)="onGradeChange()">
            <option value="">اختر الصف…</option>
            @for (g of grades(); track g.id) {
              <option [value]="g.id">{{ g.name }}</option>
            }
          </select>
        </div>
        @if (selectedIds().size > 0) {
          <div class="selection-hint">
            <span class="pill">{{ selectedIds().size }} محدّد</span>
            <button class="nb-btn-ghost sm" (click)="clearSelection()">إلغاء التحديد</button>
          </div>
        }
      </div>

      @if (!gradeId()) {
        <nb-panel><p class="hint">اختر السنة الدراسية والصف لعرض لوحة التوزيع.</p></nb-panel>
      } @else if (loading()) {
        <nb-loading message="جارٍ تحميل طلاب الصف والفصول…"></nb-loading>
      } @else {
        <!-- مؤشرات -->
        <div class="stats-grid">
          <div class="metric-card">
            <span class="label">طلاب الصف</span>
            <span class="value">{{ gradeStudents().length }}</span>
            <div class="bar"><div class="fill active" [style.width.%]="100"></div></div>
          </div>
          <div class="metric-card">
            <span class="label">الموزّعون على فصول</span>
            <span class="value success">{{ assignedCount() }}</span>
            <div class="bar"><div class="fill success" [style.width.%]="pct(assignedCount())"></div></div>
          </div>
          <div class="metric-card">
            <span class="label">بانتظار التوزيع</span>
            <span class="value" [class.danger]="unassigned().length > 0">{{ unassigned().length }}</span>
            <div class="bar"><div class="fill danger" [style.width.%]="pct(unassigned().length)"></div></div>
          </div>
          <div class="metric-card">
            <span class="label">عدد الفصول</span>
            <span class="value info">{{ sections().length }}</span>
            <div class="bar"><div class="fill info" [style.width.%]="sections().length ? 100 : 0"></div></div>
          </div>
        </div>

        @if (sections().length === 0) {
          <nb-panel><p class="hint">لا توجد فصول لهذا الصف. أنشئ الفصول أولًا من صفحة «الفصول الدراسية».</p></nb-panel>
        }

        <div class="board">
          <!-- مجمّع غير الموزّعين -->
          <div class="pool">
            <div class="col-head">
              <div class="col-title">
                <span class="dot pool-dot"></span>
                <span>غير الموزّعين</span>
                <span class="count">{{ unassigned().length }}</span>
              </div>
              @if (selectedIds().size > 0) {
                <span class="col-note">اختر شعبة لتعيين المحدّدين</span>
              }
            </div>
            <div class="chips" [@chipList]="unassigned().length">
              @for (s of unassigned(); track s.id) {
                <button class="chip" [class.sel]="selectedIds().has(s.id)" [class]="'chip ' + s.gender"
                  (click)="toggleSelect(s.id)">
                  <span class="avatar" [class]="s.gender">{{ initials(s.name) }}</span>
                  <span class="chip-body">
                    <span class="chip-name">{{ s.name }}</span>
                    <span class="chip-num">{{ s.student_number }}</span>
                  </span>
                  <span class="promote" title="ترقية / تخطّي صف" (click)="openPromote(s, $event)">⇧</span>
                </button>
              }
              @if (unassigned().length === 0) {
                <div class="empty-col">🎉 كل الطلاب موزّعون على الفصول.</div>
              }
            </div>
          </div>

          <!-- أعمدة الفصول -->
          <div class="sections-scroll">
            @for (sec of sections(); track sec.id) {
              <div class="section-col" [class.drop-target]="selectedIds().size > 0 && canAssignTo(sec)"
                (click)="assignSelectedTo(sec)">
                <div class="col-head">
                  <div class="col-title">
                    <span class="dot" [class]="sec.gender"></span>
                    <span>{{ sec.name }}</span>
                    <span class="count">{{ inSection(sec.id).length }}</span>
                  </div>
                  <span class="gender-tag" [class]="sec.gender">{{ genderText(sec.gender) }}</span>
                </div>
                <div class="cap-bar">
                  <div class="cap-fill" [class.over]="inSection(sec.id).length > sec.capacity"
                    [style.width.%]="capPct(sec)"></div>
                </div>
                <div class="cap-text">
                  <span>{{ inSection(sec.id).length }} / {{ sec.capacity }}</span>
                  <span [class.full]="inSection(sec.id).length >= sec.capacity">
                    {{ remaining(sec) > 0 ? remaining(sec) + ' مقعد متاح' : 'مكتملة' }}
                  </span>
                </div>
                <div class="chips" [@chipList]="inSection(sec.id).length" (click)="$event.stopPropagation()">
                  @for (s of inSection(sec.id); track s.id) {
                    <div class="chip placed" [class]="'chip placed ' + s.gender">
                      <span class="avatar" [class]="s.gender">{{ initials(s.name) }}</span>
                      <span class="chip-body">
                        <span class="chip-name">{{ s.name }}</span>
                        <span class="chip-num">{{ s.student_number }}</span>
                      </span>
                      <span class="move" title="نقل لفصل آخر" (click)="openTransfer(s)">⇄</span>
                    </div>
                  }
                  @if (inSection(sec.id).length === 0) {
                    <div class="empty-col small">فصل فارغ — عيّن طلابًا إليه.</div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- نافذة النقل بين الفصول -->
      @if (transferFor()) {
        <div class="overlay" (click)="transferFor.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>نقل الطالب</h3>
            <p class="modal-sub">{{ transferFor()!.name }} — {{ transferFor()!.student_number }}</p>
            <div class="fld">
              <label>الفصل الجديد</label>
              <select [(ngModel)]="transferTarget">
                <option value="">اختر فصلاً…</option>
                @for (sec of sections(); track sec.id) {
                  @if (sec.id !== transferFor()!.sectionId && canAssignGender(sec, transferFor()!.gender)) {
                    <option [value]="sec.id">{{ sec.name }} ({{ inSection(sec.id).length }}/{{ sec.capacity }})</option>
                  }
                }
              </select>
            </div>
            <div class="modal-actions">
              <button class="nb-btn-ghost" (click)="transferFor.set(null)">إلغاء</button>
              <button class="nb-btn-primary" [disabled]="!transferTarget || busy()" (click)="confirmTransfer()">نقل</button>
            </div>
          </div>
        </div>
      }

      <!-- نافذة الترقية / تخطّي الصف -->
      @if (promoteFor()) {
        <div class="overlay" (click)="promoteFor.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>ترقية / تخطّي صف</h3>
            <p class="modal-sub">{{ promoteFor()!.name }} — نقل الطالب المتميّز إلى صف أعلى.</p>
            <div class="fld">
              <label>الصف الهدف</label>
              <select [(ngModel)]="promoteTarget">
                <option value="">اختر الصف…</option>
                @for (g of grades(); track g.id) {
                  @if (g.id !== gradeId()) { <option [value]="g.id">{{ g.name }}</option> }
                }
              </select>
            </div>
            <p class="hint warn">سيُنقل الطالب من صفه الحالي إلى الصف الهدف ويُسجَّل ذلك في سجل الترقية.</p>
            <div class="modal-actions">
              <button class="nb-btn-ghost" (click)="promoteFor.set(null)">إلغاء</button>
              <button class="nb-btn-primary" [disabled]="!promoteTarget || busy()" (click)="confirmPromote()">ترقية</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .hint { font-size: 13px; color: var(--nb-text-muted); margin: 0; }
    .hint.warn { color: var(--nb-warning); margin-top: 8px; }

    .context-bar { display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld select { height: 36px; min-width: 220px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      padding: 0 10px; font-family: var(--nb-font-family); font-size: 13px; color: var(--nb-text); background: var(--nb-surface); outline: none; }
    .fld select:focus { border-color: var(--nb-primary-600); box-shadow: var(--nb-focus-ring); }
    .selection-hint { display: flex; align-items: center; gap: 8px; margin-inline-start: auto; }
    .pill { background: var(--nb-primary-50); color: var(--nb-primary-700); border: 1px solid var(--nb-primary-200);
      border-radius: 999px; padding: 4px 12px; font-size: 12px; font-weight: 700; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .metric-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
    .metric-card .label { font-size: 12px; color: var(--nb-text-muted); }
    .metric-card .value { font-size: 24px; font-weight: 700; color: var(--nb-text); }
    .metric-card .value.success { color: var(--nb-success); }
    .metric-card .value.danger { color: var(--nb-danger); }
    .metric-card .value.info { color: var(--nb-info); }
    .bar { height: 4px; background: var(--nb-surface-raised); border-radius: 2px; overflow: hidden; margin-top: 4px; }
    .fill { height: 100%; border-radius: 2px; background: var(--nb-primary-500); transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
    .fill.success { background: var(--nb-success); } .fill.danger { background: var(--nb-danger); } .fill.info { background: var(--nb-info); }

    .board { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
    @media (max-width: 900px) { .board { grid-template-columns: 1fr; } }

    .pool, .section-col { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 12px; }
    .pool { position: sticky; top: 0; }
    .sections-scroll { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }

    .section-col { transition: border-color .2s, box-shadow .2s, transform .15s; cursor: default; }
    .section-col.drop-target { border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px var(--nb-primary-50); cursor: pointer; }
    .section-col.drop-target:hover { transform: translateY(-2px); }

    .col-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .col-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--nb-text-faint); }
    .dot.male { background: #007aff; } .dot.female { background: #af52de; } .dot.mixed { background: var(--nb-success); }
    .pool-dot { background: var(--nb-warning); }
    .count { background: var(--nb-surface-raised); border-radius: 999px; padding: 1px 9px; font-size: 12px; color: var(--nb-text-secondary); }
    .col-note { font-size: 11px; color: var(--nb-primary-600); font-weight: 600; }
    .gender-tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: var(--nb-surface-raised); color: var(--nb-text-secondary); }
    .gender-tag.male { background: rgba(0,122,255,.12); color: #0056b3; }
    .gender-tag.female { background: rgba(175,82,222,.12); color: #7d26cd; }
    .gender-tag.mixed { background: var(--nb-success-50, rgba(52,199,89,.12)); color: var(--nb-success); }

    .cap-bar { height: 6px; background: var(--nb-surface-raised); border-radius: 3px; overflow: hidden; margin: 4px 0; }
    .cap-fill { height: 100%; background: var(--nb-primary-500); border-radius: 3px; transition: width .5s ease; }
    .cap-fill.over { background: var(--nb-danger); }
    .cap-text { display: flex; justify-content: space-between; font-size: 11px; color: var(--nb-text-muted); margin-bottom: 8px; font-variant-numeric: tabular-nums; }
    .cap-text .full { color: var(--nb-danger); font-weight: 700; }

    .chips { display: flex; flex-direction: column; gap: 6px; min-height: 24px; }
    .chip { display: flex; align-items: center; gap: 8px; width: 100%; text-align: right; background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft); border-radius: 10px; padding: 6px 8px; cursor: pointer; font-family: var(--nb-font-family);
      transition: all .18s; }
    .chip:hover { border-color: var(--nb-primary-300); background: var(--nb-primary-50); }
    .chip.sel { border-color: var(--nb-primary-500); background: var(--nb-primary-50); box-shadow: 0 0 0 2px var(--nb-primary-100); }
    .chip.placed { cursor: default; }
    .chip.placed:hover { border-color: var(--nb-border-soft); background: var(--nb-surface-raised); }
    .avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; color: #fff; background: var(--nb-primary-500); flex-shrink: 0; }
    .avatar.male { background: linear-gradient(135deg, #007aff, #0056b3); }
    .avatar.female { background: linear-gradient(135deg, #af52de, #7d26cd); }
    .chip-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
    .chip-name { font-size: 12.5px; font-weight: 600; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chip-num { font-size: 10.5px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .move, .promote { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
      font-size: 13px; color: var(--nb-text-secondary); flex-shrink: 0; }
    .move:hover, .promote:hover { background: var(--nb-primary-100); color: var(--nb-primary-700); }

    .empty-col { text-align: center; font-size: 12px; color: var(--nb-text-muted); padding: 20px 8px; }
    .empty-col.small { padding: 12px 8px; font-size: 11.5px; }

    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fade .18s; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    .modal { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 20px; width: 360px; max-width: 90vw; box-shadow: 0 20px 48px rgba(0,0,0,.24); }
    .modal h3 { margin: 0 0 4px; font-size: 16px; color: var(--nb-text); }
    .modal-sub { margin: 0 0 14px; font-size: 12.5px; color: var(--nb-text-muted); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class AcademicDistributionComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotificationService);

  readonly years = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly allSections = signal<any[]>([]);
  readonly students = signal<DistStudent[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);

  readonly yearId = signal('');
  readonly gradeId = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly transferFor = signal<DistStudent | null>(null);
  transferTarget = '';
  readonly promoteFor = signal<DistStudent | null>(null);
  promoteTarget = '';

  // نماذج القوائم المنسدلة (ngModel) — تُزامن مع الإشارات
  yearIdModel = '';
  gradeIdModel = '';

  readonly sections = computed(() => this.allSections().filter((s) => s.grade === this.gradeId()));

  /** الطلاب المعنيّون بالصف المختار: المسكَّنون في هذا الصف + المرشَّحون بلا صف بعد. */
  readonly gradeStudents = computed(() => {
    const grade = this.gradeId();
    return this.students().filter((s) => s.gradeId === grade || (s.gradeId === null && this.isCandidate(s)));
  });
  readonly unassigned = computed(() => this.gradeStudents().filter((s) => !s.sectionId));
  readonly assignedCount = computed(() => this.gradeStudents().filter((s) => !!s.sectionId).length);

  private isCandidate(s: DistStudent): boolean {
    return ['registered', 'active', 'enrolled', 'accepted'].includes(s.status);
  }

  ngOnInit(): void {
    this.svc.getAcademicYears().subscribe((res) => {
      const list = pickList<any>(res);
      this.years.set(list);
      const current = list.find((y) => y.current_flag) ?? list[0];
      if (current) { this.yearId.set(current.id); this.yearIdModel = current.id; }
    });
    this.svc.getGrades().subscribe((res) => this.grades.set(pickList(res)));
    this.svc.getSections().subscribe((res) => this.allSections.set(pickList(res)));
  }

  onYearChange(): void { this.yearId.set(this.yearIdModel); if (this.gradeId()) this.reload(); }
  onGradeChange(): void { this.gradeId.set(this.gradeIdModel); this.clearSelection(); this.reload(); }

  reload(): void {
    const grade = this.gradeId();
    if (!grade) { this.students.set([]); return; }
    this.loading.set(true);
    this.svc.getStudentsForDistribution({ grade_id: grade, academic_year_id: this.yearId() }).subscribe({
      next: (res) => { this.students.set(this.mapStudents(pickList(res))); this.loading.set(false); },
      error: () => { this.students.set([]); this.loading.set(false); },
    });
  }

  private mapStudents(raw: any[]): DistStudent[] {
    const year = this.yearId();
    return raw.map((st) => {
      // آخر تسجيل نشط في السنة المختارة (لأي صف) يحدّد صف الطالب وشعبته الحالية
      const enrolls = (st.enrollments || [])
        .filter((e: any) => (!year || e.academic_year_id === year) && e.status !== 'withdrawn')
        .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));
      const active = enrolls[0];
      return {
        id: st.id,
        student_number: st.student_number,
        name: st.profile?.arabic_name || 'طالب',
        gender: st.profile?.gender || 'male',
        status: st.status || 'registered',
        gradeId: active?.grade_id || null,
        sectionId: active?.section_id || null,
      };
    });
  }

  inSection(sectionId: string): DistStudent[] {
    const grade = this.gradeId();
    return this.students().filter((s) => s.gradeId === grade && s.sectionId === sectionId);
  }

  // ---------- أدوات العرض ----------
  pct(n: number): number { const t = this.gradeStudents().length; return t ? Math.round((n / t) * 100) : 0; }
  capPct(sec: any): number { const n = this.inSection(sec.id).length; return sec.capacity ? Math.min(100, Math.round((n / sec.capacity) * 100)) : 0; }
  remaining(sec: any): number { return Math.max(0, sec.capacity - this.inSection(sec.id).length); }
  genderText(g: string): string { return ({ male: 'بنين', female: 'بنات', mixed: 'مختلط' } as any)[g] || g; }
  initials(name: string): string { const p = (name || '').trim().split(/\s+/); return p.length > 1 ? p[0][0] + p[1][0] : (name || 'ط').substring(0, 2); }

  canAssignGender(sec: any, gender: string): boolean { return sec.gender === 'mixed' || sec.gender === gender; }
  canAssignTo(sec: any): boolean {
    return [...this.selectedIds()].every((id) => {
      const s = this.students().find((x) => x.id === id);
      return s ? this.canAssignGender(sec, s.gender) : false;
    });
  }

  // ---------- التحديد ----------
  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
  }
  clearSelection(): void { this.selectedIds.set(new Set()); }

  // ---------- التعيين اليدوي ----------
  assignSelectedTo(sec: any): void {
    if (this.selectedIds().size === 0 || busyGuard(this)) return;
    if (!this.canAssignTo(sec)) { this.notify.error('نوع بعض الطلاب المحدّدين لا يطابق نوع الفصل.'); return; }
    const ids = [...this.selectedIds()];
    this.commitAssignments(ids.map((id) => ({ id, sectionId: sec.id })), `تم تعيين ${ids.length} طالبًا في ${sec.name}.`);
  }

  // ---------- التوزيع التلقائي المتوازن ----------
  autoDistribute(): void {
    const secs = this.sections();
    if (secs.length === 0 || busyGuard(this)) return;
    const data: ConfirmDialogData = {
      title: 'توزيع تلقائي',
      message: `سيُوزَّع ${this.unassigned().length} طالبًا على ${secs.length} فصل بشكل متوازن مع مراعاة السعة والنوع.`,
      color: 'primary',
    };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      // نسخة عمل من الأعداد الحالية لكل شعبة
      const load: Record<string, number> = {};
      for (const sec of secs) load[sec.id] = this.inSection(sec.id).length;
      const plan: { id: string; sectionId: string }[] = [];
      for (const st of this.unassigned()) {
        const candidates = secs
          .filter((sec) => this.canAssignGender(sec, st.gender) && load[sec.id] < sec.capacity)
          .sort((a, b) => (load[a.id] / a.capacity) - (load[b.id] / b.capacity));
        const target = candidates[0];
        if (target) { plan.push({ id: st.id, sectionId: target.id }); load[target.id]++; }
      }
      if (plan.length === 0) { this.notify.error('لا توجد مقاعد متاحة مطابقة للنوع.'); return; }
      const skipped = this.unassigned().length - plan.length;
      this.commitAssignments(plan, `تم توزيع ${plan.length} طالبًا تلقائيًا.` + (skipped ? ` (${skipped} بلا مقعد مطابق)` : ''));
    });
  }

  private commitAssignments(plan: { id: string; sectionId: string }[], successMsg: string): void {
    if (plan.length === 0) return;
    this.busy.set(true);
    const calls = plan.map((p) => this.svc.assignStudentSection(p.id, {
      academic_year_id: this.yearId(),
      grade_id: this.gradeId(),
      section_id: p.sectionId,
      enrollment_type: 'new',
    }));
    forkJoin(calls.length ? calls : [of(null)]).subscribe({
      next: () => {
        // تحديث محلي متفائل: تثبيت الصف والشعبة معًا حتى يظهر المرشّح داخل الشعبة
        const grade = this.gradeId();
        const map = new Map(plan.map((p) => [p.id, p.sectionId]));
        this.students.update((list) => list.map((s) => map.has(s.id) ? { ...s, gradeId: grade, sectionId: map.get(s.id)! } : s));
        this.clearSelection();
        this.busy.set(false);
        this.notify.success(successMsg);
      },
      error: () => { this.busy.set(false); this.notify.error('تعذّر إكمال التعيين. حاول مجددًا.'); this.reload(); },
    });
  }

  // ---------- النقل بين الشعب ----------
  openTransfer(s: DistStudent): void { this.transferFor.set(s); this.transferTarget = ''; }
  confirmTransfer(): void {
    const s = this.transferFor();
    if (!s || !this.transferTarget) return;
    this.transferFor.set(null);
    this.commitAssignments([{ id: s.id, sectionId: this.transferTarget }], `تم نقل ${s.name} إلى الفصل الجديد.`);
  }

  // ---------- الترقية / تخطّي الصف ----------
  openPromote(s: DistStudent, ev: Event): void { ev.stopPropagation(); this.promoteFor.set(s); this.promoteTarget = ''; }
  confirmPromote(): void {
    const s = this.promoteFor();
    if (!s || !this.promoteTarget || this.busy()) return;
    this.busy.set(true);
    this.svc.promoteStudent(s.id, {
      from_grade_id: this.gradeId(),
      to_grade_id: this.promoteTarget,
      academic_year_id: this.yearId(),
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.promoteFor.set(null);
        this.students.update((list) => list.filter((x) => x.id !== s.id));
        this.notify.success(`تمت ترقية ${s.name} إلى الصف الأعلى.`);
      },
      error: () => { this.busy.set(false); this.notify.error('تعذّرت الترقية.'); },
    });
  }
}

/** حارس بسيط لمنع العمليات المتزامنة. */
function busyGuard(c: { busy: () => boolean }): boolean { return c.busy(); }
