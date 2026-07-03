import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AcademicsService, AcademicYear, Term, Stage, Grade } from '../academics.service';

@Component({
  selector: 'app-academic-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container" dir="rtl">
      <div class="header">
        <h1>لوحة التحكم الأكاديمية (Academic Dashboard)</h1>
        <p>إدارة السنوات الدراسية، الفصول الأكاديمية، الخطط والمناهج الدراسية، والمراحل التعليمية.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="title">السنة الدراسية الحالية</div>
          <div class="value">{{ currentYear()?.name || 'غير محددة' }}</div>
          <div class="subtitle">الرمز: {{ currentYear()?.code || '-' }}</div>
        </div>
        <div class="stat-card">
          <div class="title">إجمالي المراحل الدراسية</div>
          <div class="value">{{ stages().length }}</div>
        </div>
        <div class="stat-card">
          <div class="title">إجمالي الصفوف التعليمية</div>
          <div class="value">{{ grades().length }}</div>
        </div>
      </div>

      <div class="main-sections">
        <!-- السنوات الدراسية -->
        <div class="section-card">
          <h2>السنوات الدراسية المسجلة</h2>
          <div class="list">
            <div *ngFor="let year of years()" class="list-item" [class.current]="year.current_flag">
              <div class="item-header">
                <strong>{{ year.name }}</strong>
                <span *ngIf="year.current_flag" class="badge">الحالية</span>
              </div>
              <div class="item-dates">
                <span>تاريخ البدء: {{ year.start_date }}</span> • 
                <span>تاريخ الانتهاء: {{ year.end_date }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- المراحل والصفوف -->
        <div class="section-card">
          <h2>الهيكل التعليمي (المراحل والصفوف)</h2>
          <div class="stages-list">
            <div *ngFor="let stage of stages()" class="stage-block">
              <h3>🎓 المرحلة: {{ stage.name }} (عمر: {{ stage.minimum_age }} - {{ stage.maximum_age }} سنة)</h3>
              <div class="grades-tags">
                <span *ngFor="let grade of getGradesForStage(stage.id)" class="grade-tag">
                  {{ grade.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
    }
    .header {
      margin-bottom: 32px;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .header p {
      color: #9ca3af;
      font-size: 14px;
      margin-top: 4px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .stat-card .title {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .stat-card .value {
      font-size: 26px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .stat-card .subtitle {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .main-sections {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 768px) {
      .main-sections {
        grid-template-columns: 1fr;
      }
    }
    .section-card {
      background-color: var(--surface-color, #1f2937);
      border: 1px solid var(--border-color, #374151);
      border-radius: 12px;
      padding: 24px;
    }
    .section-card h2 {
      font-size: 18px;
      color: #f3f4f6;
      margin-bottom: 20px;
      border-bottom: 1px solid #374151;
      padding-bottom: 12px;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .list-item {
      padding: 16px;
      background-color: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
    }
    .list-item.current {
      border-color: var(--primary-color, #2563eb);
      background-color: rgba(37, 99, 235, 0.05);
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #f3f4f6;
    }
    .badge {
      font-size: 11px;
      background-color: var(--primary-color, #2563eb);
      color: white;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .item-dates {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 8px;
    }
    .stage-block {
      margin-bottom: 20px;
    }
    .stage-block h3 {
      font-size: 14px;
      color: #10b981;
      margin-bottom: 10px;
    }
    .grades-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .grade-tag {
      background-color: #111827;
      color: #d1d5db;
      border: 1px solid #374151;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
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