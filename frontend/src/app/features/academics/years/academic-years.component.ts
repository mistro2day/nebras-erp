import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
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
  styles: [ACADEMIC_PAGE_STYLES + `.chk { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:var(--nb-text); height:36px; } .chk input { width:16px; height:16px; accent-color: var(--nb-primary-600); }`],
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
