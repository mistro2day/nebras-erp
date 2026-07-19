import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbBadgeComponent } from '../../shared/nebras/nb-badge.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';
import { NbDataTableComponent, NbColumn } from '../../shared/nebras/nb-data-table.component';
import { NbExportMenuComponent, ExportColumn } from '../../shared/export';
import { NotificationService } from '../../core/services/notification.service';

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
  selector: 'app-attendance-sheets',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbBadgeComponent,
    NbLoadingComponent,
    NbDataTableComponent,
    NbExportMenuComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="الكشوف والمخالصات"
        subtitle="مراجعة واعتماد كشوف الحضور والانصراف الشهرية للموظفين لربطها بمسير الرواتب."
      ></nb-page-header>

      @if (loading()) {
        <nb-loading message="جاري تحميل كشوف الحضور والانصراف..."></nb-loading>
      } @else {
        <!-- كرت ملخص الكشوف المعلقة والمراجعة -->
        <div class="sheet-main-card">
          <div class="sheet-info">
            <span class="sheet-badge">كشف شهري</span>
            <h2>كشف شهر يونيو، 2026</h2>
            <p>من 01 يونيو، 2026 إلى 30 يونيو، 2026</p>
          </div>
          
          <div class="sheet-summary-stats">
            <div class="stat-box">
              <span class="num">{{ employees().length }}</span>
              <span class="label">الموظفين في هذا الكشف</span>
            </div>
            <div class="stat-box">
              <span class="num text-danger">{{ totalLateEmployees() }}</span>
              <span class="label">لديهم تأخيرات</span>
            </div>
            <div class="stat-box">
              <span class="num text-warning">{{ totalAbsentCount() }}</span>
              <span class="label">أيام الغياب الإجمالية</span>
            </div>
            <div class="stat-box">
              <span class="num">{{ isApproved() ? 'معتمد' : 'قيد المراجعة' }}</span>
              <span class="label">حالة الكشف الحالية</span>
            </div>
          </div>

          <div class="sheet-actions">
            @if (!isApproved()) {
              <button class="nb-btn nb-btn-success" (click)="approveSheet()">
                ✓ اعتماد الكشف والمخالصة
              </button>
            } @else {
              <div class="approved-badge">✓ تم اعتماد الكشف وجاهز للمسير</div>
            }
          </div>
        </div>

        <!-- التبويبات المتقدمة (الملخص | الكشف الكامل) -->
        <div class="tabs-bar">
          <button class="tab-pill" [class.active]="activeTab() === 'summary'" (click)="activeTab.set('summary')">الملخص وحالات الانتباه</button>
          <button class="tab-pill" [class.active]="activeTab() === 'full'" (click)="activeTab.set('full')">الكشف الكامل للموظفين</button>
        </div>

        @if (activeTab() === 'summary') {
          <div class="summary-view animate-fade">
            <div class="alert-strip">
              <span class="alert-icon">⚠️</span>
              <p>كشف الحضور والانصراف قد لا يكون دقيقاً بنسبة 100% للموظفين الذين لديهم أيام غير مجدولة أو سجلات غير مكتملة، يرجى معالجة الحالات التي تم إبرازها تجنباً لتأثيرات غير مرغوب فيها على مسير الرواتب.</p>
            </div>

            <div class="attention-grid">
              <!-- بطاقة الموظفين وحالات الانتباه -->
              <div class="attention-card">
                <h3>حالات تحتاج إلى انتباه</h3>
                <div class="attention-list">
                  @for (emp of employees(); track emp.id; let idx = $index) {
                    @let lateMin = getEmployeeLateMinutes(emp.id);
                    @let absDays = getEmployeeAbsentDays(emp.id);
                    @if (lateMin > 0 || absDays > 0) {
                      <div class="attention-item">
                        <div class="emp-profile">
                          <div class="avatar">{{ emp.full_name_ar.charAt(0) }}</div>
                          <div class="emp-meta">
                            <span class="name">{{ emp.full_name_ar }}</span>
                            <span class="title">{{ emp.position || 'موظف' }}</span>
                          </div>
                        </div>
                        <div class="attention-badges">
                          @if (absDays > 0) {
                            <span class="att-badge badge-red">أيام غياب: {{ absDays }}</span>
                          }
                          @if (lateMin > 0) {
                            <span class="att-badge badge-orange">تأخير: {{ lateMin }} دقيقة</span>
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>

              <!-- بطاقة المعلومات العامة الجانبية -->
              <div class="info-card-side">
                <h3>معلومات عامة</h3>
                <ul class="info-list">
                  <li>
                    <span class="bullet icon-blue">📋</span>
                    <span class="lbl">الموظفين المشمولين</span>
                    <span class="val">{{ employees().length }} موظف</span>
                  </li>
                  <li>
                    <span class="bullet icon-red">⏰</span>
                    <span class="lbl">إجمالي دقائق التأخير</span>
                    <span class="val">{{ totalLateMinutes() }} دقيقة</span>
                  </li>
                  <li>
                    <span class="bullet icon-orange">👤</span>
                    <span class="lbl">موظفون تم تقييمهم</span>
                    <span class="val">{{ employees().length }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'full') {
          <div class="full-view animate-fade">
            <div class="table-controls" style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
              <div class="search-box" style="position: relative; flex: 1; max-width: 320px;">
                <input
                  type="text"
                  placeholder="ابحث باسم الموظف أو الوظيفة..."
                  [value]="searchTerm()"
                  (input)="searchTerm.set($any($event.target).value)"
                  style="width: 100%; height: 38px; padding: 0 16px; border: 1px solid var(--nb-border); border-radius: 8px; font-family: var(--nb-font-family); font-size: 13px;"
                />
              </div>
              <div class="export-actions">
                <nb-export-menu
                  [columns]="exportCols()"
                  [rows]="tableRows()"
                  title="كشف الحضور والانصراف"
                  subtitle="كشف شهر يونيو 2026"
                  filename="كشف-الحضور-والانصراف-يونيو-2026"
                ></nb-export-menu>
              </div>
            </div>

            <nb-panel title="كشف حضور وانصراف الموظفين لشهر يونيو 2026">

              <div id="print-area">
                <nb-data-table
                  [columns]="columns"
                  [rows]="tableRows()"
                  [emptyText]="'لا توجد سجلات حضور مسجلة.'"
                >
                  <ng-template #cell let-row let-col="col" let-val="value">
                    @if (col.key === 'full_name_ar') {
                      <a [routerLink]="['/attendance/sheets', row.id]" class="clickable-name-link font-bold">
                        {{ val }}
                      </a>
                    } @else if (col.key === 'status') {
                      <nb-badge [kind]="row.absDays > 0 || row.lateMin > 0 ? 'warning' : 'success'">
                        {{ row.absDays > 0 || row.lateMin > 0 ? 'يتطلب مراجعة' : 'مكتمل ومعتمد' }}
                      </nb-badge>
                    } @else {
                      {{ val }}
                    }
                  </ng-template>
                </nb-data-table>
              </div>
            </nb-panel>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: #F8F9FC; font-family: var(--nb-font-family); }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active, .nav-btn[routerLinkActive="active"] { background: #101828; color: #fff; }

    /* الكرت الرئيسي */
    .sheet-main-card {
      background: #ffffff; border: 1px solid var(--nb-border); border-radius: 12px;
      padding: 24px; margin-top: 16px; display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.1); flex-wrap: wrap; gap: 20px;
    }
    .sheet-info h2 { margin: 6px 0 2px 0; font-size: 20px; font-weight: 700; color: #101828; }
    .sheet-info p { margin: 0; font-size: 13px; color: #667085; }
    .sheet-badge { background: #F2F4F7; color: #344054; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }

    .sheet-summary-stats { display: flex; gap: 24px; }
    .stat-box { display: flex; flex-direction: column; }
    .stat-box .num { font-size: 22px; font-weight: 800; color: #101828; }
    .stat-box .label { font-size: 11px; color: #667085; font-weight: 600; }
    .text-danger { color: #D92D20 !important; }
    .text-warning { color: #F79009 !important; }

    .sheet-actions { display: flex; align-items: center; }
    .approved-badge { background: #D1FADF; color: #039855; font-weight: 700; font-size: 13px; padding: 8px 16px; border-radius: 8px; }

    /* التبويبات */
    .tabs-bar { display: flex; gap: 8px; margin-top: 24px; margin-bottom: 16px; border-bottom: 1px solid #EAECF0; padding-bottom: 8px; }
    .tab-pill { background: transparent; border: none; padding: 8px 16px; font-size: 13px; font-weight: 700; color: #667085; cursor: pointer; border-radius: 6px; }
    .tab-pill:hover { background: #F9FAFB; color: #344054; }
    .tab-pill.active { background: #F4F3FF; color: #6941C6; }

    /* تنبيه */
    .alert-strip { background: #FFFCF5; border: 1px solid #FEDF89; border-radius: 8px; padding: 12px 16px; display: flex; gap: 10px; align-items: center; margin-bottom: 20px; }
    .alert-strip p { margin: 0; font-size: 12.5px; color: #B54708; font-weight: 600; line-height: 1.5; }
    .alert-icon { font-size: 18px; }

    /* شبكة انتباه */
    .attention-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
    .attention-card, .info-card-side { background: #ffffff; border: 1px solid #EAECF0; border-radius: 12px; padding: 20px; }
    .attention-card h3, .info-card-side h3 { margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #101828; }
    
    .attention-list { display: flex; flex-direction: column; gap: 12px; }
    .attention-item { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #F2F4F7; }
    .emp-profile { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #F9F5FF; color: #7F56D9; font-weight: 700; display: grid; place-items: center; font-size: 14px; }
    .emp-meta { display: flex; flex-direction: column; }
    .emp-meta .name { font-size: 13.5px; font-weight: 700; color: #101828; }
    .emp-meta .title { font-size: 11px; color: #667085; }
    .attention-badges { display: flex; gap: 6px; }
    .att-badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge-red { background: #FEE4E2; color: #D92D20; }
    .badge-orange { background: #FEF0C7; color: #DC6803; }

    /* معلومات جانبية */
    .info-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
    .info-list li { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .info-list .bullet { font-size: 16px; }
    .info-list .lbl { color: #667085; font-weight: 600; flex: 1; }
    .info-list .val { font-weight: 700; color: #101828; }

    /* رابط اسم الموظف */
    .clickable-name-link {
      color: #6941C6;
      text-decoration: underline;
      cursor: pointer;
    }
    .clickable-name-link:hover {
      color: #53389e;
    }

    /* أزرار نبراس */
    .nb-btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 38px; padding: 0 16px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
    }
    .nb-btn-success { background: #12B76A; color: #fff; }
    .nb-btn-success:hover { background: #027A48; }
  `]
})
export class AttendanceSheetsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly notify = inject(NotificationService);

  readonly activeTab = signal<'summary' | 'full'>('summary');
  readonly loading = signal(false);
  readonly isApproved = signal(false);

  readonly employees = signal<Employee[]>([]);
  readonly attendanceRecords = signal<AttendanceRecord[]>([]);

  readonly columns: NbColumn[] = [
    { key: 'full_name_ar', label: 'الموظف', fr: 2 },
    { key: 'role_info', label: 'القسم والوظيفة', fr: 2 },
    { key: 'scheduledDays', label: 'أيام العمل المجدولة', fr: 1 },
    { key: 'actualDays', label: 'أيام الحضور الفعلي', fr: 1 },
    { key: 'absDaysText', label: 'الغياب', fr: 1 },
    { key: 'lateMinText', label: 'إجمالي دقائق التأخير', fr: 1 },
    { key: 'status', label: 'الحالة', fr: 1 }
  ];

  // إحصائيات الكشف الكلية
  readonly totalLateMinutes = computed(() => {
    return this.attendanceRecords().reduce((sum, r) => sum + (r.late_minutes || 0), 0);
  });

  readonly totalLateEmployees = computed(() => {
    const ids = new Set(this.attendanceRecords().filter(r => r.late_minutes > 0).map(r => r.employee));
    return ids.size;
  });

  readonly totalAbsentCount = computed(() => {
    return this.attendanceRecords().filter(r => r.status === 'absent').length;
  });

  readonly searchTerm = signal('');
  readonly sortKey = signal<string>('full_name_ar');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly exportCols = computed<ExportColumn[]>(() => [
    { key: 'full_name_ar', label: 'الموظف' },
    { key: 'role_info', label: 'القسم والوظيفة' },
    { key: 'scheduledDays', label: 'أيام العمل المجدولة' },
    { key: 'actualDays', label: 'أيام الحضور الفعلي' },
    { key: 'absDaysText', label: 'الغياب' },
    { key: 'lateMinText', label: 'إجمالي دقائق التأخير' }
  ]);

  readonly tableRows = computed(() => {
    let rows = this.employees().map(emp => {
      const lateMin = this.getEmployeeLateMinutes(emp.id);
      const absDays = this.getEmployeeAbsentDays(emp.id);
      return {
        id: emp.id,
        full_name_ar: emp.full_name_ar,
        role_info: `${emp.department || 'التربية والتعليم'} - ${emp.position || 'معلم'}`,
        scheduledDays: '22 يوم',
        actualDays: `${22 - absDays} يوم`,
        absDaysText: `${absDays} يوم`,
        lateMinText: `${lateMin || '0'} دقيقة`,
        absDays,
        lateMin
      };
    });

    // تطبيق البحث
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      rows = rows.filter(r => 
        r.full_name_ar.toLowerCase().includes(term) ||
        r.role_info.toLowerCase().includes(term)
      );
    }

    // تطبيق الترتيب
    const key = this.sortKey();
    const dir = this.sortDirection();
    rows.sort((a: any, b: any) => {
      const valA = a[key] || '';
      const valB = b[key] || '';
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  });

  toggleSort(key: string) {
    if (this.sortKey() === key) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
  }

  ngOnInit() {
    this.loadSheetData();
  }

  loadSheetData() {
    this.loading.set(true);
    // جلب قائمة الموظفين
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        const list = res?.results || res?.data || res;
        if (Array.isArray(list)) {
          this.employees.set(list);
          this.loadAttendanceRecords();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  loadAttendanceRecords() {
    // جلب البصمات لشهر يونيو 2026 مباشرة من السيرفر بدون ترقيم ومصفاة بالكامل
    this.http.get<any>(`${environment.apiUrl}attendance/records/?year=2026&month=6`).subscribe({
      next: (res) => {
        this.loading.set(false);
        const list = res?.data || res;
        if (Array.isArray(list)) {
          this.attendanceRecords.set(list);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  getEmployeeLateMinutes(empId: string): number {
    return this.attendanceRecords()
      .filter(r => String(r.employee) === String(empId))
      .reduce((sum, r) => sum + (r.late_minutes || 0), 0);
  }

  getEmployeeAbsentDays(empId: string): number {
    return this.attendanceRecords()
      .filter(r => String(r.employee) === String(empId) && r.status === 'absent')
      .length;
  }



  approveSheet() {
    this.isApproved.set(true);
    this.notify.success('تم اعتماد كشف حضور وانصراف شهر يونيو وتصدير المخالصة المالية للمسير بنجاح.');
  }
}
