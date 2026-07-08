import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/** المواد الدراسية — وحدة عاملة مربوطة بـ academics/subjects/. */
@Component({
  selector: 'app-academic-subjects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="المواد الدراسية" subtitle="مواد المنهج مع الحصص الأسبوعية ودرجات النجاح والنهاية العظمى.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())">{{ adding() ? 'إغلاق' : 'إضافة مادة' }}</button>
      </nb-page-header>

      @if (adding()) {
        <nb-panel title="مادة جديدة" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>الاسم بالعربية</label><input [(ngModel)]="f.arabic_name" placeholder="مثال: الرياضيات" /></div>
            <div class="fld"><label>الاسم بالإنجليزية</label><input [(ngModel)]="f.english_name" placeholder="Mathematics" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="MATH" /></div>
            <div class="fld"><label>الحصص الأسبوعية</label><input type="number" min="0" [(ngModel)]="f.weekly_periods" /></div>
            <div class="fld"><label>درجة النجاح</label><input type="number" min="0" [(ngModel)]="f.passing_mark" /></div>
            <div class="fld"><label>النهاية العظمى</label><input type="number" min="0" [(ngModel)]="f.maximum_mark" /></div>
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
          <div class="tbl-head" style="grid-template-columns:1.5fr 1.3fr 0.8fr 0.9fr 0.9fr 0.9fr 0.8fr">
            <span>المادة</span><span>English</span><span>الرمز</span><span>حصص/أسبوع</span><span>النجاح</span><span>العظمى</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (s of filtered(); track s.id) {
              <div class="tbl-row" style="grid-template-columns:1.5fr 1.3fr 0.8fr 0.9fr 0.9fr 0.9fr 0.8fr">
                <span class="strong">{{ s.arabic_name }}</span>
                <span>{{ s.english_name || '—' }}</span>
                <span class="mono">{{ s.code }}</span>
                <span class="mono">{{ s.weekly_periods }}</span>
                <span class="mono">{{ s.passing_mark }}</span>
                <span class="mono">{{ s.maximum_mark }}</span>
                <span class="row-actions"><button class="nb-btn-danger sm" (click)="remove(s)">حذف</button></span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد مواد.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES],
})
export class AcademicSubjectsComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');
  q = '';

  f = { arabic_name: '', english_name: '', code: '', weekly_periods: 5, passing_mark: 50, maximum_mark: 100 };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    return this.rows().filter((x) => !s || `${x.arabic_name} ${x.english_name ?? ''} ${x.code}`.toLowerCase().includes(s));
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getSubjects().subscribe({
      next: (res) => { this.rows.set(pickList(res)); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  valid(): boolean { return !!this.f['arabic_name'] && !!this.f['code']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createSubject(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { arabic_name: '', english_name: '', code: '', weekly_periods: 5, passing_mark: 50, maximum_mark: 100 }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(s: any): void {
    const data: ConfirmDialogData = { title: 'حذف المادة', message: `حذف «${s.arabic_name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteSubject(s.id).subscribe({ next: () => this.load() });
    });
  }
}
