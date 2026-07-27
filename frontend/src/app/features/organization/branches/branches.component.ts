import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationService, Branch } from '../organization.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../../core/services/notification.service';

/** إدارة فروع/مدارس المستأجر (بنين / بنات / مشتركة). */
@Component({
  selector: 'app-org-branches',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="فروع ومدارس المؤسسة"
        subtitle="إدارة الفروع المدرسية (بنين / بنات / مشتركة) المستخدمة في القبول والتسجيل والتقارير.">
        <button class="btn primary" (click)="openNew()">+ إضافة فرع</button>
      </nb-page-header>

      <!-- شريط إحصاء -->
      <div class="stat-row">
        <div class="stat"><span class="s-val">{{ branches().length }}</span><span class="s-lbl">إجمالي الفروع</span></div>
        <div class="stat boys"><span class="s-val">{{ countByType('boys') }}</span><span class="s-lbl">مدارس بنين</span></div>
        <div class="stat girls"><span class="s-val">{{ countByType('girls') }}</span><span class="s-lbl">مدارس بنات</span></div>
      </div>

      @if (loading()) {
        <div class="empty">جارٍ تحميل الفروع…</div>
      } @else if (branches().length === 0) {
        <div class="empty">لا توجد فروع بعد. أضف فرع البنين وفرع البنات للبدء.</div>
      } @else {
        <div class="cards">
          @for (b of branches(); track b.id) {
            <article class="branch-card" [class.g-boys]="b.school_gender_type === 'boys'"
                     [class.g-girls]="b.school_gender_type === 'girls'">
              <div class="bc-head">
                <span class="bc-ic">{{ typeIcon(b.school_gender_type) }}</span>
                <div class="bc-titles">
                  <b>{{ b.name_ar || b.name }}</b>
                  <span class="bc-type">{{ typeLabel(b.school_gender_type) }}</span>
                </div>
                <span class="bc-status" [class.on]="b.is_active">{{ b.is_active ? 'نشط' : 'معطّل' }}</span>
              </div>
              <div class="bc-meta">
                <span><b>الرمز:</b> {{ b.code }}</span>
                @if (b.city) { <span><b>المدينة:</b> {{ b.city }}</span> }
              </div>
              <div class="bc-actions">
                <button class="btn sm ghost" (click)="openEdit(b)">تعديل</button>
                <button class="btn sm danger" (click)="remove(b)">حذف</button>
              </div>
            </article>
          }
        </div>
      }

      <!-- مودال الإضافة/التعديل -->
      @if (editing()) {
        <div class="overlay" (click)="editing.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ form.id ? 'تعديل الفرع' : 'إضافة فرع جديد' }}</h3>
            <div class="fields">
              <label>اسم الفرع (عربي)
                <input [(ngModel)]="form.name_ar" placeholder="مثال: فرع البنين" />
              </label>
              <label>الرمز
                <input [(ngModel)]="form.code" placeholder="مثال: BR-BOYS" [disabled]="!!form.id" />
              </label>
              <label>نوع المدرسة
                <select [(ngModel)]="form.school_gender_type">
                  <option value="boys">مدرسة بنين</option>
                  <option value="girls">مدرسة بنات</option>
                  <option value="coed">مشتركة (بنين وبنات)</option>
                </select>
              </label>
              <label>المدينة
                <input [(ngModel)]="form.city" placeholder="الخرطوم" />
              </label>
              <label class="chk">
                <input type="checkbox" [(ngModel)]="form.is_active" /> فرع نشط
              </label>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="editing.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving() || !form.name_ar || !form.code" (click)="save()">
                {{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.sm { height: 28px; padding: 0 12px; font-size: 12px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.danger { background: transparent; border: 1px solid var(--nb-danger); color: var(--nb-danger); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; position: relative; overflow: hidden; }
    .stat::before { content:''; position:absolute; inset-block:0; inset-inline-start:0; width:4px; background: var(--nb-primary-600); }
    .stat.boys::before { background: #2563eb; }
    .stat.girls::before { background: #db2777; }
    .s-val { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .s-lbl { font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }

    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .branch-card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .bc-head { display: flex; align-items: center; gap: 10px; }
    .bc-ic { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-size: 20px; background: var(--nb-bg); }
    .g-boys .bc-ic { background: color-mix(in srgb, #2563eb 12%, transparent); }
    .g-girls .bc-ic { background: color-mix(in srgb, #db2777 12%, transparent); }
    .bc-titles { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
    .bc-titles b { font-weight: 800; }
    .bc-type { font-size: 12px; color: var(--nb-text-muted); }
    .bc-status { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 99px;
      background: var(--nb-bg); color: var(--nb-text-muted); }
    .bc-status.on { background: color-mix(in srgb, var(--nb-success) 14%, transparent); color: var(--nb-success); }
    .bc-meta { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--nb-text-muted); }
    .bc-meta b { color: var(--nb-text); font-weight: 600; }
    .bc-actions { display: flex; gap: 8px; }

    .empty { text-align: center; padding: 40px; color: var(--nb-text-muted); background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }

    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center;
      justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--nb-surface); border-radius: var(--nb-radius-card); padding: 22px; width: 100%;
      max-width: 440px; box-shadow: 0 20px 40px rgba(0,0,0,.25); }
    .modal h3 { margin: 0 0 16px; font-size: 16px; }
    .fields { display: flex; flex-direction: column; gap: 12px; }
    .fields label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .fields label.chk { flex-direction: row; align-items: center; gap: 8px; }
    .fields input:not([type=checkbox]), .fields select { height: 38px; border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius); padding: 0 12px; font-family: inherit; font-size: 13px;
      background: var(--nb-surface); color: var(--nb-text); outline: none; }
    .fields input:focus, .fields select:focus { border-color: var(--nb-primary-500); }
    .fields input:disabled { opacity: .6; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  `]
})
export class OrgBranchesComponent implements OnInit {
  private svc = inject(OrganizationService);
  private notify = inject(NotificationService);

  readonly branches = signal<Branch[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editing = signal<Branch | null>(null);

  form: Partial<Branch> = this.blank();

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getBranches().subscribe({
      next: (res) => {
        this.branches.set((res?.data ?? res ?? []) as Branch[]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  countByType(t: string): number {
    return this.branches().filter(b => b.school_gender_type === t).length;
  }

  typeLabel(t: string): string {
    return t === 'boys' ? 'مدرسة بنين' : t === 'girls' ? 'مدرسة بنات' : 'مشتركة';
  }
  typeIcon(t: string): string {
    return t === 'boys' ? '👦' : t === 'girls' ? '👧' : '🏫';
  }

  private blank(): Partial<Branch> {
    return { name_ar: '', code: '', school_gender_type: 'boys', is_active: true, city: '', country: 'السودان' };
  }

  openNew(): void {
    this.form = this.blank();
    this.editing.set({} as Branch);
  }

  openEdit(b: Branch): void {
    this.form = { ...b };
    this.editing.set(b);
  }

  save(): void {
    this.saving.set(true);
    // الاسم الإنجليزي والاسم الأساسي يتبعان العربي إن لم يُحدّدا
    const body: Partial<Branch> = { ...this.form, name: this.form.name_ar || this.form.name };
    const done = () => {
      this.saving.set(false);
      this.editing.set(null);
      this.load();
    };
    const fail = () => { this.saving.set(false); this.notify.error('تعذّر حفظ الفرع.'); };
    if (this.form.id) {
      this.svc.updateBranch(this.form.id, body).subscribe({
        next: () => { this.notify.success('تم تحديث الفرع.'); done(); }, error: fail,
      });
    } else {
      this.svc.createBranch(body).subscribe({
        next: () => { this.notify.success('تمت إضافة الفرع.'); done(); }, error: fail,
      });
    }
  }

  remove(b: Branch): void {
    if (!confirm(`حذف «${b.name_ar || b.name}»؟`)) return;
    this.svc.deleteBranch(b.id).subscribe({
      next: () => { this.notify.success('تم حذف الفرع.'); this.load(); },
      error: () => this.notify.error('تعذّر الحذف — قد يكون الفرع مرتبطاً بطلاب.'),
    });
  }
}
