import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OrganizationService, Department } from '../organization.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

/**
 * إدارة الأقسام الإدارية والأكاديمية — جزء من الهيكل المؤسسي (وحدة التنظيم).
 * الأقسام هي الجهة الطالبة في طلبات الشراء، ومرجع تعيينات المستخدمين.
 */
@Component({
  selector: 'app-org-departments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الأقسام"
        subtitle="الأقسام الإدارية والأكاديمية في الهيكل المؤسسي — تُستخدم كجهة طالبة في المشتريات وتعيينات المستخدمين.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openCreate()">
          {{ editing() ? 'إغلاق' : '＋ قسم جديد' }}
        </button>
      </nb-page-header>

      @if (editing()) {
        <div class="panel">
          <div class="panel-head">
            <div class="ph-title">
              <span class="ph-ic">{{ form.type === 'academic' ? '🎓' : '🏢' }}</span>
              <div>
                <h3>{{ editId() ? 'تعديل قسم' : 'قسم جديد' }}</h3>
                <p>القسم جهة طالبة في المشتريات ومرجع لتعيينات المستخدمين.</p>
              </div>
            </div>
            <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
          </div>

          <!-- الهوية -->
          <div class="fieldset">
            <span class="legend">هوية القسم</span>
            <div class="grid">
              <label class="col-2">اسم القسم <b class="req">*</b>
                <input [(ngModel)]="form.name" placeholder="مثال: تقنية المعلومات" />
              </label>
              <label>الرمز <b class="req">*</b>
                <input class="code-in" [(ngModel)]="form.code" placeholder="IT" />
                <small>رمز مختصر فريد يُستخدم في التقارير.</small>
              </label>
            </div>
            <div class="seg-wrap">
              <span class="seg-label">النوع</span>
              <div class="seg">
                <button type="button" [class.on]="form.type === 'administrative'" (click)="form.type = 'administrative'">🏢 إداري</button>
                <button type="button" [class.on]="form.type === 'academic'" (click)="form.type = 'academic'">🎓 أكاديمي</button>
              </div>
            </div>
          </div>

          <!-- الموضع في الهيكل -->
          <div class="fieldset">
            <span class="legend">الموضع في الهيكل المؤسسي</span>
            <div class="grid">
              <label>الفرع
                <select [(ngModel)]="form.branch">
                  <option [ngValue]="null">— بلا فرع —</option>
                  @for (b of branches(); track b.id) { <option [ngValue]="b.id">{{ b.name }}</option> }
                </select>
              </label>
              <label>القسم الأب
                <select [(ngModel)]="form.parent">
                  <option [ngValue]="null">— قسم رئيسي —</option>
                  @for (d of parentOptions(); track d.id) { <option [ngValue]="d.id">{{ d.name }}</option> }
                </select>
                <small>اتركه فارغاً ليكون قسماً رئيسياً.</small>
              </label>
              <label class="switch-cell">
                <span class="s-title">حالة القسم</span>
                <button type="button" class="switch" [class.on]="form.is_active" (click)="form.is_active = !form.is_active">
                  <span class="knob"></span>
                </button>
                <small>{{ form.is_active ? 'نشط — يظهر في طلبات الشراء' : 'موقوف — مخفي من الاختيارات' }}</small>
              </label>
            </div>
          </div>

          <div class="foot">
            <button class="btn ghost" (click)="closeForm()">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الحفظ…' : (editId() ? 'حفظ التعديل' : 'إضافة القسم') }}
            </button>
          </div>
        </div>
      }

      <!-- مؤشرات الهيكل -->
      <div class="stats">
        <div class="stat"><span class="s-val">{{ all().length }}</span><span class="s-lbl">إجمالي الأقسام</span></div>
        <div class="stat"><span class="s-val">{{ countOf('administrative') }}</span><span class="s-lbl">إدارية</span></div>
        <div class="stat"><span class="s-val">{{ countOf('academic') }}</span><span class="s-lbl">أكاديمية</span></div>
        <div class="stat"><span class="s-val">{{ rootCount() }}</span><span class="s-lbl">أقسام رئيسية</span></div>
      </div>

      <div class="toolbar">
        <input class="search" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="بحث بالاسم أو الرمز…" />
        <div class="chips">
          <button [class.on]="typeFilter()===''" (click)="typeFilter.set('')">الكل</button>
          <button [class.on]="typeFilter()==='administrative'" (click)="typeFilter.set('administrative')">إداري</button>
          <button [class.on]="typeFilter()==='academic'" (click)="typeFilter.set('academic')">أكاديمي</button>
        </div>
      </div>

      <section class="card">
        <div class="row head">
          <span>القسم</span><span>الرمز</span><span>النوع</span>
          <span class="ta-end">الحالة</span><span class="ta-end">إجراء</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="sk"></div> }
        } @else {
          @for (node of tree(); track node.dept.id) {
            <div class="row" [class.child]="node.depth > 0">
              <span class="who" [style.padding-inline-start.px]="node.depth * 22">
                @if (node.depth > 0) { <span class="branch-line" aria-hidden="true">└</span> }
                <span class="ic" [attr.data-t]="node.dept.type">{{ node.dept.type === 'academic' ? '🎓' : '🏢' }}</span>
                <span class="d-name">{{ node.dept.name }}</span>
                @if (node.kids > 0) { <span class="kids">{{ node.kids }} فرعي</span> }
              </span>
              <span class="mono muted">{{ node.dept.code }}</span>
              <span><span class="tag" [attr.data-t]="node.dept.type">{{ typeText(node.dept.type) }}</span></span>
              <span class="ta-end">
                <span class="badge" [attr.data-s]="node.dept.is_active ? 'on' : 'off'">{{ node.dept.is_active ? 'نشط' : 'موقوف' }}</span>
              </span>
              <span class="ta-end actions">
                <button class="act" (click)="openEdit(node.dept)">تعديل</button>
                <button class="act danger" (click)="remove(node.dept)">حذف</button>
              </span>
            </div>
          }
          @if (tree().length === 0) {
            <div class="empty">
              <span class="e-ic">🏢</span>
              <strong>لا توجد أقسام بعد</strong>
              <p>الأقسام هي الجهة الطالبة في طلبات الشراء — ابدأ بإضافة قسم.</p>
            </div>
          }
        }
      </section>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:disabled { opacity: .6; }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 18px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
    .ph-title { display: flex; align-items: center; gap: 12px; }
    .ph-ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-size: 19px;
      background: var(--nb-primary-50); flex: none; }
    .panel-head h3 { margin: 0; font-size: 15.5px; font-weight: 800; color: var(--nb-text); }
    .panel-head p { margin: 2px 0 0; font-size: 12px; color: var(--nb-text-muted); }
    .x { background: none; border: none; font-size: 16px; color: var(--nb-text-muted); cursor: pointer; }

    .fieldset { border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); padding: 16px 14px 14px;
      margin-bottom: 14px; position: relative; }
    .legend { position: absolute; top: -8px; inset-inline-start: 12px; background: var(--nb-surface); padding: 0 8px;
      font-size: 11px; font-weight: 800; color: var(--nb-text-muted); }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    .col-2 { grid-column: span 2; }
    @media (max-width: 720px) { .col-2 { grid-column: span 1; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    label .req { color: var(--nb-danger); }
    label small { font-size: 11px; font-weight: 500; color: var(--nb-text-muted); }
    input, select { font-family: inherit; font-size: 13px; padding: 9px 11px; border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    .code-in { text-transform: uppercase; font-variant-numeric: tabular-nums; letter-spacing: .5px; }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }

    /* مبدّل النوع */
    .seg-wrap { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
    .seg-label { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .seg { display: inline-flex; background: var(--nb-surface-raised); border: 1px solid var(--nb-border);
      border-radius: 10px; padding: 3px; gap: 3px; }
    .seg button { border: none; background: none; padding: 7px 16px; border-radius: 8px; font-family: inherit;
      font-size: 12.5px; font-weight: 700; color: var(--nb-text-secondary); cursor: pointer; }
    .seg button.on { background: var(--nb-surface); color: var(--nb-primary-700); box-shadow: 0 1px 4px rgba(15,23,42,.1); }

    /* مفتاح الحالة */
    .switch-cell { gap: 6px; }
    .s-title { font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .switch { width: 46px; height: 26px; border-radius: 999px; border: none; background: var(--nb-border);
      position: relative; cursor: pointer; padding: 0; transition: background .15s ease; }
    .switch.on { background: #16a34a; }
    .knob { position: absolute; top: 3px; inset-inline-start: 3px; width: 20px; height: 20px; border-radius: 50%;
      background: #fff; transition: inset-inline-start .15s ease; }
    .switch.on .knob { inset-inline-start: 23px; }

    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; padding-top: 14px; border-top: 1px solid var(--nb-border-soft); }

    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 220px; height: 36px; padding: 0 12px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    .chips { display: flex; gap: 6px; }
    .chips button { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); padding: 7px 14px;
      border-radius: 999px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--nb-text-secondary); cursor: pointer; }
    .chips button.on { background: var(--nb-primary-600); color: #fff; border-color: transparent; }

    /* مؤشرات الهيكل */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 720px) { .stats { grid-template-columns: repeat(2, 1fr); } }
    .stat { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
    .s-val { font-size: 22px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .s-lbl { font-size: 12px; color: var(--nb-text-muted); }

    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); overflow: hidden; }
    .row { display: grid; grid-template-columns: 2.4fr 0.8fr 0.9fr 0.8fr 1.1fr; gap: 8px; align-items: center;
      padding: 11px 16px; font-size: 13px; color: var(--nb-text); border-top: 1px solid var(--nb-border-row, var(--nb-border-soft)); }
    .row.head { border-top: none; background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .row:not(.head):hover { background: var(--nb-surface-raised); }
    .row.child { background: color-mix(in srgb, var(--nb-surface-raised) 45%, transparent); }

    .who { display: flex; align-items: center; gap: 9px; font-weight: 600; min-width: 0; }
    .branch-line { color: var(--nb-border); font-size: 13px; flex: none; }
    .ic { width: 30px; height: 30px; border-radius: 9px; flex: none; display: grid; place-items: center; font-size: 15px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); }
    .ic[data-t="academic"] { background: var(--nb-primary-50); border-color: transparent; }
    .d-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .kids { font-size: 10.5px; font-weight: 700; color: var(--nb-text-muted); background: var(--nb-surface-raised);
      border-radius: 999px; padding: 2px 8px; flex: none; }
    .ta-end { text-align: end; } .mono { font-variant-numeric: tabular-nums; font-weight: 600; } .muted { color: var(--nb-text-muted); }
    .tag { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .tag[data-t="academic"] { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .tag[data-t="administrative"] { background: var(--nb-surface-raised); color: var(--nb-text-secondary); }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
    .badge[data-s="on"] { background: #dcfce7; color: #166534; }
    .badge[data-s="off"] { background: #fee2e2; color: #991b1b; }
    .actions { display: flex; justify-content: flex-end; gap: 6px; }
    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 8px; padding: 5px 10px;
      font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--nb-text); cursor: pointer; }
    .act.danger { color: var(--nb-danger); border-color: #fecaca; }
    .empty { padding: 40px 16px; text-align: center; color: var(--nb-text-muted); }
    .empty .e-ic { font-size: 38px; display: block; margin-bottom: 10px; }
    .empty strong { display: block; color: var(--nb-text); font-size: 14.5px; margin-bottom: 4px; }
    .empty p { margin: 0; font-size: 12.5px; }
    .sk { height: 46px; border-top: 1px solid var(--nb-border-soft);
      background: linear-gradient(90deg, var(--nb-surface-raised), var(--nb-surface), var(--nb-surface-raised));
      background-size: 200% 100%; animation: sh 1.2s infinite; }
    @keyframes sh { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `]
})
export class OrgDepartmentsComponent implements OnInit {
  private svc = inject(OrganizationService);
  private dialog = inject(MatDialog);
  private notify = inject(NotificationService);

  readonly all = signal<Department[]>([]);
  readonly branches = signal<any[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal(false);
  readonly editId = signal<string | null>(null);
  readonly q = signal('');
  readonly typeFilter = signal('');

  form: Partial<Department> = this.blank();

  readonly filtered = computed(() => {
    const term = this.q().trim();
    const t = this.typeFilter();
    return this.all().filter(d =>
      (!t || d.type === t) &&
      (!term || d.name.includes(term) || (d.code || '').toLowerCase().includes(term.toLowerCase())));
  });

  /** خيارات القسم الأب — دون القسم قيد التعديل (منع التداخل الدائري). */
  readonly parentOptions = computed(() => this.all().filter(d => d.id !== this.editId()));

  /**
   * ترتيب هرمي مسطّح للعرض: كل قسم رئيسي يتبعه أبناؤه بإزاحة.
   * الأقسام التي غاب أبوها عن نتيجة التصفية تُعرض كجذور حتى لا تختفي.
   */
  readonly tree = computed(() => {
    const list = this.filtered();
    const ids = new Set(list.map(d => d.id));
    const out: { dept: Department; depth: number; kids: number }[] = [];
    const seen = new Set<string>();

    const walk = (d: Department, depth: number) => {
      if (seen.has(d.id)) return; // حماية من التداخل الدائري
      seen.add(d.id);
      const kids = list.filter(x => x.parent === d.id);
      out.push({ dept: d, depth, kids: kids.length });
      kids.forEach(k => walk(k, depth + 1));
    };

    list.filter(d => !d.parent || !ids.has(d.parent)).forEach(r => walk(r, 0));
    // أي عنصر لم يُزَر (حلقة مغلقة) يُضاف في النهاية
    list.filter(d => !seen.has(d.id)).forEach(d => walk(d, 0));
    return out;
  });

  countOf(type: string): number { return this.all().filter(d => d.type === type).length; }
  rootCount(): number { return this.all().filter(d => !d.parent).length; }

  ngOnInit() {
    this.load();
    this.svc.getBranches().subscribe({
      next: (d: any) => this.branches.set(this.pick(d)),
      error: () => {},
    });
  }

  private pick(d: any): any[] {
    return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
  }

  blank(): Partial<Department> {
    return { name: '', code: '', type: 'administrative', branch: null, parent: null, is_active: true };
  }

  load() {
    this.loading.set(true);
    this.svc.getDepartments().subscribe({
      next: (d: any) => { this.all.set(this.pick(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  nameOf(id?: string | null): string {
    if (!id) return '—';
    return this.all().find(d => d.id === id)?.name || '—';
  }

  initial(n: string) { return (n || '؟').trim().charAt(0); }
  typeText(t: string) { return t === 'academic' ? 'أكاديمي' : 'إداري'; }

  openCreate() {
    if (this.editing()) { this.closeForm(); return; }
    this.form = this.blank();
    this.editId.set(null);
    this.editing.set(true);
  }

  openEdit(d: Department) {
    this.form = { name: d.name, code: d.code, type: d.type, branch: d.branch ?? null, parent: d.parent ?? null, is_active: d.is_active };
    this.editId.set(d.id);
    this.editing.set(true);
  }

  closeForm() { this.editing.set(false); this.editId.set(null); }

  save() {
    if (!this.form.name?.trim()) { this.notify.error('أدخل اسم القسم.'); return; }
    if (!this.form.code?.trim()) { this.notify.error('أدخل رمز القسم.'); return; }
    this.saving.set(true);
    const id = this.editId();
    const req = id ? this.svc.updateDepartment(id, this.form) : this.svc.createDepartment(this.form);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success(id ? 'تم حفظ تعديل القسم.' : 'تم إضافة القسم.');
        this.closeForm();
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.details?.error?.message || e?.details?.detail || e?.message || 'تعذّر حفظ القسم.');
      },
    });
  }

  async remove(d: Department) {
    const ok = await new Promise<boolean>(resolve =>
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'حذف القسم',
          message: `سيتم حذف القسم «${d.name}». لن يظهر في طلبات الشراء وتعيينات المستخدمين.`,
          confirmText: 'حذف', color: 'warn',
        } as ConfirmDialogData,
      }).afterClosed().subscribe(v => resolve(!!v)));
    if (!ok) return;
    this.svc.deleteDepartment(d.id).subscribe({
      next: () => { this.notify.success('تم حذف القسم.'); this.load(); },
      error: () => this.notify.error('تعذّر حذف القسم.'),
    });
  }
}
