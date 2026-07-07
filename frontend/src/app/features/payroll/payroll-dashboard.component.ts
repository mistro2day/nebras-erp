import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { PayslipViewerComponent, PayslipInfo } from '../../shared/components/payslip-viewer/payslip-viewer.component';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * إدارة الرواتب والتعويضات — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-payroll-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, PayslipViewerComponent, NbPageHeaderComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة الرواتب والتعويضات"
        [subtitle]="'بوابة إدارة كشوف ومسيرات رواتب الموظفين لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي تكلفة الرواتب المعتمدة" [value]="(totalCost() | number:'1.2-2') || '0'" suffix="SDG"></nb-stat-card>
        <nb-stat-card label="إجمالي القروض القائمة" value="450,000" suffix="SDG"></nb-stat-card>
      </div>

      <h2 class="section-title">قسائم رواتب الموظفين الأخيرة</h2>
      <div class="cards-grid">
        @for (payslip of payslips(); track payslip.id) {
          <app-payslip-viewer [payslip]="payslip"></app-payslip-viewer>
        }
        @if (payslips().length === 0) {
          <div class="no-data">لا توجد قسائم رواتب مسجلة أو معالجة لهذه الفترة.</div>
        }
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
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 12px;
    }
    .no-data {
      grid-column: 1 / -1;
      text-align: center;
      padding: 28px;
      color: var(--nb-text-muted);
      font-size: 13px;
    }
  `]
})
export class PayrollDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  payslips = signal<PayslipInfo[]>([]);
  totalCost = signal<number>(0);

  ngOnInit() {
    this.loadPayrollData();
  }

  loadPayrollData() {
    this.http.get<any>('/api/v1/payroll/payslips/').subscribe({
      next: (res) => {
        if (res && res.success) {
          this.payslips.set(res.data);
        }
      }
    });

    this.http.get<any>('/api/v1/payroll/runs/').subscribe({
      next: (res) => {
        if (res && res.success && res.data.length > 0) {
          const sum = res.data.reduce((acc: number, run: any) => acc + parseFloat(run.total_cost), 0);
          this.totalCost.set(sum);
        }
      }
    });
  }
}