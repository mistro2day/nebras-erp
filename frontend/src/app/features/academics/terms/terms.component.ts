import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/** الفصول الدراسية — وحدة عاملة مربوطة بـ academics/terms/ ضمن السنوات الدراسية. */
@Component({
  selector: 'app-academic-terms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent, NbDatepickerComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الفصول الدراسية" subtitle="فصول كل عام دراسي (الفصل الأول/الثاني) بتواريخها وحالتها.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())" [disabled]="years().length === 0">{{ adding() ? 'إغلاق' : 'إضافة فصل' }}</button>
      </nb-page-header>

      @if (years().length === 0 && !loading()) {
        <nb-panel style="margin-bottom:16px"><p class="hint">لا توجد سنوات دراسية بعد. أنشئ عامًا دراسيًا أولًا من صفحة «السنوات الدراسية».</p></nb-panel>
      }

      @if (adding()) {
        <nb-panel title="فصل جديد" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>العام الدراسي</label>
              <select [(ngModel)]="f.academic_year"><option value="">اختر…</option>
                @for (y of years(); track y.id) { <option [value]="y.id">{{ y.name }}</option> }
              </select>
            </div>
            <div class="fld req"><label>اسم الفصل</label><input [(ngModel)]="f.name" placeholder="الفصل الدراسي الأول" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="T1" /></div>
            <div class="fld req"><label>البداية</label><nb-datepicker [(value)]="f.start_date" ariaLabel="بداية الفصل"></nb-datepicker></div>
            <div class="fld req"><label>النهاية</label><nb-datepicker [(value)]="f.end_date" ariaLabel="نهاية الفصل"></nb-datepicker></div>
            <div class="fld"><label>الترتيب</label><input type="number" min="1" [(ngModel)]="f.order" /></div>
            <div class="fld"><label>الحالة</label>
              <select [(ngModel)]="f.status"><option value="upcoming">قادم</option><option value="active">نشط</option><option value="completed">مكتمل</option></select>
            </div>
            <div class="form-actions">
              <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
            </div>
          </div>
          @if (error()) { <p class="hint" style="color:var(--nb-danger)">{{ error() }}</p> }
        </nb-panel>
      }

      <div class="toolbar"><div class="search"><input [(ngModel)]="q" placeholder="بحث بالاسم أو الرمز…" /></div></div>

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head" style="grid-template-columns:1.4fr 1.2fr 0.8fr 1fr 1fr 1fr 0.8fr">
            <span>الفصل</span><span>العام</span><span>الرمز</span><span>البداية</span><span>النهاية</span><span>الحالة</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (t of filtered(); track t.id) {
              <div class="tbl-row" style="grid-template-columns:1.4fr 1.2fr 0.8fr 1fr 1fr 1fr 0.8fr">
                <span class="strong">{{ t.name }}</span>
                <span>{{ yearName(t.academic_year) }}</span>
                <span class="mono">{{ t.code }}</span>
                <span class="mono">{{ t.start_date }}</span>
                <span class="mono">{{ t.end_date }}</span>
                <span><span [class]="badge(t.status)">{{ statusText(t.status) }}</span></span>
                <span class="row-actions"><button class="nb-btn-danger sm" (click)="remove(t)">حذف</button></span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد فصول دراسية.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES],
})
export class AcademicTermsComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly years = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');
  q = '';

  f = { academic_year: '', name: '', code: '', start_date: '', end_date: '', order: 1, status: 'upcoming' };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    return this.rows().filter((x) => !s || `${x.name} ${x.code}`.toLowerCase().includes(s));
  });

  ngOnInit(): void {
    this.svc.getAcademicYears().subscribe((res) => this.years.set(pickList(res)));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getTerms().subscribe({
      next: (res) => { this.rows.set(pickList(res)); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  yearName(id: string): string { return this.years().find((y) => y.id === id)?.name || '—'; }
  valid(): boolean { return !!this.f['academic_year'] && !!this.f['name'] && !!this.f['code'] && !!this.f['start_date'] && !!this.f['end_date']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createTerm(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { academic_year: '', name: '', code: '', start_date: '', end_date: '', order: 1, status: 'upcoming' }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(t: any): void {
    const data: ConfirmDialogData = { title: 'حذف الفصل', message: `حذف «${t.name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteTerm(t.id).subscribe({ next: () => this.load() });
    });
  }

  badge(s: string): string { return { active: 'nb-badge-success', upcoming: 'nb-badge-info', completed: 'nb-badge-neutral' }[s] || 'nb-badge-neutral'; }
  statusText(s: string): string { return { active: 'نشط', upcoming: 'قادم', completed: 'مكتمل' }[s] || s; }
}
