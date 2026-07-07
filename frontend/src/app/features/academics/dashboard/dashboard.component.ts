import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { AcademicsService, AcademicYear, Stage, Grade } from '../academics.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * اللوحة الأكاديمية — لغة تصميم Nebras OS (القسم 1d/1a).
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-academic-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="اللوحة الأكاديمية"
        subtitle="إدارة السنوات الدراسية، الفصول الأكاديمية، الخطط والمناهج الدراسية، والمراحل التعليمية."
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card
          label="السنة الدراسية الحالية"
          [value]="currentYear()?.name || 'غير محددة'"
          [trend]="'الرمز: ' + (currentYear()?.code || '-')"
          trendKind="info"
        ></nb-stat-card>
        <nb-stat-card label="إجمالي المراحل الدراسية" [value]="stages().length"></nb-stat-card>
        <nb-stat-card label="إجمالي الصفوف التعليمية" [value]="grades().length"></nb-stat-card>
      </div>

      <div class="main-sections">
        <nb-panel title="السنوات الدراسية المسجلة" [flush]="true">
          <div class="list">
            @for (year of years(); track year.id) {
              <div class="list-item" [class.current]="year.current_flag">
                <div class="item-header">
                  <strong>{{ year.name }}</strong>
                  @if (year.current_flag) {
                    <span class="nb-badge-info">الحالية</span>
                  }
                </div>
                <div class="item-dates">
                  <span>تاريخ البدء: {{ year.start_date }}</span> ·
                  <span>تاريخ الانتهاء: {{ year.end_date }}</span>
                </div>
              </div>
            }
          </div>
        </nb-panel>

        <nb-panel title="الهيكل التعليمي (المراحل والصفوف)">
          <div class="stages-list">
            @for (stage of stages(); track stage.id) {
              <div class="stage-block">
                <h3>المرحلة: {{ stage.name }} (عمر: {{ stage.minimum_age }} - {{ stage.maximum_age }} سنة)</h3>
                <div class="grades-tags">
                  @for (grade of getGradesForStage(stage.id); track grade.id) {
                    <span class="grade-tag">{{ grade.name }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .main-sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 768px) { .main-sections { grid-template-columns: 1fr; } }
    .list { display: flex; flex-direction: column; }
    .list-item { padding: 10px 16px; border-top: 1px solid var(--nb-border-soft); }
    .list-item:first-child { border-top: none; }
    .list-item.current { background: var(--nb-primary-50); }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--nb-text);
      font-size: 13px;
    }
    .item-dates { font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; }
    .stage-block { margin-bottom: 16px; }
    .stage-block:last-child { margin-bottom: 0; }
    .stage-block h3 { font-size: 13px; font-weight: 700; color: var(--nb-text); margin: 0 0 10px; }
    .grades-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .grade-tag {
      background: var(--nb-surface-raised);
      color: var(--nb-text-secondary);
      border: 1px solid var(--nb-border);
      padding: 4px 12px;
      border-radius: var(--nb-radius);
      font-size: 12px;
    }
  `]
})
export class AcademicDashboardComponent implements OnInit {
  private academicsService = inject(AcademicsService);

  years = signal<AcademicYear[]>([]);
  stages = signal<Stage[]>([]);
  grades = signal<Grade[]>([]);

  currentYear = signal<AcademicYear | null>(null);

  ngOnInit() {
    this.loadAcademicData();
  }

  loadAcademicData() {
    this.academicsService.getAcademicYears().subscribe(res => {
      this.years.set(res.data || []);
      const current = this.years().find(y => y.current_flag);
      if (current) this.currentYear.set(current);
    });

    this.academicsService.getStages().subscribe(res => this.stages.set(res.data || []));
    this.academicsService.getGrades().subscribe(res => this.grades.set(res.data || []));
  }

  getGradesForStage(stageId: string): Grade[] {
    return this.grades().filter(g => g.stage === stageId);
  }
}