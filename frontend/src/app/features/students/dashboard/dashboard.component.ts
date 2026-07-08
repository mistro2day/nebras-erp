import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { StudentsService } from '../students.service';
import { Router } from '@angular/router';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * لوحة تحكم شؤون الطلاب — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-students-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة تحكم شؤون الطلاب"
        subtitle="إحصائيات دورة حياة الطلاب والتسجيل الأكاديمي والخط الزمني العام"
      >
        <button class="nb-btn-primary" (click)="navigateToList()">عرض قائمة الطلاب</button>
      </nb-page-header>

      @if (widgets(); as w) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي الطلاب" [value]="w.totalStudents"></nb-stat-card>
          <nb-stat-card label="الطلاب النشطين" [value]="w.activeStudents" valueKind="success"></nb-stat-card>
          <nb-stat-card label="الموقوفين" [value]="w.suspendedStudents" [valueKind]="w.suspendedStudents ? 'warning' : 'default'"></nb-stat-card>
          <nb-stat-card label="الخريجين" [value]="w.graduatedStudents" valueKind="info"></nb-stat-card>
        </div>

        <div class="analysis-grid">
          <nb-panel title="التوزيع بحسب الجنس">
            <div class="gender-container">
              <div class="gender-row">
                <div class="gender-label"><span class="dot male"></span> ذكور: {{ w.genderDistribution.male }} ({{ getGenderPct('male') | number:'1.0-1' }}%)</div>
                <div class="gender-track"><div class="gender-fill male" [style.width.%]="getGenderPct('male')"></div></div>
              </div>
              <div class="gender-row">
                <div class="gender-label"><span class="dot female"></span> إناث: {{ w.genderDistribution.female }} ({{ getGenderPct('female') | number:'1.0-1' }}%)</div>
                <div class="gender-track"><div class="gender-fill female" [style.width.%]="getGenderPct('female')"></div></div>
              </div>
            </div>
          </nb-panel>

          <nb-panel title="إجراءات سريعة">
            <div class="actions-list">
              <button class="nb-btn-secondary" (click)="navigateToCreate()">تسجيل طالب جديد (من Admissions)</button>
              <button class="nb-btn-secondary" (click)="navigateToList()">ترفيع وترقية جماعية</button>
            </div>
          </nb-panel>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .analysis-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .analysis-grid { grid-template-columns: 1fr; } }
    .gender-container { display: flex; flex-direction: column; gap: 16px; }
    .gender-row { display: flex; flex-direction: column; gap: 6px; }
    .gender-label { font-size: 13px; color: var(--nb-text-secondary); display: flex; align-items: center; gap: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .dot.male { background: var(--nb-primary-600); }
    .dot.female { background: var(--nb-info); }
    .gender-track { height: 8px; background: var(--nb-border-soft); border-radius: var(--nb-radius-pill); overflow: hidden; }
    .gender-fill { height: 100%; border-radius: var(--nb-radius-pill); }
    .gender-fill.male { background: var(--nb-primary-600); }
    .gender-fill.female { background: var(--nb-info); }
    .actions-list { display: flex; flex-direction: column; gap: 10px; }
    .actions-list button { width: 100%; }
  `]
})
export class StudentsDashboardComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private router = inject(Router);

  widgets = this.studentsService.dashboardWidgets;

  ngOnInit() {
    this.studentsService.getDashboardWidgets().subscribe();
  }

  getGenderPct(gender: 'male' | 'female'): number {
    const w = this.widgets();
    if (!w || w.totalStudents === 0) return 0;
    return (w.genderDistribution[gender] / w.totalStudents) * 100;
  }

  navigateToList() {
    this.router.navigate(['/students/list']);
  }

  navigateToCreate() {
    this.router.navigate(['/students/create']);
  }
}