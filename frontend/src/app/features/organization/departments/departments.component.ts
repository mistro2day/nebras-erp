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
            <h3>{{ editId() ? 'تعديل قسم' : 'قسم جديد' }}</h3>
            <button class="x" (click)="closeForm()" aria-label="إغلاق">✕</button>
          </div>
          <div class="grid">
            <label>اسم القسم <span>*</span>
              <input [(ngModel)]="form.name" placeholder="مثال: تقنية المعلومات" />
            </label>
            <label>الرمز <span>*</span>
              <input [(ngModel)]="form.code" placeholder="IT" />
            </label>
            <label>النوع
              <select [(ngModel)]="form.type">
                <option value="administrative">إداري</option>
                <option value="academic">أكاديمي</option>
              </select>
            </label>
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
            </label>
            <label class="chk">
              <input type="checkbox" [(ngModel)]="form.is_active" /> نشط
            </label>
          </div>
          <div class="foot">
            <button class="btn ghost" (click)="closeForm()">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الحفظ…' : (editId() ? 'حفظ التعديل' : 'إضافة القسم') }}
            </button>
          </div>
        </div>
      }

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
          <span>القسم</span><span>الرمز</span><span>النوع</span><span>القسم الأب</span>
          <span class="ta-end">الحالة</span><span class="ta-end">إجراء</span>
        </div>
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) { <div class="sk"></div> }
        } @else {
          @for (d of filtered(); track d.id) {
            <div class="row">
              <span class="who"><span class="ava">{{ initial(d.name) }}</span>{{ d.name }}</span>
              <span class="mono muted">{{ d.code }}</span>
              <span><span class="tag" [attr.data-t]="d.type">{{ typeText(d.type) }}</span></span>
              <span class="muted">{{ nameOf(d.parent) }}</span>
              <span class="ta-end">
                <span class="badge" [attr.data-s]="d.is_active ? 'on' : 'off'">{{ d.is_active ? 'نشط' : 'موقوف' }}</span>
              </span>
              <span class="ta-end actions">
                <button class="act" (click)="openEdit(d)">تعديل</button>
                <button class="act danger" (click)="remove(d)">حذف</button>
              </span>
            </div>
          }
          @if (filtered().length === 0) {
            <div class="empty">لا توجد أقسام مطابقة. ابدأ بإضافة قسم جديد.</div>
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
      padding: 16px; margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--nb-text); }
    .x { background: none; border: none; font-size: 16px; color: var(--nb-text-muted); cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    label span { color: var(--nb-danger); }
    label.chk { flex-direction: row; align-items: center; gap: 8px; align-self: end; padding-bottom: 8px; }
    input, select { font-family: inherit; font-size: 13px; padding: 8px 10px; border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    input[type=checkbox] { width: 16px; height: 16px; padding: 0; }
    input:focus, select:focus { outline: none; border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(63,81,181,0.12); }
    .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--nb-border-soft); }

    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
    .search { flex: 1; min-width: 220px; height: 36px; padding: 0 12px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); }
    .chips { display: flex; gap: 6px; }
    .chips button { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); padding: 7px 14px;
      border-radius: 999px; font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--nb-text-secondary); cursor: pointer; }
    .chips button.on { background: var(--nb-primary-600); color: #fff; border-color: transparent; }

    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); overflow: hidden; }
    .row { display: grid; grid-template-columns: 1.8fr 0.8fr 0.8fr 1.2fr 0.8fr 1.1fr; gap: 8px; align-items: center;
      padding: 11px 16px; font-size: 13px; color: var(--nb-text); border-top: 1px solid var(--nb-border-row, var(--nb-border-soft)); }
    .row.head { border-top: none; background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .row:not(.head):hover { background: var(--nb-surface-raised); }
    .who { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .ava { width: 32px; height: 32px; border-radius: 9px; flex: none; background: var(--nb-primary-50);
      color: var(--nb-primary-700); display: grid; place-items: center; font-weight: 800; font-size: 14px; }
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
    .empty { padding: 34px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
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
        this.notify.error(e?.error?.error?.message || e?.error?.detail || 'تعذّر حفظ القسم.');
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
