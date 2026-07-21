import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExaminationsService } from '../examinations.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { Assessment, AssessmentItem, AssessmentWeight, Subject } from '../examinations.types';

/** أعمال السنة والتقييم المستمر — التقييمات وبنودها وتوزيع أوزان الدرجات. */
@Component({
  selector: 'app-assessments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="أعمال السنة والتقييم المستمر" subtitle="التقييمات المستمرة وبنودها، وتوزيع أوزان الدرجات بين أعمال السنة والامتحان النهائي.">
        <button class="btn ghost" (click)="back()">رجوع للمركز</button>
      </nb-page-header>

      <div class="cols">
        <nb-panel title="التقييمات المستمرة" subtitle="اختبارات قصيرة، واجبات، مشاريع لكل مادة.">
          <div class="mini-form">
            <input class="fld" placeholder="اسم التقييم" [(ngModel)]="aForm.name" />
            <select class="fld" [(ngModel)]="aForm.subject_id">
              <option value="">المادة…</option>
              @for (s of subjects(); track s.id) { <option [value]="s.id">{{ s.arabic_name }}</option> }
            </select>
            <input class="fld sm" type="number" placeholder="الكبرى" [(ngModel)]="aForm.max_marks" />
            <input class="fld sm" placeholder="السنة" [(ngModel)]="aForm.academic_year" />
            <button class="btn primary sm" (click)="addAssessment()">إضافة</button>
          </div>
          <div class="list">
            @for (a of assessments(); track a.id) {
              <button class="item" [class.sel]="a.id === selected()" (click)="selected.set(a.id)">
                <div class="grow"><strong>{{ a.name }}</strong><small>{{ subjectName(a.subject_id) }} · {{ a.academic_year }}</small></div>
                <span class="num">{{ a.max_marks }}</span>
              </button>
            }
            @if (!assessments().length) { <div class="empty">لا تقييمات بعد.</div> }
          </div>
        </nb-panel>

        <nb-panel [title]="selected() ? 'بنود: ' + assessmentName(selected()) : 'بنود التقييم'" subtitle="عناصر التقييم وأوزانها الجزئية.">
          @if (!selected()) { <div class="empty">اختر تقييمًا لعرض بنوده.</div> }
          @else {
            <div class="mini-form">
              <input class="fld" placeholder="اسم البند" [(ngModel)]="iForm.name" />
              <input class="fld sm" type="number" placeholder="الكبرى" [(ngModel)]="iForm.max_marks" />
              <input class="fld sm" type="number" placeholder="الوزن %" [(ngModel)]="iForm.weight_percentage" />
              <button class="btn primary sm" (click)="addItem()">إضافة بند</button>
            </div>
            <div class="table-wrap">
              <table class="nb-table">
                <thead><tr><th>البند</th><th>الكبرى</th><th>الوزن</th></tr></thead>
                <tbody>
                  @for (it of itemsFor(selected()); track it.id) {
                    <tr><td><strong>{{ it.name }}</strong></td><td class="mono">{{ it.max_marks }}</td><td class="mono">{{ it.weight_percentage }}%</td></tr>
                  }
                  @if (!itemsFor(selected()).length) { <tr><td colspan="3" class="empty">لا بنود بعد.</td></tr> }
                </tbody>
              </table>
            </div>
          }
        </nb-panel>
      </div>

      <!-- أوزان أعمال السنة مقابل النهائي -->
      <nb-panel title="توزيع أوزان الدرجات" subtitle="نسبة أعمال السنة مقابل الامتحان النهائي لكل مادة." class="mt">
        <div class="mini-form">
          <select class="fld" [(ngModel)]="wForm.subject_id">
            <option value="">المادة…</option>
            @for (s of subjects(); track s.id) { <option [value]="s.id">{{ s.arabic_name }}</option> }
          </select>
          <input class="fld sm" placeholder="السنة" [(ngModel)]="wForm.academic_year" />
          <input class="fld sm" type="number" placeholder="أعمال %" [(ngModel)]="wForm.continuous_assessment_weight" (ngModelChange)="syncFinal()" />
          <input class="fld sm" type="number" placeholder="نهائي %" [(ngModel)]="wForm.final_exam_weight" />
          <button class="btn primary sm" (click)="addWeight()">حفظ التوزيع</button>
        </div>
        <div class="weights">
          @for (w of weights(); track w.id) {
            <div class="wrow">
              <span class="wsub">{{ subjectName(w.subject_id) }} <small>{{ w.academic_year }}</small></span>
              <div class="wbar">
                <span class="ca" [style.width.%]="w.continuous_assessment_weight">أعمال {{ w.continuous_assessment_weight }}%</span>
                <span class="fe" [style.width.%]="w.final_exam_weight">نهائي {{ w.final_exam_weight }}%</span>
              </div>
            </div>
          }
          @if (!weights().length) { <div class="empty">لم تُحدَّد أوزان بعد.</div> }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
    .mt { margin-top: 12px; }
    .mini-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--nb-text-muted); }
    .fld { height: 34px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; }
    .fld.sm { max-width: 110px; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); background: var(--nb-surface); cursor: pointer; text-align: start; font-family: inherit; }
    .item:hover { background: var(--nb-surface-raised); } .item.sel { border-color: var(--nb-primary-400); background: var(--nb-primary-50); }
    .item .grow { flex: 1; display: flex; flex-direction: column; } .item small { font-size: 11px; color: var(--nb-text-muted); }
    .num { font-size: 12px; font-weight: 800; color: var(--nb-info); background: var(--nb-info-bg); border-radius: var(--nb-radius-pill); padding: 1px 9px; }
    .empty { text-align: center; padding: 18px; color: var(--nb-text-muted); font-size: 13px; }
    .table-wrap { overflow-x: auto; }
    .nb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .nb-table th { text-align: start; font-weight: 700; font-size: 11px; color: var(--nb-text-muted);
      background: var(--nb-surface-raised); padding: 9px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    .nb-table td { padding: 9px 12px; border-bottom: 1px solid var(--nb-border-row); color: var(--nb-text); }
    .mono { font-variant-numeric: tabular-nums; }
    .weights { display: flex; flex-direction: column; gap: 10px; }
    .wrow { display: flex; align-items: center; gap: 12px; }
    .wsub { width: 200px; font-size: 13px; font-weight: 600; color: var(--nb-text); } .wsub small { color: var(--nb-text-muted); font-weight: 400; }
    .wbar { flex: 1; display: flex; height: 24px; border-radius: var(--nb-radius); overflow: hidden; border: 1px solid var(--nb-border-soft); }
    .wbar span { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; }
    .wbar .ca { background: color-mix(in srgb, var(--nb-info) 80%, white); }
    .wbar .fe { background: color-mix(in srgb, var(--nb-primary-600) 85%, white); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
  `],
})
export class AssessmentsComponent implements OnInit {
  private service = inject(ExaminationsService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  assessments = signal<Assessment[]>([]);
  items = signal<AssessmentItem[]>([]);
  weights = signal<AssessmentWeight[]>([]);
  subjects = signal<Subject[]>([]);
  selected = signal<string>('');

  aForm: { name: string; subject_id: string; max_marks: number; academic_year: string } = { name: '', subject_id: '', max_marks: 20, academic_year: '' };
  iForm: { name: string; max_marks: number; weight_percentage: number } = { name: '', max_marks: 10, weight_percentage: 50 };
  wForm: { subject_id: string; academic_year: string; continuous_assessment_weight: number; final_exam_weight: number } = { subject_id: '', academic_year: '', continuous_assessment_weight: 40, final_exam_weight: 60 };

  ngOnInit() {
    this.service.getSubjects().subscribe((r) => { if (r?.success) this.subjects.set(r.data); });
    this.load();
  }
  load() {
    this.service.getAssessments().subscribe((r) => { if (r?.success) this.assessments.set(r.data); });
    this.service.getAssessmentItems().subscribe((r) => { if (r?.success) this.items.set(r.data); });
    this.service.getAssessmentWeights().subscribe((r) => { if (r?.success) this.weights.set(r.data); });
  }

  itemsFor(id: string): AssessmentItem[] { return this.items().filter((i) => i.assessment === id); }
  subjectName(id: string): string { return this.subjects().find((s) => s.id === id)?.arabic_name || '—'; }
  assessmentName(id: string): string { return this.assessments().find((a) => a.id === id)?.name || ''; }
  syncFinal() { const ca = Number(this.wForm.continuous_assessment_weight) || 0; this.wForm.final_exam_weight = Math.max(0, 100 - ca); }

  addAssessment() {
    if (!this.aForm.name || !this.aForm.subject_id) { this.notify.error('أدخل الاسم والمادة.'); return; }
    this.service.createAssessment(this.aForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت الإضافة.'); this.aForm = { name: '', subject_id: '', max_marks: 20, academic_year: '' }; this.load(); } },
      error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  addItem() {
    if (!this.iForm.name) { this.notify.error('أدخل اسم البند.'); return; }
    this.service.createAssessmentItem({ ...this.iForm, assessment: this.selected() }).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تمت إضافة البند.'); this.iForm = { name: '', max_marks: 10, weight_percentage: 50 }; this.load(); } },
      error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  addWeight() {
    if (!this.wForm.subject_id) { this.notify.error('اختر المادة.'); return; }
    this.service.createAssessmentWeight(this.wForm).subscribe({
      next: (r) => { if (r?.success) { this.notify.success('تم حفظ التوزيع.'); this.load(); } },
      error: () => this.notify.error('تعذر الحفظ.'),
    });
  }
  back() { this.router.navigateByUrl('/examinations/dashboard'); }
}
