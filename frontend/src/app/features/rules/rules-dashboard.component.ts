import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة ومحرك قواعد الأعمال الموحد — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-rules-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة ومحرك قواعد الأعمال الموحد"
        [subtitle]="'إدارة شروط الحضور والرواتب والقبول لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي القواعد" [value]="rulesCount()"></nb-stat-card>
        <nb-stat-card label="القواعد النشطة" [value]="activeCount()" valueKind="success"></nb-stat-card>
        <nb-stat-card label="مرات التنفيذ اليوم" [value]="executionCount()" valueKind="info"></nb-stat-card>
        <nb-stat-card label="حالات الفشل" [value]="0"></nb-stat-card>
      </div>

      <nb-panel title="سجل وقوانين العمل الحالية" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رمز القاعدة</span><span>الاسم والوصف</span><span>التصنيف</span><span>الأولوية</span><span>الحالة</span>
          </div>
          @for (rule of rules(); track rule.id) {
            <div class="tbl-row">
              <span class="mono">{{ rule.code }}</span>
              <span>
                <strong>{{ rule.name }}</strong>
                <span class="desc-text">{{ rule.description || 'لا يوجد وصف حالياً.' }}</span>
              </span>
              <span><span class="nb-badge-ai">قاعدة عامة</span></span>
              <span>{{ rule.priority }}</span>
              <span><span [class]="rule.status === 'published' ? 'nb-badge-success' : 'nb-badge-warning'">{{ rule.status === 'published' ? 'نشطة ومفعلة' : 'مسودة' }}</span></span>
            </div>
          }
          @if (rules().length === 0) { <div class="tbl-empty">لا توجد قواعد مسجلة حالياً في النظام.</div> }
        </div>
      </nb-panel>
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
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1fr 2.4fr 1fr 0.8fr 1.2fr;
      gap: 8px;
      padding: 9px 16px;
      align-items: center;
    }
    .tbl-head {
      background: var(--nb-surface-raised);
      border-bottom: 1px solid var(--nb-border-soft);
      padding: 8px 16px;
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted);
    }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .mono { font-family: monospace; color: var(--nb-text-secondary); }
    .desc-text { display: block; margin-top: 4px; font-size: 11px; color: var(--nb-text-muted); }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class RulesDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  rules = signal<any[]>([]);
  rulesCount = signal(0);
  activeCount = signal(0);
  executionCount = signal(0);

  ngOnInit() {
    this.loadRules();
  }

  loadRules() {
    this.http.get<any>('/api/v1/rules/rules/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.rules.set(res.data);
          this.rulesCount.set(res.data.length);
          this.activeCount.set(res.data.filter((r: any) => r.status === 'published').length);
        }
      }
    });

    this.http.get<any>('/api/v1/rules/executions/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.executionCount.set(res.data.length);
        }
      }
    });
  }
}