import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApprovalAnalyticsService } from '../approval-analytics.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * تحليلات مركز الموافقات — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-approval-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, LoadingSpinnerComponent, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="تحليلات مركز الموافقات"
        subtitle="مؤشرات الأداء الرئيسية لأداء الاعتماد على مستوى المؤسسة"
      >
        <button class="nb-btn-secondary" (click)="recalculate()">إعادة احتساب الإحصاءات</button>
      </nb-page-header>

      <app-loading-spinner [isLoading]="analyticsService.loading()"></app-loading-spinner>

      @if (analyticsService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="إجمالي الطلبات" [value]="stats.pending + stats.approved + stats.rejected"></nb-stat-card>
          <nb-stat-card label="نسبة الاعتماد" [value]="approvalRate(stats)" suffix="%" valueKind="success"></nb-stat-card>
          <nb-stat-card label="متوسط زمن القرار" [value]="((stats.avg_decision_seconds / 3600) | number:'1.1-1') || '0'" suffix="ساعة"></nb-stat-card>
          <nb-stat-card label="مخالفات SLA" [value]="stats.overdue" [valueKind]="stats.overdue ? 'danger' : 'default'"></nb-stat-card>
        </div>

        <div class="tables-section">
          <nb-panel title="الأداء حسب الفئة" [flush]="true">
            <div class="tbl">
              <div class="tbl-head"><span>الفئة</span><span>عدد الطلبات</span></div>
              @for (row of stats.by_category; track $index) {
                <div class="tbl-row"><span>{{ row.category__code }}</span><span class="strong">{{ row.count }}</span></div>
              }
            </div>
          </nb-panel>
          <nb-panel title="الأداء حسب الأولوية" [flush]="true">
            <div class="tbl">
              <div class="tbl-head"><span>الأولوية</span><span>عدد الطلبات</span></div>
              @for (row of stats.by_priority; track $index) {
                <div class="tbl-row"><span>{{ row.priority__code }}</span><span class="strong">{{ row.count }}</span></div>
              }
            </div>
          </nb-panel>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .tables-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 960px) { .tables-section { grid-template-columns: 1fr; } }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row { display: grid; grid-template-columns: 2fr 1fr; gap: 8px; padding: 9px 16px; align-items: center; }
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); padding: 8px 16px; font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .strong { font-weight: 700; }
  `]
})
export class ApprovalAnalyticsComponent implements OnInit {
  analyticsService = inject(ApprovalAnalyticsService);

  ngOnInit() { this.load(); }
  load() { this.analyticsService.getDashboardStats().subscribe(); }

  approvalRate(stats: { pending: number; approved: number; rejected: number }): string {
    const total = stats.pending + stats.approved + stats.rejected;
    if (total === 0) return '0';
    return ((stats.approved / total) * 100).toFixed(1);
  }

  recalculate() {
    this.analyticsService.recalculateStatistics().subscribe(() => this.load());
  }
}
