import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AcademicsService } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ACADEMIC_PAGE_STYLES, pickList } from '../shared/academics.shared';

/**
 * الصفوف الدراسية — وحدة عاملة مربوطة بـ academics/grades/ ضمن المراحل.
 * السياق السوداني: الأول–الثامن أساس، والأول–الثالث ثانوي.
 */
@Component({
  selector: 'app-academic-grades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="الصفوف الدراسية" subtitle="الصفوف داخل كل مرحلة تعليمية مع الطاقة الاستيعابية ونسبة النجاح.">
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
        <button class="nb-btn-primary" (click)="adding.set(!adding())" [disabled]="stages().length === 0">{{ adding() ? 'إغلاق' : 'إضافة صف' }}</button>
      </nb-page-header>

      @if (stages().length === 0 && !loading()) {
        <nb-panel style="margin-bottom:16px"><p class="hint">لا توجد مراحل تعليمية بعد. أنشئ المراحل أولًا من صفحة «المراحل التعليمية».</p></nb-panel>
      }

      @if (adding()) {
        <nb-panel title="صف جديد" style="margin-bottom:16px">
          <div class="add-form">
            <div class="fld req"><label>المرحلة</label>
              <select [(ngModel)]="f.stage"><option value="">اختر…</option>
                @for (s of stages(); track s.id) { <option [value]="s.id">{{ s.name }}</option> }
              </select>
            </div>
            <div class="fld req"><label>اسم الصف</label><input [(ngModel)]="f.name" placeholder="مثال: الصف الأول أساس" /></div>
            <div class="fld req"><label>الرمز</label><input [(ngModel)]="f.code" placeholder="G1" /></div>
            <div class="fld"><label>الترتيب</label><input type="number" min="1" [(ngModel)]="f.order" /></div>
            <div class="fld"><label>نسبة النجاح %</label><input type="number" min="0" max="100" [(ngModel)]="f.passing_percentage" /></div>
            <div class="fld"><label>الطاقة الاستيعابية</label><input type="number" min="0" [(ngModel)]="f.max_capacity" /></div>
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
          <div class="tbl-head" style="grid-template-columns:1.5fr 1.2fr 0.8fr 0.7fr 1fr 1fr 0.8fr">
            <span>الصف</span><span>المرحلة</span><span>الرمز</span><span>الترتيب</span><span>نسبة النجاح</span><span>السعة</span><span>إجراءات</span>
          </div>
          @if (loading()) { <div class="tbl-empty">جارٍ التحميل…</div> }
          @else {
            @for (g of filtered(); track g.id) {
              <div class="tbl-row" style="grid-template-columns:1.5fr 1.2fr 0.8fr 0.7fr 1fr 1fr 0.8fr">
                <span class="strong">{{ g.name }}</span>
                <span>{{ stageName(g.stage) }}</span>
                <span class="mono">{{ g.code }}</span>
                <span class="mono">{{ g.order }}</span>
                <span class="mono">{{ g.passing_percentage }}%</span>
                <span class="mono">{{ g.max_capacity }}</span>
                <span class="row-actions"><button class="nb-btn-danger sm" (click)="remove(g)">حذف</button></span>
              </div>
            }
            @if (filtered().length === 0) { <div class="tbl-empty">لا توجد صفوف.</div> }
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [ACADEMIC_PAGE_STYLES],
})
export class AcademicGradesComponent implements OnInit {
  private readonly svc = inject(AcademicsService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<any[]>([]);
  readonly stages = signal<any[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly adding = signal(false);
  readonly error = signal('');
  q = '';

  f = { stage: '', name: '', code: '', order: 1, passing_percentage: 50, max_capacity: 40 };

  readonly filtered = computed(() => {
    const s = this.q.trim().toLowerCase();
    return this.rows().filter((x) => !s || `${x.name} ${x.code}`.toLowerCase().includes(s));
  });

  ngOnInit(): void {
    this.svc.getStages().subscribe((res) => this.stages.set(pickList(res)));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getGrades().subscribe({
      next: (res) => { this.rows.set(pickList(res)); this.loading.set(false); },
      error: () => { this.rows.set([]); this.loading.set(false); },
    });
  }

  stageName(id: string): string { return this.stages().find((s) => s.id === id)?.name || '—'; }
  valid(): boolean { return !!this.f['stage'] && !!this.f['name'] && !!this.f['code']; }

  save(): void {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.svc.createGrade(this.f).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.f = { stage: '', name: '', code: '', order: 1, passing_percentage: 50, max_capacity: 40 }; this.load(); },
      error: (e) => { this.saving.set(false); this.error.set(e?.error?.message || 'تعذّر الحفظ.'); },
    });
  }

  remove(g: any): void {
    const data: ConfirmDialogData = { title: 'حذف الصف', message: `حذف «${g.name}»؟`, color: 'warn' };
    this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => {
      if (ok) this.svc.deleteGrade(g.id).subscribe({ next: () => this.load() });
    });
  }
}
