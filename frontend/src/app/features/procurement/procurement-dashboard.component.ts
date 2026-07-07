import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProcurementService } from './procurement.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * منصة المشتريات والتعاقدات — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-procurement-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة إدارة المشتريات والتعاقدات"
        subtitle="لوحة التحكم بالطلبات، عروض الأسعار، العقود المعتمدة، وتقييم الموردين"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (procurementService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="طلبات الشراء المفتوحة" [value]="stats.open_requests"></nb-stat-card>
          <nb-stat-card label="الموافقات المعلقة" [value]="stats.pending_approvals" [valueKind]="stats.pending_approvals ? 'warning' : 'default'"></nb-stat-card>
          <nb-stat-card label="إجمالي الإنفاق" [value]="(stats.total_spent | currency:'SAR ':'symbol':'1.2-2') || '—'"></nb-stat-card>
          <nb-stat-card label="الوفورات المحققة" [value]="(stats.savings | currency:'SAR ':'symbol':'1.2-2') || '—'" valueKind="success"></nb-stat-card>
        </div>
      }

      <div class="tables-section">
        <nb-panel title="طلبات الشراء الأخيرة" [flush]="true">
          <div class="tbl">
            <div class="tbl-head pr">
              <span>رقم الطلب</span><span>التاريخ</span><span>إجمالي تقديري</span><span>الحالة</span>
            </div>
            @for (row of requests; track row.id) {
              <div class="tbl-row pr">
                <span>{{ row.request_number }}</span>
                <span>{{ row.date }}</span>
                <span class="strong">{{ row.total_estimated_amount | currency:'SAR ' }}</span>
                <span><span [class]="getBadgeClass(row.status)">{{ getStatusText(row.status) }}</span></span>
              </div>
            }
            @if (requests.length === 0) {
              <div class="tbl-empty">لا توجد طلبات شراء.</div>
            }
          </div>
        </nb-panel>

        <nb-panel title="الموردين المعتمدين" [flush]="true">
          <div class="tbl">
            <div class="tbl-head vn">
              <span>اسم المورد</span><span>التقييم</span><span>الحالة</span>
            </div>
            @for (row of vendors; track row.id) {
              <div class="tbl-row vn">
                <span>{{ row.name_ar }}</span>
                <span class="rating">★ {{ row.rating }}</span>
                <span>
                  @if (row.status === 'approved') { <span class="nb-badge-success">معتمد ونشط</span> }
                  @else if (row.status === 'blacklisted') { <span class="nb-badge-danger">قائمة سوداء</span> }
                  @else if (row.status === 'pending') { <span class="nb-badge-warning">تحت الاعتماد</span> }
                </span>
              </div>
            }
            @if (vendors.length === 0) {
              <div class="tbl-empty">لا يوجد موردين.</div>
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
    .tables-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    @media (max-width: 960px) { .tables-section { grid-template-columns: 1fr; } }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      gap: 8px;
      padding: 9px 16px;
      align-items: center;
    }
    .tbl-head.pr, .tbl-row.pr { grid-template-columns: 1.2fr 1fr 1.2fr 1fr; }
    .tbl-head.vn, .tbl-row.vn { grid-template-columns: 1.8fr 1fr 1.2fr; }
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
    .rating { color: var(--nb-warning); font-weight: 600; }
    .tbl-empty { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class ProcurementDashboardComponent implements OnInit {
  procurementService = inject(ProcurementService);
  requests: any[] = [];
  vendors: any[] = [];
  prColumns: string[] = ['reqNumber', 'date', 'amount', 'status'];
  vendorColumns: string[] = ['name', 'rating', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.procurementService.getDashboardStats().subscribe();
    this.procurementService.getPurchaseRequests().subscribe(data => {
      this.requests = data;
    });
    this.procurementService.getVendors().subscribe(data => {
      this.vendors = data;
    });
  }

  getBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'nb-badge-success';
      case 'rejected': return 'nb-badge-danger';
      case 'pending_approval': return 'nb-badge-warning';
      case 'approved': return 'nb-badge-info';
      default: return 'nb-badge-warning';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'pending_approval': return 'تحت المراجعة';
      case 'approved': return 'معتمد للشراء';
      case 'rejected': return 'مرفوض';
      case 'rfq_created': return 'تم إنشاء RFQ';
      case 'completed': return 'مكتمل';
      default: return status;
    }
  }
}
