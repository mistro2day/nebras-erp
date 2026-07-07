import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { AdmissionsService, Applicant } from '../admissions.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * لوحة القبول والتسجيل — لغة تصميم Nebras OS (القسم 1d/1a).
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-admissions-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة القبول والتسجيل"
        subtitle="إدارة طلبات الالتحاق، المستندات المرفقة، المقابلات الشخصية وتحديد المستوى للمتقدمين الجدد."
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي طلبات التقديم" [value]="applicants().length"></nb-stat-card>
        <nb-stat-card label="بانتظار التحقق من المستندات" [value]="getCountByStatus('draft')"></nb-stat-card>
        <nb-stat-card label="المقابلات المجدولة" [value]="getCountByStatus('interview_scheduled')"></nb-stat-card>
      </div>

      <nb-panel title="قائمة طلبات التقديم الأخيرة" [flush]="true">
        <div class="list">
          @for (applicant of applicants(); track applicant.id) {
            <div class="list-item">
              <div class="item-header">
                <strong>{{ applicant.arabic_full_name }}</strong>
                <span class="nb-badge-info">{{ applicant.application_number }}</span>
              </div>
              <div class="item-info">
                <span>الجنسية: {{ applicant.nationality }}</span> ·
                <span>الحالة: {{ statusText(applicant.status) }}</span>
              </div>
            </div>
          }
          @if (applicants().length === 0) {
            <div class="no-data">لا توجد طلبات تقديم حالياً.</div>
          }
        </div>
      </nb-panel>
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
    .list { display: flex; flex-direction: column; }
    .list-item {
      padding: 10px 16px;
      border-top: 1px solid var(--nb-border-soft);
    }
    .list-item:first-child { border-top: none; }
    .list-item:hover { background: var(--nb-surface-raised); }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--nb-text);
      font-size: 13px;
    }
    .item-info { font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; }
    .no-data { color: var(--nb-text-muted); text-align: center; padding: 28px; font-size: 13px; }
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

  statusText(status: string): string {
    const map: Record<string, string> = {
      draft: 'مسودة',
      submitted: 'مُقدّم',
      under_review: 'قيد المراجعة',
      interview_scheduled: 'مقابلة مجدولة',
      accepted: 'مقبول',
      rejected: 'مرفوض',
      enrolled: 'مُسجّل',
    };
    return map[status] || status;
  }
}