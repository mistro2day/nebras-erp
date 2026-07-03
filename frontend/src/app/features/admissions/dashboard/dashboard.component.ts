import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdmissionsService, Applicant } from '../admissions.service';

@Component({
  selector: 'app-admissions-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container" dir="rtl">
      <div class="header">
        <h1>لوحة التحكم للقبول والتسجيل (Admissions Dashboard)</h1>
        <p>إدارة طلبات الالتحاق، المستندات المرفقة، المقابلات الشخصية وتحديد المستوى للمتقدمين الجدد.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="title">إجمالي طلبات التقديم</div>
          <div class="value">{{ applicants().length }}</div>
        </div>
        <div class="stat-card">
          <div class="title">بانتظار التحقق من المستندات</div>
          <div class="value">{{ getCountByStatus('draft') }}</div>
        </div>
        <div class="stat-card">
          <div class="title">المقابلات المجدولة</div>
          <div class="value">{{ getCountByStatus('interview_scheduled') }}</div>
        </div>
      </div>

      <div class="main-sections">
        <div class="section-card">
          <h2>قائمة طلبات التقديم الأخيرة</h2>
          <div class="list">
            <div *ngFor="let applicant of applicants()" class="list-item">
              <div class="item-header">
                <strong>{{ applicant.arabic_full_name }}</strong>
                <span class="badge">{{ applicant.application_number }}</span>
              </div>
              <div class="item-info">
                <span>الجنسية: {{ applicant.nationality }}</span> • 
                <span>الحالة: {{ applicant.status }}</span>
              </div>
            </div>
            <div *ngIf="applicants().length === 0" class="no-data">
              لا توجد طلبات تقديم حالياً.
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
    .main-sections {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
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
    .item-info {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 8px;
    }
    .no-data {
      color: #9ca3af;
      text-align: center;
      padding: 20px;
    }
  `]
})
export class AdmissionsDashboardComponent implements OnInit {
  private admissionsService = inject(AdmissionsService);

  applicants = signal<Applicant[]>([]);

  ngOnInit() {
    this.loadApplicants();
  }

  loadApplicants() {
    this.admissionsService.getApplicants().subscribe(res => {
      this.applicants.set(res.data || []);
    });
  }

  getCountByStatus(status: string): number {
    return this.applicants().filter(a => a.status === status).length;
  }
}