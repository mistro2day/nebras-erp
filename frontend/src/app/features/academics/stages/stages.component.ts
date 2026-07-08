import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/**
 * المراحل التعليمية — وحدة عاملة مربوطة بـ academics/stages/.
 * النظام السوداني: رياض الأطفال (سنتان) ← مرحلة الأساس (8 سنوات) ← المرحلة الثانوية (3 سنوات).
 */
@Component({
  selector: 'app-academic-stages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="المراحل التعليمية" subtitle="مراحل النظام التعليمي السوداني: رياض الأطفال، الأساس، الثانوي.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())">{{ adding() ? 'إغلاق' : 'إضافة مرحلة' }}</button>
      </nb-page-header>

      @if (adding()) {
        <nb-panel title="مرحلة جديدة" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>اسم المرحلة</label><input [(ngModel)]="f.name" placeholder="مثال: مرحلة الأساس" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="BASIC" /></div>
            <div class="fld"><label>الترتيب</label><input type="number" min="1" [(ngModel)]="f.order" /></div>
            <div class="fld"><label>أدنى عمر</label><input type="number" min="0" [(ngModel)]="f.minimum_age" /></div>
            <div class="fld"><label>أقصى عمر</label><input type="number" min="0" [(ngModel)]="f.maximum_age" /></div>
            <div class="form-actions">
              <button class="nb-btn-primary" (click)="save()" [disabled]="saving() || !valid()">{{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
            </div>
          </div>
          <p class="hint">أمثلة سودانية: رياض الأطفال (4–6 سنوات)، الأساس (6–14)، الثانوي (14–17).</p>
          @if (error()) { <p class="hint" style="color:var(--nb-danger)">{{ error() }}</p> }
        </nb-panel>
      }

      <div class="toolbar"><div class="search"><input [(ngModel)]="q" placeholder="بحث بالاسم أو الرمز…" /></div></div>

      <nb-panel [flush]="true">
        <div class="tbl">
          <div class="tbl-head" style="grid-template-columns:0.6fr 1.6fr 1fr 1fr 1fr 0.8fr">
            <span>الترتيب</span><span>المرحلة</span><span>الرمز</span><span>أدنى عمر</span><span>أقصى عمر</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (s of filtered(); track s.id) {
              <div class="tbl-row" style="grid-template-columns:0.6fr 1.6fr 1fr 1fr 1fr 0.8fr">
                <span class="mono">{{ s.order }}</span>
                <span class="strong">{{ s.name }}</span>
                <span class="mono">{{ s.code }}</span>
                <span class="mono">{{ s.minimum_age }}</span>
                <span class="mono">{{ s.maximum_age }}</span>
                <span class="row-actions"><button class="nb-btn-danger sm" (click)="remove(s)">حذف</button></span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد مراحل. أضِف مراحل النظام السوداني للبدء.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES],
})
export class AcademicStagesComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');
  q = '';

  f = { name: '', code: '', order: 1, minimum_age: 6, maximum_age: 14 };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    return this.rows().filter((x) => !s || `${x.name} ${x.code}`.toLowerCase().includes(s));
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getStages().subscribe({
      next: (res) => { this.rows.set(pickList(res)); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  valid(): boolean { return !!this.f['name'] && !!this.f['code']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createStage(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { name: '', code: '', order: 1, minimum_age: 6, maximum_age: 14 }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(s: any): void {
    const data: ConfirmDialogData = { title: 'حذف المرحلة', message: `حذف «${s.name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteStage(s.id).subscribe({ next: () => this.load() });
    });
  }
}
