import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { GradingScheme, GradeScale } from '../examinations.types';

/** سلالم التقديرات — مخططات التقديرات وفئاتها (A/B/C/D) وقيم الـ GPA. */
@Component({
  selector: 'app-grading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="سلالم التقديرات والمعدلات" subtitle="مخططات التقديرات وفئاتها ونطاقاتها المئوية وقيم الـ GPA المقابلة.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="cols">
        <nb-panel title="المخططات" subtitle="لكل مؤسسة/مرحلة مخطط تقدير.">
          <div class="mini-form">
            <input class="fld" placeholder="اسم المخطط" [(ngModel)]="schForm.name" />
            <input class="fld sm" placeholder="الرمز" [(ngModel)]="schForm.code" />
            <button class="btn primary sm" (click)="addScheme()">إضافة</button>
          </div>
          <div class="list">
            @for (s of schemes(); track s.id) {
              <button class="item" [class.sel]="s.id === selected()" (click)="selected.set(s.id)">
                <div class="grow"><strong>{{ s.name }}</strong><small>{{ s.code }}</small></div>
                <span class="num">{{ scalesFor(s.id).length }}</span>
              </button>
            }
            @if (!schemes().length) { <div class="empty">لا مخططات بعد.</div> }
          </div>
        </nb-panel>

        <nb-panel [title]="selected() ? 'فئات: ' + schemeName(selected()) : 'فئات التقدير'" subtitle="حرف التقدير، النطاق المئوي، وقيمة GPA.">
          @if (!selected()) { <div class="empty">اختر مخططًا لعرض فئاته.</div> }
          @else {
            <div class="grid">
              <label>الحرف<input class="fld" [(ngModel)]="gForm.grade_letter" placeholder="A" /></label>
              <label>من %<input class="fld" type="number" [(ngModel)]="gForm.min_percentage" placeholder="90" /></label>
              <label>إلى %<input class="fld" type="number" [(ngModel)]="gForm.max_percentage" placeholder="100" /></label>
              <label>GPA<input class="fld" type="number" [(ngModel)]="gForm.gpa_value" placeholder="4.0" /></label>
              <label>اللون<input class="fld" type="color" [(ngModel)]="gForm.color" /></label>
            </div>
            <div class="form-actions"><button class="btn primary" (click)="addScale()">إضافة الفئة</button></div>

            <!-- شريط بصري لنطاقات التقدير -->
            <div class="scale-bar">
              @for (sc of scalesFor(selected()); track sc.id) {
                <span class="seg" [style.width.%]="(+sc.max_percentage - +sc.min_percentage)"
                      [style.background]="sc.color || 'var(--nb-primary-400)'" [title]="sc.grade_letter">
                  {{ sc.grade_letter }}
                </span>
              }
            </div>

            <div class="table-wrap mt">
              <table class="nb-table">
                <thead><tr><th>الحرف</th><th>النطاق</th><th>GPA</th><th></th></tr></thead>
                <tbody>
                  @for (sc of scalesFor(selected()); track sc.id) {
                    <tr>
                      <td><span class="pill" [style.background]="sc.color || 'var(--nb-primary-400)'">{{ sc.grade_letter }}</span></td>
                      <td class="mono">{{ sc.min_percentage }}% — {{ sc.max_percentage }}%</td>
                      <td class="mono">{{ sc.gpa_value }}</td>
                      <td><button class="mini danger" (click)="delScale(sc.id)">حذف</button></td>
                    </tr>
                  }
                  @if (!scalesFor(selected()).length) { <tr><td colspan="4" class="empty">لا فئات بعد.</td></tr> }
                </tbody>
              </table>
            </div>
          }
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .cols { display: grid; grid-template-columns: 300px 1fr; gap: 12px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    .mt { margin-top: 12px; }
    .mini-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr 1fr; } }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; width: 100%; box-sizing: border-box; }
    .fld.sm { max-width: 100px; }
    .form-actions { margin-top: 12px; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; text-align: start; font-family: inherit; }
    .item:hover { background: var(--nb-surface-raised); } .item.sel { border-color: var(--nb-primary-400); background: var(--nb-primary-50); }
    .item .grow { flex: 1; display: flex; flex-direction: column; } .item small { font-size: 11px; color: var(--nb-text-muted); }
    .num { font-size: 12px; font-weight: 800; color: var(--nb-info); background: var(--nb-info-bg); border-radius: var(--nb-radius-pill); padding: 1px 9px; }
    .empty { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
    .scale-bar { display: flex; height: 26px; border-radius: var(--nb-radius); overflow: hidden; margin-top: 16px; border: 1px solid var(--nb-border-soft); }
    .scale-bar .seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 800; min-width: 22px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .mono { font-variant-numeric: tabular-nums; }
    .pill { display: inline-flex; min-width: 26px; justify-content: center; padding: 2px 8px; color: #fff; font-weight: 800; border-radius: var(--nb-radius-sm); font-size: 12px; }
    .mini { height: 26px; padding: 0 10px; font-size: 11.5px; font-weight: 700; border-radius: var(--nb-radius-sm); border: none; cursor: pointer; }
    .mini.danger { background: var(--nb-danger-bg); color: var(--nb-danger); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class GradingComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  schemes = signal<GradingScheme[]>([]);
  scales = signal<GradeScale[]>([]);
  selected = signal<string>('');

  schForm: { name: string; code: string; is_active: boolean } = { name: '', code: '', is_active: true };
  gForm: { grade_letter: string; min_percentage: number | null; max_percentage: number | null; gpa_value: number | null; color: string } =
    { grade_letter: '', min_percentage: null, max_percentage: null, gpa_value: null, color: '#2563eb' };

  ngOnInit() { this.loadSchemes(); this.loadScales(); }
  loadSchemes() { this.service.getGradingSchemes().subscribe((r) => { if (r?.success) this.schemes.set(r.data); }); }
  loadScales() { this.service.getGradeScales().subscribe((r) => { if (r?.success) this.scales.set(r.data); }); }

  scalesFor(schemeId: string): GradeScale[] { return this.scales().filter((s) => s.scheme === schemeId); }
  schemeName(id: string): string { return this.schemes().find((s) => s.id === id)?.name || ''; }

  addScheme() {
    if (!this.schForm.name || !this.schForm.code) { this.notify.error('أدخل الاسم والرمز.'); return; }
    this.service.createGradingScheme(this.schForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة المخطط.'); this.schForm = { name: '', code: '', is_active: true }; this.loadSchemes(); } },
      error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  addScale() {
    if (!this.gForm.grade_letter || this.gForm.min_percentage == null || this.gForm.max_percentage == null) { this.notify.error('أدخل الحرف والنطاق.'); return; }
    this.service.createGradeScale({ ...this.gForm, scheme: this.selected() }).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة الفئة.'); this.gForm = { grade_letter: '', min_percentage: null, max_percentage: null, gpa_value: null, color: '#2563eb' }; this.loadScales(); } },
      error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  delScale(id: string) {
    this.service.deleteGradeScale(id).subscribe({ next: (r) => { if (r?.success) { this.notify.success('تم الحذف.'); this.loadScales(); } }, error: () => this.notify.error('تعذر الحذف.') });
  }
  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
