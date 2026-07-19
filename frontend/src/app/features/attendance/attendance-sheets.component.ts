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

      <!-- شبكة بطاقات اختيار الشهور -->
      <div class="periods-cards-grid">
        @for (p of periods; track p.code) {
          <div 
            class="period-card" 
            [class.active]="selectedPeriod() === p.code"
            (click)="onPeriodChange(p.code)"
          >
            <div class="period-header">
              <span class="period-title">{{ p.label }}</span>
              <span 
                class="period-status-badge" 
                [class.badge-approved]="getSheetStatus(p.code) === 'approved'"
                [class.badge-draft]="getSheetStatus(p.code) !== 'approved'"
              >
                {{ getSheetStatus(p.code) === 'approved' ? 'معتمد' : 'مسودة' }}
              </span>
            </div>
            <p class="period-range">{{ p.range }}</p>
          </div>
        }
      </div>

      @if (loading()) {
        <nb-loading message="جاري تحميل كشوف الحضور والانصراف..."></nb-loading>
      } @else {
        <!-- كرت ملخص الكشوف المعلقة والمراجعة -->
        <div class="sheet-main-card">
          <div class="sheet-info">
            <span class="sheet-badge">كشف شهري</span>
            <h2>كشف شهر {{ getSelectedPeriodLabel() }}</h2>
            <p>{{ getSelectedPeriodRange() }}</p>
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
              <span class="num" [class.text-danger]="!isApproved()" [class.text-success]="isApproved()">
                {{ isApproved() ? 'معتمد' : 'مسودة' }}
              </span>
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
              <p>كشف الحضور والانصراف قد لا يكون دقيقاً بنسبة 100% للموظفين الذين لديهم أيام غير مجدولة أو سجلات غير مكتملة، يرجى النقر على بطاقة أي موظف أدناه لاتخاذ قرارات الاستثناء، أو التعديل، أو تحويل الغياب إلى إجازة.</p>
            </div>

            <div class="attention-grid">
              <!-- بطاقة الموظفين وحالات الانتباه -->
              <div class="attention-card">
                <h3>حالات تحتاج إلى انتباه (اضغط على الموظف لاتخاذ الإجراء)</h3>
                <div class="attention-list">
                  @for (emp of employees(); track emp.id; let idx = $index) {
                    @let lateMin = getEmployeeLateMinutes(emp.id);
                    @let absDays = getEmployeeAbsentDays(emp.id);
                    @if (lateMin > 0 || absDays > 0) {
                      <div class="attention-item clickable" (click)="openEmployeeActions(emp)">
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
                          <span class="action-hint-arrow">← اتخاذ إجراء</span>
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
                  [subtitle]="'كشف شهر ' + getSelectedPeriodLabel()"
                  [filename]="'كشف-الحضور-والانصراف-' + selectedPeriod()"
                ></nb-export-menu>
              </div>
            </div>

            <nb-panel [title]="'كشف حضور وانصراف الموظفين لشهر ' + getSelectedPeriodLabel()">

              <div id="print-area">
                <nb-data-table
                  [columns]="columns"
                  [rows]="tableRows()"
                  [emptyText]="'لا توجد سجلات حضور مسجلة لجهاز البصمة في هذا الشهر.'"
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

      <!-- نافذة اتخاذ القرار وحل حالات الانتباه -->
      @if (selectedEmployeeForActions(); as emp) {
        <div class="modal-backdrop" (click)="closeEmployeeActions()">
          <div class="modal-content animate-slide-up" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>معالجة حالات الحضور: {{ emp.full_name_ar }}</h3>
              <button class="close-btn" (click)="closeEmployeeActions()">✕</button>
            </div>

            <div class="modal-body">
              <p class="modal-info">اختر الإجراء الإداري المناسب لكل يوم مخالفة لتعديله في قاعدة البيانات والمسير مباشرة:</p>

              @let warnings = getEmployeeWarningRecords(emp.id);
              @if (warnings.length === 0) {
                <div style="text-align: center; padding: 24px; color: #027A48; font-weight: 700;">
                  ✓ تم حل جميع حالات الانتباه لهذا الموظف بنجاح!
                </div>
              } @else {
                <div class="warnings-details-list">
                  @for (rec of warnings; track rec.id) {
                    <div class="warning-detail-item">
                      <div class="warning-meta">
                        <span class="warning-date">{{ rec.date | date:'yyyy/MM/dd' }}</span>
                        <span 
                          class="att-badge"
                          [class.badge-red]="rec.status === 'absent'"
                          [class.badge-orange]="rec.status !== 'absent' && rec.late_minutes > 0"
                        >
                          {{ rec.status === 'absent' ? 'غياب كامل' : 'تأخير ' + rec.late_minutes + ' دقيقة' }}
                        </span>
                      </div>

                      <div class="warning-actions-row">
                        @if (rec.status === 'absent') {
                          <button class="nb-btn nb-btn-outline" (click)="updateRecordStatus(rec.id, 'leave')">
                            ✈️ تحويل إلى إجازة رسمية
                          </button>
                          <button class="nb-btn nb-btn-outline" (click)="updateRecordStatus(rec.id, 'present')">
                            ✓ احتساب حضور (عفو)
                          </button>
                        } @else if (rec.late_minutes > 0) {
                          @if (editingRecordId() === rec.id) {
                            <div style="display: flex; align-items: center; gap: 8px; width: 100%; margin-top: 4px;">
                              <input 
                                type="number" 
                                [value]="editingMinutesValue()" 
                                (input)="editingMinutesValue.set(+$any($event.target).value)"
                                style="width: 80px; height: 32px; padding: 0 8px; border: 1px solid var(--nb-border); border-radius: 6px; font-family: var(--nb-font-family); font-size: 13px;"
                              />
                              <button class="nb-btn nb-btn-success" style="height: 32px; font-size: 12px; padding: 0 12px; background: #12B76A; color: #fff;" (click)="saveEditLateness(rec.id)">
                                حفظ
                              </button>
                              <button class="nb-btn nb-btn-outline" style="height: 32px; font-size: 12px; padding: 0 12px; background: #fff; border: 1px solid #D0D5DD; color: #344054;" (click)="cancelEditLateness()">
                                إلغاء
                              </button>
                            </div>
                          } @else {
                            <button class="nb-btn nb-btn-outline" (click)="excuseLateness(rec.id)">
                              ✓ استثناء التأخير (عفو/تصفير)
                            </button>
                            <button class="nb-btn nb-btn-outline" (click)="startEditLateness(rec)">
                              ✏️ تعديل دقائق التأخير
                            </button>
                          }
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
            
            <div style="padding: 16px 24px; background: #F9FAFB; border-top: 1px solid #EAECF0; display: flex; justify-content: flex-end;">
              <button class="nb-btn" style="background: #101828; color: #fff;" (click)="closeEmployeeActions()">إغلاق النافذة</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; background: #F8F9FC; font-family: var(--nb-font-family); }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active, .nav-btn[routerLinkActive="active"] { background: #101828; color: #fff; }

    /* شبكة بطاقات اختيار الشهور */
    .periods-cards-grid {
      display: flex; gap: 16px; margin-top: 16px; width: 100%; flex-wrap: wrap; margin-bottom: 8px;
    }
    .period-card {
      background: #ffffff; border: 1px solid var(--nb-border); border-radius: 12px;
      padding: 16px 20px; min-width: 250px; flex: 1; cursor: pointer;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05); transition: all 0.2s ease-in-out;
      position: relative; display: flex; flex-direction: column; justify-content: space-between;
    }
    .period-card:hover {
      border-color: #7F56D9; transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 24, 40, 0.08);
    }
    .period-card.active {
      border-color: #6941C6; background: #F9F5FF;
      box-shadow: 0 4px 12px rgba(105, 65, 198, 0.1);
    }
    .period-card.active::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: #6941C6; border-radius: 12px 12px 0 0;
    }
    .period-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
    }
    .period-title {
      font-size: 15px; font-weight: 700; color: #101828;
    }
    .period-range {
      font-size: 12px; color: #667085; margin: 0;
    }
    .period-status-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px;
    }
    .badge-approved { background: #D1FADF; color: #027A48; }
    .badge-draft { background: #FEF0C7; color: #DC6803; }

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
    
    .attention-item.clickable {
      cursor: pointer; transition: background 0.15s ease;
    }
    .attention-item.clickable:hover {
      background: #F9FAFB; border-radius: 8px; padding: 0 8px;
    }
    .action-hint-arrow {
      font-size: 11px; font-weight: 700; color: #6941C6; background: #F4F3FF;
      padding: 2px 6px; border-radius: 4px; margin-left: 4px;
    }

    .emp-profile { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: #F9F5FF; color: #7F56D9; font-weight: 700; display: grid; place-items: center; font-size: 14px; }
    .emp-meta { display: flex; flex-direction: column; }
    .emp-meta .name { font-size: 13.5px; font-weight: 700; color: #101828; }
    .emp-meta .title { font-size: 11px; color: #667085; }
    .attention-badges { display: flex; align-items: center; gap: 6px; }
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

    /* النافذة المنبثقة (Modal) */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(16, 24, 40, 0.4); display: grid; place-items: center;
      z-index: 1000; backdrop-filter: blur(4px);
    }
    .modal-content {
      background: #ffffff; border-radius: 12px; width: 90%; max-width: 600px;
      box-shadow: 0 20px 24px -4px rgba(16, 24, 40, 0.1), 0 8px 8px -4px rgba(16, 24, 40, 0.04);
      display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--nb-border);
    }
    .modal-header {
      padding: 16px 24px; border-bottom: 1px solid #EAECF0;
      display: flex; justify-content: space-between; align-items: center;
    }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #101828; }
    .close-btn { background: transparent; border: none; font-size: 18px; cursor: pointer; color: #667085; }
    
    .modal-body { padding: 24px; max-height: 55vh; overflow-y: auto; }
    .modal-info { font-size: 13.5px; color: #475467; margin-bottom: 16px; font-weight: 500; }
    
    .warnings-details-list { display: flex; flex-direction: column; gap: 14px; }
    .warning-detail-item {
      padding: 16px; border: 1px solid #EAECF0; border-radius: 8px;
      display: flex; flex-direction: column; gap: 12px; background: #F9FAFB;
    }
    .warning-meta { display: flex; justify-content: space-between; align-items: center; }
    .warning-date { font-size: 13px; font-weight: 700; color: #344054; }
    .warning-actions-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .warning-actions-row .nb-btn-outline {
      background: #ffffff; border: 1px solid #D0D5DD; color: #344054;
      font-size: 12px; height: 32px; padding: 0 12px; border-radius: 6px;
    }
    .warning-actions-row .nb-btn-outline:hover {
      background: #F9FAFB; border-color: #B2DDFF; color: #175CD3;
    }
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

  readonly selectedPeriod = signal('2026-06');
  readonly currentSheetId = signal<string | null>(null);
  readonly sheets = signal<any[]>([]);
  readonly selectedEmployeeForActions = signal<Employee | null>(null);
  readonly editingRecordId = signal<string | null>(null);
  readonly editingMinutesValue = signal<number>(0);

  readonly periods = [
    { code: '2026-06', label: 'يونيو 2026', range: 'من 01 يونيو، 2026 إلى 30 يونيو، 2026' },
    { code: '2026-07', label: 'يوليو 2026', range: 'من 01 يوليو، 2026 إلى 31 يوليو، 2026' }
  ];

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

  getSelectedPeriodLabel(): string {
    const p = this.periods.find(x => x.code === this.selectedPeriod());
    return p ? p.label : 'يونيو 2026';
  }

  getSelectedPeriodRange(): string {
    const p = this.periods.find(x => x.code === this.selectedPeriod());
    return p ? p.range : '';
  }

  getSheetStatus(periodCode: string): string {
    const sheet = this.sheets().find(s => s.period_code === periodCode);
    return sheet ? sheet.status : 'draft';
  }

  onPeriodChange(code: string) {
    this.selectedPeriod.set(code);
    this.loadSheetMetadata();
  }

  openEmployeeActions(emp: Employee) {
    this.selectedEmployeeForActions.set(emp);
  }

  closeEmployeeActions() {
    this.selectedEmployeeForActions.set(null);
  }

  getEmployeeWarningRecords(empId: string): AttendanceRecord[] {
    return this.attendanceRecords().filter(r => 
      String(r.employee) === String(empId) && (r.status === 'absent' || (r.late_minutes && r.late_minutes > 0))
    );
  }

  updateRecordStatus(recId: string, status: string) {
    this.loading.set(true);
    this.http.patch<any>(`${environment.apiUrl}attendance/records/${recId}/`, { status }).subscribe({
      next: () => {
        this.notify.success('تم تحديث حالة السجل بنجاح.');
        this.loadAttendanceRecords();
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل تحديث السجل.');
      }
    });
  }

  excuseLateness(recId: string) {
    this.loading.set(true);
    this.http.patch<any>(`${environment.apiUrl}attendance/records/${recId}/`, { late_minutes: 0, status: 'present' }).subscribe({
      next: () => {
        this.notify.success('تم استثناء دقائق التأخير وتحديث السجل بنجاح.');
        this.loadAttendanceRecords();
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل استثناء التأخير.');
      }
    });
  }

  startEditLateness(rec: AttendanceRecord) {
    this.editingRecordId.set(rec.id);
    this.editingMinutesValue.set(rec.late_minutes || 0);
  }

  cancelEditLateness() {
    this.editingRecordId.set(null);
  }

  saveEditLateness(recId: string) {
    const mins = this.editingMinutesValue();
    if (mins === null || isNaN(mins) || mins < 0) {
      this.notify.error('أدخل رقماً صحيحاً لدقائق التأخير.');
      return;
    }
    this.loading.set(true);
    this.http.patch<any>(`${environment.apiUrl}attendance/records/${recId}/`, { late_minutes: mins }).subscribe({
      next: () => {
        this.notify.success('تم تعديل دقائق التأخير بنجاح.');
        this.editingRecordId.set(null);
        this.loadAttendanceRecords();
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل تعديل دقائق التأخير.');
      }
    });
  }

  loadSheetData() {
    this.loading.set(true);
    // جلب قائمة الموظفين
    this.http.get<any>(`${environment.apiUrl}employees/employees/`).subscribe({
      next: (res) => {
        const list = res?.results || res?.data || res;
        if (Array.isArray(list)) {
          this.employees.set(list);
          this.loadAllSheetsMetadata();
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  loadAllSheetsMetadata() {
    this.http.get<any>(`${environment.apiUrl}attendance/sheets/`).subscribe({
      next: (res) => {
        const list = res?.data || res;
        if (Array.isArray(list)) {
          this.sheets.set(list);
        }
        this.loadSheetMetadata();
      },
      error: () => {
        this.loadSheetMetadata();
      }
    });
  }

  loadSheetMetadata() {
    this.loading.set(true);
    // الحصول على بيانات الكشف أو إنشائه كمسودة
    this.http.get<any>(`${environment.apiUrl}attendance/sheets/get-or-create/?period_code=${this.selectedPeriod()}`).subscribe({
      next: (res) => {
        const sheet = res?.data || res;
        if (sheet) {
          this.currentSheetId.set(sheet.id);
          this.isApproved.set(sheet.status === 'approved');
          // تحديث قائمة الكشوفات محلياً
          const updated = [...this.sheets().filter(s => s.period_code !== sheet.period_code), sheet];
          this.sheets.set(updated);
        }
        this.loadAttendanceRecords();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadAttendanceRecords() {
    const parts = this.selectedPeriod().split('-');
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    // جلب البصمات للشهر المختار مباشرة من السيرفر بدون ترقيم ومصفاة بالكامل
    this.http.get<any>(`${environment.apiUrl}attendance/records/?year=${year}&month=${month}`).subscribe({
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
    if (!this.currentSheetId()) return;
    this.loading.set(true);
    this.http.post<any>(`${environment.apiUrl}attendance/sheets/${this.currentSheetId()}/approve/`, {}).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.isApproved.set(true);
        this.notify.success(`تم اعتماد كشف حضور وانصراف شهر ${this.getSelectedPeriodLabel()} وتصدير المخالصة المالية للمسير بنجاح.`);
        this.loadAllSheetsMetadata();
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('فشل اعتماد كشف الحضور، يرجى المحاولة لاحقاً.');
      }
    });
  }
}
