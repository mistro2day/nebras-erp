import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { PlatformService } from '../platform.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * لوحة تحكم النظام المركزي — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة تحكم وإدارة النظام المركزي"
        subtitle="مراقبة مؤشرات صحة النظام، الكاش، طوابير المهام الخلفية، وأداء البنية التحتية"
      ></nb-page-header>

      @if (health(); as h) {
        <div class="health-grid">
          <div class="health-card" [class.ok]="h.status === 'healthy'" [class.bad]="h.status !== 'healthy'">
            <span class="nb-dot" [class.success]="h.status === 'healthy'" [class.danger]="h.status !== 'healthy'"></span>
            <div><h3>الحالة العامة للمنصة</h3><div class="status-text">{{ h.status === 'healthy' ? 'مستقرة ونشطة' : 'تحتاج لصيانة' }}</div></div>
          </div>
          <div class="health-card" [class.ok]="h.services.database === 'up'" [class.bad]="h.services.database !== 'up'">
            <span class="nb-dot" [class.success]="h.services.database === 'up'" [class.danger]="h.services.database !== 'up'"></span>
            <div><h3>قاعدة البيانات (PostgreSQL)</h3><div class="status-text">{{ h.services.database === 'up' ? 'نشطة ومتصلة' : 'غير متصلة' }}</div></div>
          </div>
          <div class="health-card" [class.ok]="h.services.cache === 'up'" [class.bad]="h.services.cache !== 'up'">
            <span class="nb-dot" [class.success]="h.services.cache === 'up'" [class.danger]="h.services.cache !== 'up'"></span>
            <div><h3>الذاكرة المؤقتة (Redis Cache)</h3><div class="status-text">{{ h.services.cache === 'up' ? 'نشطة ومتصلة' : 'غير متصلة' }}</div></div>
          </div>
          <div class="health-card" [class.ok]="h.services.storage === 'up'" [class.bad]="h.services.storage !== 'up'">
            <span class="nb-dot" [class.success]="h.services.storage === 'up'" [class.danger]="h.services.storage !== 'up'"></span>
            <div><h3>مخزن الملفات (File Storage)</h3><div class="status-text">{{ h.services.storage === 'up' ? 'نشط ومستقر' : 'غير متصل' }}</div></div>
          </div>
        </div>
      }

      <div class="grid">
        <nb-panel title="مراقبة المهام الخلفية (Celery Workers)">
          <div class="jobs-list">
            @for (job of jobs(); track $index) {
              <div class="job-item">
                <div class="job-header">
                  <strong>{{ job.job_name }}</strong>
                  <span [class]="jobBadge(job.status)">{{ job.status }}</span>
                </div>
                <div class="job-body">
                  <span>ID: {{ job.job_id }}</span>
                  <span>أولوية: {{ job.priority }}</span>
                </div>
              </div>
            }
            @if (jobs().length === 0) { <div class="no-data">لا يوجد مهام خلفية قيد التشغيل حالياً.</div> }
          </div>
        </nb-panel>

        @if (health(); as h) {
          @if (h.metrics; as m) {
            <nb-panel title="مؤشرات الأداء للنظام (Performance Metrics)">
              <div class="metrics-container">
                <div class="metric-item"><span class="label">زمن استجابة الـ API المتوسط</span><span class="val">{{ m.api_response_time }}</span></div>
                <div class="metric-item"><span class="label">معدل استهلاك الذاكرة (RAM)</span><span class="val">{{ m.memory_usage }}</span></div>
                <div class="metric-item"><span class="label">معدل استهلاك المعالج (CPU)</span><span class="val">{{ m.cpu_usage }}</span></div>
                <div class="metric-item"><span class="label">حجم قاعدة البيانات الكلي</span><span class="val">{{ m.database_size }}</span></div>
              </div>
            </nb-panel>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .health-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .health-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
    }
    .health-card.ok { border-color: var(--nb-success); background: var(--nb-success-bg); }
    .health-card.bad { border-color: var(--nb-danger); background: var(--nb-danger-bg); }
    .health-card h3 { font-size: 12px; color: var(--nb-text-muted); margin: 0; }
    .status-text { font-size: 14px; font-weight: 700; margin-top: 2px; color: var(--nb-text); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .jobs-list { display: flex; flex-direction: column; gap: 10px; }
    .job-item { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 12px; border-radius: var(--nb-radius); }
    .job-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--nb-text); }
    .job-body { margin-top: 6px; display: flex; justify-content: space-between; font-size: 11px; color: var(--nb-text-muted); }
    .metrics-container { display: flex; flex-direction: column; gap: 10px; }
    .metric-item { display: flex; justify-content: space-between; align-items: center; background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 12px 14px; border-radius: var(--nb-radius); }
    .metric-item .label { color: var(--nb-text-secondary); font-size: 13px; }
    .metric-item .val { font-size: 16px; font-weight: 700; color: var(--nb-primary-600); }
    .no-data { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class PlatformDashboardComponent implements OnInit {
  private platformService = inject(PlatformService);

  health = this.platformService.healthStatus;
  jobs = this.platformService.jobs;

  jobBadge(status: string): string {
    switch (status) {
      case 'completed': return 'nb-badge-success';
      case 'running': return 'nb-badge-info';
      case 'failed': return 'nb-badge-danger';
      default: return 'nb-badge-neutral';
    }
  }

  ngOnInit() {
    this.platformService.getHealth().subscribe();
    this.platformService.getJobs().subscribe();
  }
}