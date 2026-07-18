import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbBadgeComponent } from '../../shared/nebras/nb-badge.component';
import { NbDataTableComponent, NbColumn } from '../../shared/nebras/nb-data-table.component';
import { NbExportMenuComponent, ExportColumn } from '../../shared/export';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface Employee {
  id: string;
  full_name_ar: string;
  department?: string;
  position?: string;
}

interface AttendanceRecord {
  id: string;
  employee: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  late_minutes: number;
  overtime_minutes: number;
}

@Component({
  selector: 'app-attendance-employee-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbBadgeComponent,
    NbDataTableComponent,
    NbLoadingComponent,
    NbExportMenuComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        [title]="'تفاصيل الحضور والانصراف - ' + (employee()?.full_name_ar || 'جاري التحميل...')"
        [subtitle]="'السجل اليومي والتحليلي التفصيلي لشهر يونيو 2026'"
      >
        <button routerLink="/attendance/sheets" class="nb-btn btn-back">
          🔙 العودة للكشوف
        </button>
      </nb-page-header>

      @if (loading()) {
        <nb-loading message="جاري تحميل سجل البصمات الخاص بالموظف..."></nb-loading>
      } @else {
        <!-- كرت ملخص إحصائيات الحضور والإنصراف للموظف -->
        <div class="emp-summary-grid">
          <div class="stat-card">
            <span class="lbl">إجمالي أيام الحضور</span>
            <span class="val">{{ presentDays() }} يوم</span>
          </div>
          <div class="stat-card">
            <span class="lbl">أيام الغياب</span>
            <span class="val text-danger">{{ absentDays() }} يوم</span>
          </div>
          <div class="stat-card">
            <span class="lbl">إجمالي دقائق التأخير</span>
            <span class="val text-warning">{{ totalLateMinutes() }} دقيقة</span>
          </div>
          <div class="stat-card">
            <span class="lbl">ساعات العمل المقدرة</span>
            <span class="val">{{ workingHours() }} ساعة</span>
          </div>
        </div>

        <div style="margin-top: 24px;">
          <nb-panel [title]="'جدول البصمات التفصيلي لشهر يونيو 2026'">
            <div class="panel-header-actions" style="display: flex; gap: 8px; margin-bottom: 16px; justify-content: flex-end;">
              <nb-export-menu
                [columns]="exportCols()"
                [rows]="tableRows()"
                [title]="'سجل البصمات التفصيلي'"
                [subtitle]="employee()?.full_name_ar || ''"
                filename="سجل-البصمات-التفصيلي"
              ></nb-export-menu>
            </div>
            
            <nb-data-table
              [columns]="columns"
              [rows]="tableRows()"
              [emptyText]="'لا توجد سجلات حضور مسجلة لهذا الموظف لشهر يونيو.'"
            >
              <ng-template #cell let-row let-col="col" let-val="value">
                @if (col.key === 'status') {
                  <nb-badge [kind]="row.status === 'absent' ? 'danger' : (row.late_minutes > 0 ? 'warning' : 'success')">
                    {{ row.status === 'absent' ? 'غياب' : (row.late_minutes > 0 ? 'تأخير' : 'منضبط') }}
                  </nb-badge>
                } @else if (col.key === 'late_minutes') {
                  <span [class.text-danger]="row.late_minutes > 0">
                    {{ row.late_minutes ? row.late_minutes + ' دقيقة' : '—' }}
                  </span>
                } @else {
                  {{ val }}
                }
              </ng-template>
            </nb-data-table>
          </nb-panel>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: #F8F9FC; font-family: var(--nb-font-family); }
    
    .btn-back {
      background: #F2F4F7;
      color: #344054;
      border: 1px solid #D0D5DD;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border-radius: 8px;
      text-decoration: none;
    }

    .emp-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid var(--nb-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05);
    }
    .stat-card .lbl {
      font-size: 12px;
      color: #667085;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .stat-card .val {
      font-size: 22px;
      font-weight: 800;
      color: #101828;
    }
    .text-danger { color: #D92D20 !important; }
    .text-warning { color: #F79009 !important; }

    .nb-btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 38px; padding: 0 16px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
    }
  `]
})
export class AttendanceEmployeeDetailsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly employee = signal<Employee | null>(null);
  readonly records = signal<AttendanceRecord[]>([]);

  readonly columns: NbColumn[] = [
    { key: 'date', label: 'التاريخ', fr: 1 },
    { key: 'check_in', label: 'وقت الحضور', fr: 1 },
    { key: 'check_out', label: 'وقت الانصراف', fr: 1 },
    { key: 'late_minutes', label: 'التأخير', fr: 1 },
    { key: 'status', label: 'الحالة', fr: 1 }
  ];

  readonly presentDays = computed(() => {
    return this.records().filter(r => r.status === 'present').length;
  });

  readonly absentDays = computed(() => {
    return this.records().filter(r => r.status === 'absent').length;
  });

  readonly totalLateMinutes = computed(() => {
    return this.records().reduce((sum, r) => sum + (r.late_minutes || 0), 0);
  });

  readonly workingHours = computed(() => {
    return this.presentDays() * 8; // معيار 8 ساعات عمل لكل يوم حضور
  });

  readonly tableRows = computed(() => {
    return this.records().map(r => ({
      ...r,
      check_in: r.check_in || '—',
      check_out: r.check_out || '—'
    }));
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const empId = params.get('id');
      if (empId) {
        this.loadEmployeeData(empId);
      }
    });
  }

  loadEmployeeData(empId: string) {
    this.loading.set(true);
    // جلب معلومات الموظف
    this.http.get<any>(`${environment.apiUrl}employees/employees/${empId}/`).subscribe({
      next: (res) => {
        this.employee.set(res);
        this.loadEmployeeRecords(empId);
      },
      error: () => this.loading.set(false)
    });
  }

  loadEmployeeRecords(empId: string) {
    this.http.get<any>(`${environment.apiUrl}attendance/records/?limit=1000`).subscribe({
      next: (res) => {
        this.loading.set(false);
        const list = res?.results || res?.data || res;
        if (Array.isArray(list)) {
          const empRecords = list.filter((r: any) => {
            if (String(r.employee) !== String(empId)) return false;
            if (!r.date) return false;
            const parts = r.date.split('-');
            return parts[0] === '2026' && (parts[1] === '06' || parts[1] === '6');
          });
          this.records.set(empRecords);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  readonly exportCols = computed<ExportColumn[]>(() => [
    { key: 'date', label: 'التاريخ' },
    { key: 'check_in', label: 'وقت الحضور' },
    { key: 'check_out', label: 'وقت الانصراف' },
    { key: 'late_minutes', label: 'التأخير (بالدقائق)' },
    { key: 'status', label: 'الحالة' }
  ]);
}
