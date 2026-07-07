import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ClinicService } from './clinic.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';

/**
 * العيادة المدرسية والسجلات الصحية (SHIS) — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="نظام العيادة المدرسية والسجلات الصحية (SHIS)"
        subtitle="مراقبة زيارات العيادة اليومية، الحالات الطارئة، طلبات الإجازات المرضية، وحالات العزل"
      >
        <button class="nb-btn-secondary" (click)="loadDashboard()">تحديث البيانات</button>
      </nb-page-header>

      @if (clinicService.stats(); as stats) {
        <div class="stats-grid">
          <nb-stat-card label="زيارات اليوم" [value]="stats.today_visits" suffix="زيارة" valueKind="info"></nb-stat-card>
          <nb-stat-card label="الحالات الإسعافية" [value]="stats.emergency_cases" suffix="حالة" [valueKind]="stats.emergency_cases ? 'danger' : 'default'"></nb-stat-card>
          <nb-stat-card label="حالات العزل الوقائي" [value]="stats.active_isolations" suffix="نشطة" [valueKind]="stats.active_isolations ? 'warning' : 'default'"></nb-stat-card>
          <nb-stat-card label="تقارير وإجازات معلقة" [value]="stats.pending_leaves" suffix="إجازة"></nb-stat-card>
        </div>
      }

      <nb-panel title="سجل مراجعات وزيارات العيادة الحديثة" [flush]="true">
        <div class="tbl">
          <div class="tbl-head">
            <span>المريض (معرف الطالب/الموظف)</span><span>نوع الزيارة</span><span>الحالة</span>
          </div>
          @for (row of visits; track row.id) {
            <div class="tbl-row">
              <span class="strong">{{ row.patient_user_id }}</span>
              <span><span [class]="getVisitTypeClass(row.visit_type)">{{ getVisitTypeText(row.visit_type) }}</span></span>
              <span><span [class]="getStatusClass(row.status)">{{ getStatusText(row.status) }}</span></span>
            </div>
          }
          @if (visits.length === 0) { <div class="tbl-empty">لا توجد زيارات مسجلة.</div> }
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
      grid-template-columns: 2fr 1.2fr 1.2fr;
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
export class ClinicDashboardComponent implements OnInit {
  clinicService = inject(ClinicService);
  visits: any[] = [];
  columns: string[] = ['patient', 'type', 'status'];

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.clinicService.getDashboardStats().subscribe();
    this.clinicService.getVisits().subscribe(data => {
      this.visits = data;
    });
  }

  getVisitTypeText(type: string): string {
    switch (type) {
      case 'walk_in': return 'حالة عابرة';
      case 'scheduled': return 'موعد دوري';
      case 'emergency': return 'حالة طارئة';
      case 'follow_up': return 'متابعة';
      default: return type;
    }
  }

  getVisitTypeClass(type: string): string {
    switch (type) {
      case 'emergency': return 'nb-badge-danger';
      case 'walk_in': return 'nb-badge-info';
      default: return 'nb-badge-success';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'checked_in': return 'دخل العيادة';
      case 'diagnosed': return 'تم التشخيص';
      case 'discharged': return 'غادر العيادة';
      case 'referred': return 'تمت الإحالة';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'discharged': return 'nb-badge-success';
      case 'referred': return 'nb-badge-warning';
      default: return 'nb-badge-info';
    }
  }
}
