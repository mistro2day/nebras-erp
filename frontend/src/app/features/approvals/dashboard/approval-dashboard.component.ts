import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApprovalAnalyticsService } from '../approval-analytics.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * لوحة معلومات مركز الموافقات — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-approval-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, LoadingSpinnerComponent, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة معلومات مركز الموافقات"
        subtitle="نظرة عامة على الطلبات المعلقة والمعتمدة والمتجاوزة للمهلة"
      >
        <a class="nb-btn-ghost" routerLink="/approvals/inbox">صندوق الوارد</a>
        <a class="nb-btn-ghost" routerLink="/approvals/analytics">التحليلات</a>
        <button class="nb-btn-secondary" (click)="load()">تحديث</button>
      </nb-page-header>

      <app-loading-spinner [isLoading]="analyticsService.loading()"></app-loading-spinner>

      @if (analyticsService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="معلّقة" [value]="stats.pending" valueKind="warning"></nb-stat-card>
          <nb-stat-card label="معتمدة" [value]="stats.approved" valueKind="success"></nb-stat-card>
          <nb-stat-card label="مرفوضة" [value]="stats.rejected" [valueKind]="stats.rejected ? 'danger' : 'default'"></nb-stat-card>
          <nb-stat-card label="متجاوزة المهلة" [value]="stats.overdue" [valueKind]="stats.overdue ? 'danger' : 'default'"></nb-stat-card>
          <nb-stat-card label="متوسط وقت القرار" [value]="((stats.avg_decision_seconds / 60) | number:'1.0-1') || '0'" suffix="دقيقة"></nb-stat-card>
        </div>

        <div class="tables-section">
          <nb-panel title="التوزيع حسب الفئة" [flush]="true">
            <div class="tbl">
              <div class="tbl-head"><span>الفئة</span><span>العدد</span></div>
              @for (row of stats.by_category; track $index) {
                <div class="tbl-row"><span>{{ row.category__code }}</span><span class="strong">{{ row.count }}</span></div>
              }
            </div>
          </nb-panel>
          <nb-panel title="التوزيع حسب الأولوية" [flush]="true">
            <div class="tbl">
              <div class="tbl-head"><span>الأولوية</span><span>العدد</span></div>
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
export class ApprovalDashboardComponent implements OnInit {
  analyticsService = inject(ApprovalAnalyticsService);

  ngOnInit() { this.load(); }
  load() { this.analyticsService.getDashboardStats().subscribe(); }
}
