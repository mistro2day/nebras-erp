import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * الحضور والغياب وتتبع الوقت — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة الحضور والغياب وتتبع الوقت"
        [subtitle]="'لوحة تعقب انضباط الموظفين والمعلمين لـ ' + (tenantService.currentTenant()?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="الحضور اليوم" [value]="presentCount()" valueKind="success"></nb-stat-card>
        <nb-stat-card label="الغياب اليوم" [value]="absentCount()" [valueKind]="absentCount() ? 'danger' : 'default'"></nb-stat-card>
        <nb-stat-card label="التأخير اليوم" [value]="lateCount()" [valueKind]="lateCount() ? 'warning' : 'default'"></nb-stat-card>
        <nb-stat-card label="طلبات التعديل المعلقة" [value]="pendingCorrections()"></nb-stat-card>
      </div>

      <nb-panel title="سجل الحضور اليومي" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>اسم الموظف</span>
            <span>التاريخ</span>
            <span>تسجيل الحضور</span>
            <span>تسجيل الانصراف</span>
            <span>التأخير (دقائق)</span>
            <span>الحالة</span>
          </div>
          @for (rec of records(); track $index) {
            <div class="tbl-row">
              <span class="strong">{{ rec.employee_name }}</span>
              <span>{{ rec.date }}</span>
              <span>{{ rec.check_in || '—' }}</span>
              <span>{{ rec.check_out || '—' }}</span>
              <span>{{ rec.late_minutes }}</span>
              <span><span [class]="statusBadge(rec.status)">{{ getStatusText(rec.status) }}</span></span>
            </div>
          }
          @if (records().length === 0) {
            <div class="tbl-empty">لا توجد سجلات حضور لهذا اليوم بعد.</div>
          }
        </div>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .tbl { display: flex; flex-direction: column; }
    .tbl-head, .tbl-row {
      display: grid;
      grid-template-columns: 1.6fr 1fr 1fr 1fr 1fr 0.9fr;
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
export class AttendanceDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);

  records = signal<any[]>([]);
  presentCount = signal(0);
  absentCount = signal(0);
  lateCount = signal(0);
  pendingCorrections = signal(0);

  ngOnInit() { this.loadAttendance(); }

  loadAttendance() {
    this.http.get<any>('/api/v1/attendance/records/').subscribe({
      next: (res) => {
        if (res?.success) {
          const data = res.data;
          this.records.set(data);
          this.presentCount.set(data.filter((r: any) => r.status === 'present').length);
          this.absentCount.set(data.filter((r: any) => r.status === 'absent').length);
          this.lateCount.set(data.filter((r: any) => r.status === 'late').length);
        }
      }
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      present: 'حاضر', absent: 'غائب', late: 'متأخر', leave: 'إجازة'
    };
    return map[status] || status;
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      present: 'nb-badge-success',
      absent: 'nb-badge-danger',
      late: 'nb-badge-warning',
      leave: 'nb-badge-info',
    };
    return map[status] || 'nb-badge-neutral';
  }
}