import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MaintenanceService } from './maintenance.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة إدارة الصيانة وأوامر العمل (CMMS) — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-maintenance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة إدارة الصيانة وأوامر العمل (CMMS)"
        subtitle="طلبات الصيانة، الصيانة الوقائية للأصول، استهلاك المواد، والتكاليف المالية المترتبة"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (maintenanceService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="البلاغات المفتوحة" [value]="stats.open_requests" suffix="بلاغ" valueKind="info"></nb-stat-card>
          <nb-stat-card label="أوامر العمل النشطة" [value]="stats.active_work_orders" suffix="أمر عمل" valueKind="warning"></nb-stat-card>
          <nb-stat-card label="تكاليف الصيانة الإجمالية" [value]="(stats.total_costs | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="success"></nb-stat-card>
          <nb-stat-card label="صيانة وقائية مستحقة" [value]="stats.preventive_due" suffix="أصل"></nb-stat-card>
        </div>
      }

      <nb-panel title="أوامر العمل الجارية والمعالجة" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>رقم أمر العمل</span><span>الأصل المستهدف</span><span>ساعات العمل المقدرة</span><span>الحالة</span>
          </div>
          @for (row of workOrders; track row.id) {
            <div class="tbl-row">
              <span>{{ row.wo_number }}</span>
              <span class="strong">شيلر Carrier الرئيسي</span>
              <span>{{ row.estimated_labor_hours }} ساعة</span>
              <span><span [class]="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span></span>
            </div>
          }
          @if (workOrders.length === 0) { <div class="tbl-empty">لا توجد أوامر عمل.</div> }
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
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1.2fr 1.6fr 1.2fr 1fr;
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
    .tbl-row {
      border-bottom: 1px solid var(--nb-border-row);
      font-size: 13px;
      color: var(--nb-text);
    }
    .tbl-row:last-child { border-bottom: none; }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .strong { font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class MaintenanceDashboardComponent implements OnInit {
  maintenanceService = inject(MaintenanceService);
  workOrders: any[] = [];
  columns: string[] = ['wo_number', 'asset', 'hours', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.maintenanceService.getDashboardStats().subscribe();
    this.maintenanceService.getWorkOrders().subscribe(data => {
      this.workOrders = data;
    });
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'assigned': return 'مسند للفني';
      case 'in_progress': return 'قيد التنفيذ';
      case 'on_hold': return 'معلق';
      case 'completed': return 'مكتمل فنيّاً';
      case 'closed': return 'مغلق ومقفل';
      case 'cancelled': return 'ملغى';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'draft': return 'nb-badge-info';
      case 'assigned': return 'nb-badge-info';
      case 'in_progress': return 'nb-badge-warning';
      case 'on_hold': return 'nb-badge-danger';
      case 'completed': return 'nb-badge-success';
      case 'closed': return 'nb-badge-success';
      case 'cancelled': return 'nb-badge-danger';
      default: return 'nb-badge-info';
    }
  }
}
