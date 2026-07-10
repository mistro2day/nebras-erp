import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/** الشعب الدراسية — وحدة عاملة مربوطة بـ academics/sections/ ضمن الصفوف. */
@Component({
  selector: 'app-academic-sections',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الفصول الدراسية" subtitle="فصول كل صف مع الطاقة الاستيعابية والفترة والنوع.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())" [disabled]="grades().length === 0">{{ adding() ? 'إغلاق' : 'إضافة فصل جديد' }}</button>
      </nb-page-header>

      @if (grades().length === 0 && !loading()) {
        <nb-panel style="margin-bottom:16px"><p class="hint">لا توجد صفوف بعد. أنشئ الصفوف أولًا من صفحة «الصفوف الدراسية».</p></nb-panel>
      }

      @if (adding()) {
        <nb-panel title="فصل جديد" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>الصف</label>
              <select [(ngModel)]="f.grade"><option value="">اختر…</option>
                @for (g of grades(); track g.id) { <option [value]="g.id">{{ g.name }}</option> }
              </select>
            </div>
            <div class="fld req"><label>اسم الفصل</label><input [(ngModel)]="f.name" placeholder="مثال: الصف الأول عثمان" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="A" /></div>
            <div class="fld"><label>الطاقة الاستيعابية</label><input type="number" min="0" [(ngModel)]="f.capacity" /></div>
            <div class="fld"><label>النوع</label>
              <select [(ngModel)]="f.gender"><option value="male">بنين</option><option value="female">بنات</option><option value="mixed">مختلط</option></select>
            </div>
            <div class="fld"><label>الفترة</label><input [(ngModel)]="f.academic_shift" placeholder="صباحية" /></div>
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
          <div class="tbl-head" style="grid-template-columns:1.3fr 1.3fr 0.7fr 0.8fr 0.9fr 1fr 0.8fr">
            <span>الفصل</span><span>الصف</span><span>الرمز</span><span>السعة</span><span>النوع</span><span>الفترة</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (s of filtered(); track s.id) {
              <div class="tbl-row" style="grid-template-columns:1.3fr 1.3fr 0.7fr 0.8fr 0.9fr 1fr 0.8fr">
                <span class="strong">{{ s.name }}</span>
                <span>{{ gradeName(s.grade) }}</span>
                <span class="mono">{{ s.code }}</span>
                <span class="mono">{{ s.capacity }}</span>
                <span>{{ genderText(s.gender) }}</span>
                <span>{{ s.academic_shift }}</span>
                <span class="row-actions"><button class="nb-btn-danger sm" (click)="remove(s)">حذف</button></span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد شعب.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES],
})
export class AcademicSectionsComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');
  q = '';

  f = { grade: '', name: '', code: '', capacity: 30, gender: 'mixed', academic_shift: 'صباحية' };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    return this.rows().filter((x) => !s || `${x.name} ${x.code}`.toLowerCase().includes(s));
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
  genderText(g: string): string { return { male: 'بنين', female: 'بنات', mixed: 'مختلط' }[g] || g; }
  valid(): boolean { return !!this.f['grade'] && !!this.f['name'] && !!this.f['code']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createSection(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { grade: '', name: '', code: '', capacity: 30, gender: 'mixed', academic_shift: 'صباحية' }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(s: any): void {
    const data: ConfirmDialogData = { title: 'حذف الفصل', message: `حذف «${s.name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteSection(s.id).subscribe({ next: () => this.load() });
    });
  }
}
