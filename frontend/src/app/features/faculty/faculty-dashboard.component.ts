import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { TeacherCardComponent, TeacherInfo } from '../../shared/components/teacher-card/teacher-card.component';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbStatCardComponent } from '../../shared/nebras/nb-stat-card.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { AcademicsService } from '../academics/academics.service';
import { NotificationService } from '../../core/services/notification.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  AccountActionDialogComponent,
} from '../../shared/components/account-action-dialog/account-action-dialog.component';
import { forkJoin } from 'rxjs';

export function pickList<T = any>(res: any): T[] {
  return res && res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : (Array.isArray(res) ? res : []);
}

interface DetailedFaculty extends TeacherInfo {
  email: string;
  mobile: string;
  nationality: string;
  date_of_birth: string;
  department: string;
  joining_date: string;
  // مالية حقيقية من ملف الموظف (تُغني عن أي بيانات وهمية)
  basic_salary?: number;
  total_allowances?: number;
  net_payable?: number;
  employment_type?: string;
  weekly_lesson_quota?: number;
  // للتوافق مع مودال التفاصيل القائم
  salary?: number;
  allowance?: number;
  contractType?: string;
}

interface DBTeacherAssignment {
  id?: string;
  faculty_member: string;
  faculty_member_name?: string;
  subject_id: string;
  subject_name?: string;
  section_id: string;
  section_name?: string;
  weekly_hours: number;
}

@Component({
  selector: 'app-faculty-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, FormsModule, MatDialogModule, TeacherCardComponent, NbPageHeaderComponent, NbStatCardComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة شؤون المعلمين وأعضاء هيئة التدريس"
        [subtitle]="'بوابة إدارة وتعيين المعلمين وأعضاء الهيئة الأكاديمية لـ ' + (($any(tenantService).currentTenant())?.nameAr || 'نبراس ERP')"
      ></nb-page-header>

      <!-- التبويبات -->
      <div class="tabs-nav">
        <button class="tab-btn" [class.active]="activeTab() === 'dashboard'" (click)="activeTab.set('dashboard')">
          📊 نظرة عامة
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'staff'" (click)="activeTab.set('staff')">
          👥 الكادر الأكاديمي
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'assignments'" (click)="activeTab.set('assignments')">
          📝 التكليفات التدريسية
        </button>
      </div>

      <!-- تبويب: نظرة عامة -->
      @if (activeTab() === 'dashboard') {
        <div class="stats-grid animate-fade">
          <nb-stat-card label="إجمالي الكادر الأكاديمي" [value]="teachers().length"></nb-stat-card>
          <nb-stat-card label="التكليفات النشطة" [value]="assignments().length" valueKind="info"></nb-stat-card>
          <nb-stat-card label="إجمالي الحصص الأسبوعية" [value]="totalWeeklyHours()" valueKind="info"></nb-stat-card>
          <nb-stat-card label="تجاوزوا النصاب" [value]="overloadedCount()" [valueKind]="overloadedCount() ? 'warning' : 'default'"></nb-stat-card>
          <nb-stat-card label="قيد المراجعة" [value]="getPendingCount()" [valueKind]="getPendingCount() ? 'warning' : 'default'"></nb-stat-card>
        </div>

        <div class="dashboard-sections animate-fade">
          <!-- توزيع النصاب التدريسي الحقيقي -->
          <nb-panel title="توزيع النصاب التدريسي الأسبوعي">
            @if (workload().length === 0) {
              <div class="no-data">لا توجد تكليفات مُسندة بعد. ابدأ من «التكليفات التدريسية».</div>
            } @else {
              <div class="dist-chart">
                @for (w of workload(); track w.id) {
                  <div class="chart-item">
                    <span class="label" [title]="w.name">{{ w.name }}</span>
                    <div class="bar-container">
                      <div class="fill" [class]="'load-' + w.state" [style.width.%]="w.pct"></div>
                    </div>
                    <span class="val" [class.over]="w.state === 'over'">{{ w.hours }} / {{ w.quota }}</span>
                  </div>
                }
              </div>
              <div class="load-legend">
                <span><i class="dot load-ok"></i> ضمن النصاب</span>
                <span><i class="dot load-full"></i> شبه مكتمل</span>
                <span><i class="dot load-over"></i> تجاوز النصاب</span>
              </div>
            }
          </nb-panel>

          <nb-panel title="إجراءات سريعة" [flush]="true">
            <div class="quick-actions">
              <div class="action-card" (click)="activeTab.set('assignments')">
                <span class="icon">📝</span>
                <span class="title">إسناد تكليف جديد</span>
                <span class="desc">تعيين معلم لمادة وشعبة</span>
              </div>
              <div class="action-card" (click)="activeTab.set('staff')">
                <span class="icon">👥</span>
                <span class="title">دليل الكادر</span>
                <span class="desc">بحث وعرض ملفات المعلمين</span>
              </div>
            </div>
            <div class="dept-summary">
              <div class="dept-row"><span>الأقسام الأكاديمية</span><b>{{ departmentCount() }}</b></div>
              <div class="dept-row"><span>متوسط الحصص لكل معلم</span><b>{{ avgHoursPerTeacher() }}</b></div>
            </div>
          </nb-panel>
        </div>
      }

      <!-- تبويب: دليل الكادر الأكاديمي -->
      @if (activeTab() === 'staff') {
        <!-- شريط أدوات: بحث + تبديل العرض -->
        <div class="staff-toolbar animate-fade">
          <div class="staff-search">
            <span class="search-ic">🔍</span>
            <input type="search" [ngModel]="staffSearch()" (ngModelChange)="staffSearch.set($event)"
                   placeholder="ابحث بالاسم أو الرمز أو القسم…" aria-label="بحث في الكادر" />
            @if (staffSearch()) {
              <button class="search-clear" (click)="staffSearch.set('')" aria-label="مسح البحث">✕</button>
            }
          </div>
          <div class="staff-meta">
            <span class="count-pill">{{ filteredTeachers().length }} من {{ teachers().length }}</span>
            <div class="view-toggle" role="group" aria-label="طريقة العرض">
              <button [class.on]="staffView() === 'table'" (click)="staffView.set('table')" title="جدول">☰ جدول</button>
              <button [class.on]="staffView() === 'grid'" (click)="staffView.set('grid')" title="شبكة">▦ شبكة</button>
            </div>
          </div>
        </div>

        @if (loadingStaff()) {
          <div class="no-data">جارٍ تحميل الكادر الأكاديمي…</div>
        } @else if (teachers().length === 0) {
          <div class="no-data">لا يوجد كادر أكاديمي مسجل حالياً.</div>
        } @else if (filteredTeachers().length === 0) {
          <div class="no-data">لا نتائج تطابق «{{ staffSearch() }}».</div>
        } @else if (staffView() === 'table') {
          <!-- العرض الافتراضي: جدول قابل للمسح مع إجراءات -->
          <div class="staff-table-wrap animate-fade">
            <table class="staff-table">
              <thead>
                <tr>
                  <th>المعلم</th><th>القسم</th><th>المنصب</th>
                  <th>نوع التوظيف</th><th>الحالة</th><th class="num">صافي المستحق</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                @for (t of filteredTeachers(); track t.id) {
                  <tr class="staff-row" (click)="viewHRDetails(t)" tabindex="0"
                      (keydown.enter)="viewHRDetails(t)">
                    <td>
                      <div class="who">
                        <span class="avatar-sm">{{ initials(t.full_name_ar) }}</span>
                        <div class="who-txt">
                          <b>{{ t.full_name_ar }}</b>
                          <span class="who-code">{{ t.teacher_code || '—' }}</span>
                        </div>
                      </div>
                    </td>
                    <td>{{ t.department || '—' }}</td>
                    <td>{{ t.current_position || '—' }}</td>
                    <td>{{ employmentTypeLabel(t.employment_type) }}</td>
                    <td><span class="s-pill" [class]="'s-' + statusKind(t.status)">{{ statusLabel(t.status) }}</span></td>
                    <td class="num salary">{{ (t.net_payable || 0) | number }} ج.س</td>
                    <td class="row-actions" (click)="$event.stopPropagation()">
                      <button class="act view" (click)="viewHRDetails(t)" title="عرض التفاصيل">تفاصيل</button>
                      <button class="act key" (click)="activateAccount(t)"
                              [disabled]="!t.email || activatingId() === t.id"
                              [title]="t.email ? 'تفعيل حساب الدخول' : 'يلزم بريد إلكتروني'">🔑</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <!-- عرض الشبكة: البطاقات -->
          <div class="cards-grid animate-fade">
            @for (teacher of filteredTeachers(); track teacher.id) {
              <div class="teacher-card-wrapper" (click)="viewHRDetails(teacher)">
                <app-teacher-card [teacher]="teacher"></app-teacher-card>
                <button class="nb-btn-primary sm detail-btn" (click)="$event.stopPropagation(); viewHRDetails(teacher)">
                  👤 عرض التفاصيل والتعاقد
                </button>
              </div>
            }
          </div>
        }
      }

      <!-- تبويب: التكليفات التدريسية -->
      @if (activeTab() === 'assignments') {
        <div class="assignments-container animate-fade">
          <!-- قائمة التكليفات الحالية -->
          <nb-panel title="كشف التكليفات التدريسية الحالية" [flush]="true">
            <div class="tbl">
              <div class="tbl-head" style="grid-template-columns: 1.5fr 1.2fr 1.2fr 1fr 0.8fr">
                <span>المعلم</span><span>المادة الدراسية</span><span>الصف والفصل</span><span>ساعات النصاب</span><span>إجراءات</span>
              </div>
              @if (loadingAssignments()) {
                <div class="tbl-empty">جارٍ تحميل التكليفات التدريسية…</div>
              } @else if (assignments().length === 0) {
                <div class="tbl-empty">لا توجد تكليفات مسجلة حالياً.</div>
              } @else {
                @for (asn of assignments(); track asn.id) {
                  <div class="tbl-row" style="grid-template-columns: 1.5fr 1.2fr 1.2fr 1fr 0.8fr">
                    <span class="bold-text">{{ asn.faculty_member_name || '—' }}</span>
                    <span>{{ asn.subject_name || '—' }}</span>
                    <span>{{ asn.section_name || '—' }}</span>
                    <span class="hours">{{ asn.weekly_hours }} ساعات/أسبوع</span>
                    <span>
                      <button class="btn-delete" (click)="deleteAssignment(asn.id!)">إلغاء</button>
                    </span>
                  </div>
                }
              }
            </div>
          </nb-panel>

          <!-- استمارة تكليف جديد -->
          <nb-panel title="إسناد تكليف تدريسي جديد">
            <div class="assignment-form">
              <div class="form-grid">
                <div class="fld req">
                  <label>المعلم</label>
                  <select [(ngModel)]="newAsn.faculty_member">
                    <option value="">اختر المعلم…</option>
                    @for (t of teachers(); track t.id) {
                      <option [value]="t.id">{{ t.full_name_ar }}</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>الصف الدراسي</label>
                  <select [(ngModel)]="selectedGradeId" (change)="onGradeChange()">
                    <option value="">اختر الصف…</option>
                    @for (g of grades(); track g.id) {
                      <option [value]="g.id">{{ g.name }}</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>الفصل الدراسي</label>
                  <select [(ngModel)]="newAsn.section_id">
                    <option value="">اختر الفصل…</option>
                    @for (sec of filteredSections(); track sec.id) {
                      <option [value]="sec.id">{{ sec.name }}</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>المادة الدراسية</label>
                  <select [(ngModel)]="newAsn.subject_id">
                    <option value="">اختر المادة…</option>
                    @for (sub of filteredSubjects(); track sub.id) {
                      <option [value]="sub.id">{{ sub.arabic_name }} ({{ sub.code }})</option>
                    }
                  </select>
                </div>
                <div class="fld req">
                  <label>الساعات الأسبوعية</label>
                  <input type="number" min="1" [(ngModel)]="newAsn.weekly_hours" />
                </div>
              </div>
              <div class="form-actions" style="margin-top: 16px;">
                <button class="nb-btn-primary" (click)="saveAssignment()" [disabled]="savingAsn()">
                  {{ savingAsn() ? 'جارٍ الحفظ…' : 'حفظ التكليف التدريسي' }}
                </button>
              </div>
            </div>
          </nb-panel>
        </div>
      }
    </div>

    <!-- نافذة تفاصيل الموارد البشرية والتعاقد -->
    @if (selectedFaculty()) {
      <div class="overlay" (click)="selectedFaculty.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>بيانات التعاقد والموارد البشرية</h3>
            <p class="modal-sub">تفاصيل ملف الموظف والراتب المسترجع من الموارد البشرية (HR).</p>
          </div>
          <div class="modal-body">
            <div class="profile-summary">
              <span class="avatar">{{ initials(selectedFaculty()!.full_name_ar) }}</span>
              <div class="meta">
                <h4>{{ selectedFaculty()!.full_name_ar }}</h4>
                <span class="pos">{{ selectedFaculty()!.current_position }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h5>📋 تفاصيل التوظيف والعقد</h5>
              <div class="detail-row">
                <span>تاريخ التعيين:</span>
                <strong>{{ selectedFaculty()!.joining_date || '2023-01-15' }}</strong>
              </div>
              <div class="detail-row">
                <span>نوع العقد:</span>
                <strong>{{ selectedFaculty()!.contractType || 'دوام كامل' }}</strong>
              </div>
              <div class="detail-row">
                <span>القسم الإداري:</span>
                <strong>{{ selectedFaculty()!.department }}</strong>
              </div>
            </div>

            <div class="detail-section">
              <h5>💰 كشف راتب المعلم</h5>
              <div class="detail-row">
                <span>الراتب الأساسي:</span>
                <strong class="salary">{{ selectedFaculty()!.salary | number }} ج.س</strong>
              </div>
              <div class="detail-row">
                <span>البدلات الإضافية:</span>
                <strong>{{ selectedFaculty()!.allowance | number }} ج.س</strong>
              </div>
              <div class="detail-row total">
                <span>إجمالي الراتب المستحق:</span>
                <strong class="salary">{{ (selectedFaculty()!.salary! + selectedFaculty()!.allowance!) | number }} ج.س</strong>
              </div>
            </div>

            <div class="detail-section">
              <h5>🔐 حساب المعلم والدخول للنظام</h5>
              <p class="account-hint">تفعيل حساب المعلم ينشئ صلاحية الدخول للنظام (لوحة المعلم) مع بوابة الخدمة الذاتية، ويرسل بيانات الدخول عبر البريد الإلكتروني وواتساب.</p>
              <button class="nb-btn-primary" style="width:100%; margin-top:8px;"
                (click)="activateAccount(selectedFaculty()!)"
                [disabled]="!selectedFaculty()!.email || activatingId() === selectedFaculty()!.id"
                [title]="!selectedFaculty()!.email ? 'يجب توفّر البريد الإلكتروني لتفعيل الحساب' : 'تفعيل حساب المعلم'">
                {{ activatingId() === selectedFaculty()!.id ? 'جارٍ التنفيذ…' : '🔑 تفعيل حساب المعلم / الموظف' }}
              </button>
              <button class="nb-btn-secondary" style="width:100%; margin-top:8px;"
                (click)="resetPassword(selectedFaculty()!)"
                [disabled]="!selectedFaculty()!.email || activatingId() === selectedFaculty()!.id"
                title="توليد كلمة مرور جديدة لحساب المعلم وإرسالها عبر البريد وواتساب">
                ♻️ إعادة تعيين كلمة المرور
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="nb-btn-primary" (click)="selectedFaculty.set(null)">إغلاق</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { flex: 1; padding: 24px; overflow-y: auto; font-family: var(--nb-font-family); background: var(--nb-background); }
    .tabs-nav { display: flex; gap: 8px; border-bottom: 2px solid var(--nb-border-soft); margin-bottom: 24px; padding-bottom: 4px; }
    .tab-btn { background: none; border: none; padding: 10px 18px; font-family: var(--nb-font-family); font-size: 14px;
      font-weight: 600; color: var(--nb-text-secondary); cursor: pointer; border-radius: var(--nb-radius); transition: all 0.2s; }
    .tab-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .tab-btn.active { background: var(--nb-primary-50); color: var(--nb-primary-700); font-weight: 700; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .teacher-card-wrapper { display: flex; flex-direction: column; gap: 8px; cursor: pointer; }
    .detail-btn { width: 100%; text-align: center; }

    /* ==== شريط أدوات دليل الكادر ==== */
    .staff-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .staff-search { position: relative; flex: 1; min-width: 240px; max-width: 420px; display: flex; align-items: center; }
    .staff-search .search-ic { position: absolute; inset-inline-start: 12px; font-size: 13px; opacity: .55; pointer-events: none; }
    .staff-search input { width: 100%; height: 40px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); background: var(--nb-surface); color: var(--nb-text); font-family: var(--nb-font-family); font-size: 13.5px; padding: 0 38px; outline: none; transition: border-color .15s; }
    .staff-search input:focus { border-color: var(--nb-primary-600); }
    .staff-search .search-clear { position: absolute; inset-inline-end: 10px; border: none; background: transparent; color: var(--nb-text-muted); cursor: pointer; font-size: 13px; padding: 4px; }
    .staff-meta { display: flex; align-items: center; gap: 12px; }
    .count-pill { font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .view-toggle { display: inline-flex; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); overflow: hidden; }
    .view-toggle button { border: none; background: var(--nb-surface); color: var(--nb-text-muted); padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: var(--nb-font-family); }
    .view-toggle button.on { background: var(--nb-primary-600); color: #fff; }
    .view-toggle button:not(.on):hover { background: var(--nb-bg); }

    /* ==== جدول الكادر (العرض الافتراضي) ==== */
    .staff-table-wrap { overflow-x: auto; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); background: var(--nb-surface); box-shadow: var(--nb-shadow-sm, 0 1px 2px rgba(0,0,0,.04)); }
    .staff-table { width: 100%; border-collapse: collapse; min-width: 760px; }
    .staff-table thead th { text-align: right; font-size: 12px; font-weight: 700; color: var(--nb-text-muted); background: var(--nb-bg); padding: 12px 16px; border-bottom: 1px solid var(--nb-border); white-space: nowrap; }
    .staff-table th.num, .staff-table td.num { text-align: start; }
    .staff-row { cursor: pointer; transition: background .12s; }
    .staff-row:hover { background: color-mix(in srgb, var(--nb-primary-600) 5%, transparent); }
    .staff-row:focus-visible { outline: 2px solid var(--nb-primary-600); outline-offset: -2px; }
    .staff-table td { padding: 12px 16px; border-bottom: 1px solid var(--nb-border); font-size: 13px; color: var(--nb-text); vertical-align: middle; }
    .staff-table tbody tr:last-child td { border-bottom: none; }
    .who { display: flex; align-items: center; gap: 10px; }
    .avatar-sm { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--nb-primary-600) 12%, transparent); color: var(--nb-primary-700); font-weight: 700; font-size: 12.5px; flex-shrink: 0; }
    .who-txt { display: flex; flex-direction: column; gap: 1px; }
    .who-txt b { font-weight: 700; }
    .who-code { font-size: 11px; color: var(--nb-text-muted); font-variant-numeric: tabular-nums; }
    .staff-table td.salary { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--nb-primary-700); }
    .s-pill { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 99px; white-space: nowrap; }
    .s-good { background: color-mix(in srgb, var(--nb-success) 15%, transparent); color: var(--nb-success); }
    .s-warn { background: color-mix(in srgb, #d97706 15%, transparent); color: #b45309; }
    .s-muted { background: var(--nb-bg); color: var(--nb-text-muted); }
    .row-actions { display: flex; gap: 6px; white-space: nowrap; }
    .row-actions .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: var(--nb-radius); padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--nb-text); font-family: var(--nb-font-family); }
    .row-actions .act.view:hover { border-color: var(--nb-primary-600); color: var(--nb-primary-700); }
    .row-actions .act.key { padding: 5px 8px; }
    .row-actions .act:disabled { opacity: .45; cursor: not-allowed; }

    .dashboard-sections { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-top: 24px; }
    @media (max-width: 900px) { .dashboard-sections { grid-template-columns: 1fr; } }

    /* الإجراءات السريعة */
    .quick-actions { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 16px; }
    .action-card { display: flex; flex-direction: column; align-items: flex-start; text-align: right; background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius-card); padding: 14px; cursor: pointer; transition: all 0.2s; }
    .action-card:hover { border-color: var(--nb-primary-400); box-shadow: 0 4px 12px var(--nb-primary-50); transform: translateY(-2px); }
    .action-card .icon { font-size: 20px; margin-bottom: 6px; }
    .action-card .title { font-weight: 700; font-size: 13.5px; color: var(--nb-text); }
    .action-card .desc { font-size: 11px; color: var(--nb-text-muted); }

    /* جدول التوزيع */
    .dist-chart { display: flex; flex-direction: column; gap: 12px; padding: 12px; max-height: 340px; overflow-y: auto; }
    .chart-item { display: grid; grid-template-columns: 1.3fr 2fr 0.7fr; align-items: center; gap: 12px; font-size: 12px; }
    .chart-item .label { font-weight: 600; color: var(--nb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bar-container { height: 8px; background: var(--nb-bg); border-radius: 99px; overflow: hidden; }
    .bar-container .fill { height: 100%; border-radius: 99px; transition: width .4s ease; }
    .fill.load-ok { background: var(--nb-success); }
    .fill.load-full { background: #d97706; }
    .fill.load-over { background: var(--nb-danger); }
    .chart-item .val { color: var(--nb-text-secondary); text-align: start; font-variant-numeric: tabular-nums; font-weight: 600; }
    .chart-item .val.over { color: var(--nb-danger); }
    .load-legend { display: flex; gap: 16px; padding: 4px 14px 12px; font-size: 11.5px; color: var(--nb-text-muted); flex-wrap: wrap; }
    .load-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-inline-end: 5px; vertical-align: middle; }
    .load-legend .dot.load-ok { background: var(--nb-success); }
    .load-legend .dot.load-full { background: #d97706; }
    .load-legend .dot.load-over { background: var(--nb-danger); }
    .dept-summary { border-top: 1px solid var(--nb-border); margin-top: 4px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
    .dept-row { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--nb-text-muted); }
    .dept-row b { color: var(--nb-text); font-size: 15px; font-variant-numeric: tabular-nums; }

    /* التكليفات التدريسية */
    .assignments-container { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; }
    @media (max-width: 900px) { .assignments-container { grid-template-columns: 1fr; } }

    /* الجداول */
    .tbl { display: flex; flex-direction: column; width: 100%; }
    .tbl-head { display: grid; padding: 12px 18px; background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border);
      font-size: 13px; font-weight: 700; color: var(--nb-text-secondary); }
    .tbl-row { display: grid; padding: 12px 18px; border-bottom: 1px solid var(--nb-border-soft); align-items: center; font-size: 13px; color: var(--nb-text); }
    .tbl-row:hover { background: var(--nb-surface-raised); }
    .tbl-empty { text-align: center; padding: 32px; font-size: 13px; color: var(--nb-text-muted); }
    .bold-text { font-weight: 700; color: var(--nb-text); }
    .hours { font-weight: 600; color: var(--nb-primary-600); }
    .btn-delete { border: none; background: var(--nb-danger-50, #ffebeb); color: var(--nb-danger, #ff3b30); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-delete:hover { background: #ffd2d2; }

    /* استمارة الإضافة */
    .assignment-form { padding: 16px; }
    .form-grid { display: flex; flex-direction: column; gap: 14px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .fld select, .fld input { height: 36px; padding: 0 10px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); font-size: 13px; font-family: var(--nb-font-family); background: var(--nb-surface); color: var(--nb-text); outline: none; }
    .fld select:focus, .fld input:focus { border-color: var(--nb-primary-600); }

    .no-data { text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
    .animate-fade { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* النوافذ والمنبثقة للرواتب */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fade .18s; }
    .modal { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 24px; width: 440px; max-width: 90vw; }
    .modal h3 { margin: 0 0 6px; font-size: 16px; color: var(--nb-text); }
    .modal-sub { margin: 0 0 16px; font-size: 12px; color: var(--nb-text-muted); }
    .profile-summary { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 14px; margin-bottom: 16px; }
    .profile-summary .avatar { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--nb-primary-100); color: var(--nb-primary-700); font-weight: bold; }
    .profile-summary h4 { margin: 0; font-size: 14.5px; color: var(--nb-text); }
    .profile-summary .pos { font-size: 12px; color: var(--nb-text-secondary); }

    .detail-section { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .detail-section h5 { margin: 0 0 4px; font-size: 13px; color: var(--nb-text); border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 4px; }
    .detail-row { display: flex; justify-content: space-between; font-size: 12.5px; }
    .detail-row span { color: var(--nb-text-secondary); }
    .detail-row strong { color: var(--nb-text); }
    .detail-row strong.salary { color: var(--nb-primary-700); font-weight: 700; }
    .detail-row.total { border-top: 1px dashed var(--nb-border); padding-top: 8px; font-weight: 700; font-size: 13.5px; }
    .account-hint { font-size: 11.5px; color: var(--nb-text-muted); line-height: 1.6; margin: 0; }
  `]
})
export class FacultyDashboardComponent implements OnInit {
  tenantService = inject(TenantService);
  http = inject(HttpClient);
  private dialog = inject(MatDialog);
  academicsSvc = inject(AcademicsService);
  notify = inject(NotificationService);

  readonly activeTab = signal<'dashboard' | 'staff' | 'assignments'>('dashboard');

  readonly teachers = signal<DetailedFaculty[]>([]);
  readonly assignments = signal<DBTeacherAssignment[]>([]);
  readonly loadingAssignments = signal(false);
  readonly loadingStaff = signal(false);

  // دليل الكادر: الجدول هو العرض الافتراضي + بحث
  readonly staffView = signal<'table' | 'grid'>('table');
  readonly staffSearch = signal('');
  readonly filteredTeachers = computed(() => {
    const q = this.staffSearch().trim().toLowerCase();
    const list = this.teachers();
    if (!q) return list;
    return list.filter(t =>
      (t.full_name_ar || '').toLowerCase().includes(q) ||
      (t.teacher_code || '').toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q) ||
      (t.current_position || '').toLowerCase().includes(q));
  });

  // ==== إحصاءات اللوحة الرئيسية من بيانات حقيقية ====

  /** توزيع النصاب التدريسي الفعلي: مجموع ساعات تكليفات كل معلم مقابل نصابه. */
  readonly workload = computed(() => {
    const asns = this.assignments();
    return this.teachers()
      .map(t => {
        const hours = asns
          .filter(a => a.faculty_member === t.id)
          .reduce((s, a) => s + (a.weekly_hours || 0), 0);
        const quota = t.weekly_lesson_quota || 23;
        return {
          id: t.id,
          name: t.full_name_ar,
          hours,
          quota,
          pct: quota ? Math.min(100, Math.round((hours / quota) * 100)) : 0,
          state: hours > quota ? 'over' : (hours >= quota * 0.85 ? 'full' : 'ok'),
        };
      })
      .filter(w => w.hours > 0)
      .sort((a, b) => b.hours - a.hours);
  });

  /** إجمالي ساعات النصاب المُسندة أسبوعياً عبر كل الكادر. */
  readonly totalWeeklyHours = computed(() =>
    this.assignments().reduce((s, a) => s + (a.weekly_hours || 0), 0));

  /** عدد الأقسام الأكاديمية الفريدة. */
  readonly departmentCount = computed(() =>
    new Set(this.teachers().map(t => t.department).filter(Boolean)).size);

  /** معلمون تجاوزوا نصابهم — يحتاجون إعادة توزيع. */
  readonly overloadedCount = computed(() =>
    this.workload().filter(w => w.state === 'over').length);

  /** متوسط الحصص الأسبوعية لكل معلم مُسند إليه تكليف. */
  readonly avgHoursPerTeacher = computed(() => {
    const loaded = this.workload();
    if (!loaded.length) return 0;
    return Math.round(loaded.reduce((s, w) => s + w.hours, 0) / loaded.length);
  });

  // مصادر البيانات للأكاديميات
  readonly years = signal<any[]>([]);
  readonly terms = signal<any[]>([]);
  readonly grades = signal<any[]>([]);
  readonly allSections = signal<any[]>([]);
  readonly allSubjects = signal<any[]>([]);

  // الفلاتر للتكليف الجديد — كلاهما بالمفتاح الأجنبي للصف (لا ترميز هشّ)
  selectedGradeId = '';
  readonly filteredSections = computed(() =>
    this.allSections().filter(sec => sec.grade === this.selectedGradeId));
  readonly filteredSubjects = computed(() => {
    if (!this.selectedGradeId) return [];
    // المادة مرتبطة بالصف عبر FK. بعض المواد عامة (بلا صف) فتظهر لكل الصفوف.
    return this.allSubjects().filter(sub => !sub.grade || sub.grade === this.selectedGradeId);
  });

  // استمارة تكليف جديد
  newAsn = {
    faculty_member: '',
    subject_id: '',
    section_id: '',
    weekly_hours: 4
  };
  savingAsn = signal(false);

  // المعلم المختار لعرض تفاصيل التعاقد المربوطة
  readonly selectedFaculty = signal<DetailedFaculty | null>(null);

  ngOnInit() {
    this.loadTeachers();
    this.loadAssignments();
    this.loadAcademicsMeta();
  }

  loadTeachers() {
    this.loadingStaff.set(true);
    this.http.get<any>('/api/v1/faculty/members/').subscribe({
      next: (res) => {
        // بيانات مالية حقيقية من ملف الموظف — لا محاكاة
        const list = pickList<any>(res).map(t => ({
          ...t,
          salary: t.basic_salary ?? 0,
          allowance: t.total_allowances ?? 0,
          contractType: this.employmentTypeLabel(t.employment_type),
        }));
        this.teachers.set(list);
        this.loadingStaff.set(false);
      },
      error: () => this.loadingStaff.set(false),
    });
  }

  /** ترجمة نوع التوظيف للعربية للعرض. */
  employmentTypeLabel(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'full-time': return 'دوام كامل';
      case 'part-time': return 'دوام جزئي';
      case 'contract': return 'عقد مؤقت';
      default: return type || '—';
    }
  }

  /** نص وحالة عرض حالة الدور الأكاديمي. */
  statusLabel(status?: string): string {
    const map: Record<string, string> = {
      draft: 'مسودة', pending_review: 'قيد المراجعة', approved: 'معتمد',
      active: 'نشط', suspended: 'موقوف', resigned: 'مستقيل',
    };
    return map[status || ''] || status || '—';
  }
  statusKind(status?: string): 'good' | 'warn' | 'muted' {
    if (status === 'active' || status === 'approved') return 'good';
    if (status === 'suspended' || status === 'resigned') return 'muted';
    return 'warn';
  }

  loadAssignments() {
    this.loadingAssignments.set(true);
    this.http.get<any>('/api/v1/faculty/assignments/').subscribe({
      next: (res) => {
        if (res && res.success) {
          const list = pickList<any>(res);
          this.assignments.set(list.map(asn => ({
            id: asn.id,
            faculty_member: asn.faculty_member,
            faculty_member_name: this.teachers().find(t => t.id === asn.faculty_member)?.full_name_ar || 'معلم تجريبي',
            subject_id: asn.subject_id,
            subject_name: this.allSubjects().find(s => s.id === asn.subject_id)?.arabic_name || 'مادة تخصص',
            section_id: asn.section_id,
            section_name: this.allSections().find(sec => sec.id === asn.section_id)?.name || 'فصل دراسي',
            weekly_hours: asn.weekly_hours
          })));
        }
        this.loadingAssignments.set(false);
      },
      error: () => this.loadingAssignments.set(false)
    });
  }

  loadAcademicsMeta() {
    forkJoin({
      years: this.academicsSvc.getAcademicYears(),
      terms: this.academicsSvc.getTerms(),
      grades: this.academicsSvc.getGrades(),
      sections: this.academicsSvc.getSections(),
      subjects: this.academicsSvc.getSubjects()
    }).subscribe({
      next: (res) => {
        this.years.set(pickList(res.years));
        this.terms.set(pickList(res.terms));
        this.grades.set(pickList(res.grades));
        this.allSections.set(pickList(res.sections));
        this.allSubjects.set(pickList(res.subjects));
        // تحديث أسماء التكليفات بعد تحميل البيانات المشتركة
        this.loadAssignments();
      }
    });
  }

  onGradeChange() {
    this.newAsn.section_id = '';
    this.newAsn.subject_id = '';
  }

  saveAssignment() {
    if (!this.newAsn.faculty_member || !this.newAsn.subject_id || !this.newAsn.section_id) {
      this.notify.error('يرجى اختيار المعلم والمادة والفصل الدراسي.');
      return;
    }
    this.savingAsn.set(true);

    const year = this.years().find(y => y.current_flag) ?? this.years()[0];
    const term = this.terms()[0];

    const body = {
      faculty_member: this.newAsn.faculty_member,
      academic_year_id: year?.id || '00000000-0000-0000-0000-000000000000',
      term_id: term?.id || '00000000-0000-0000-0000-000000000000',
      subject_id: this.newAsn.subject_id,
      section_id: this.newAsn.section_id,
      weekly_hours: this.newAsn.weekly_hours
    };

    this.http.post<any>('/api/v1/faculty/assignments/', body).subscribe({
      next: () => {
        this.savingAsn.set(false);
        this.notify.success('تم تسجيل وإسناد التكليف التدريسي للمعلم بنجاح.');
        this.newAsn = { faculty_member: '', subject_id: '', section_id: '', weekly_hours: 4 };
        this.selectedGradeId = '';
        this.loadAssignments();
      },
      error: (e) => {
        this.savingAsn.set(false);
        this.notify.error(e?.error?.message || 'تعذر حفظ التكليف التدريسي.');
      }
    });
  }

  deleteAssignment(id: string) {
    this.http.delete<any>(`/api/v1/faculty/assignments/${id}/`).subscribe({
      next: () => {
        this.notify.success('تم إلغاء التكليف التدريسي بنجاح.');
        this.loadAssignments();
      }
    });
  }

  viewHRDetails(t: DetailedFaculty) {
    this.selectedFaculty.set(t);
  }

  readonly activatingId = signal<string | null>(null);

  activateAccount(t: DetailedFaculty) {
    if (this.activatingId()) return;
    this.activatingId.set(t.id);
    this.dialog.open(AccountActionDialogComponent, {
      disableClose: true,
      data: {
        title: 'تفعيل حساب المعلم',
        targetName: t.full_name_ar,
        processingHint: 'جارٍ إنشاء صلاحية الدخول وبوابة الخدمة الذاتية وإرسال بيانات الدخول…',
        action$: this.http.post<any>(`/api/v1/faculty/members/${t.id}/activate-account/`, {}),
      },
    }).afterClosed().subscribe(() => this.activatingId.set(null));
  }

  resetPassword(t: DetailedFaculty) {
    if (this.activatingId()) return;
    this.activatingId.set(t.id);
    this.dialog.open(AccountActionDialogComponent, {
      disableClose: true,
      data: {
        title: 'إعادة تعيين كلمة المرور',
        targetName: t.full_name_ar,
        processingHint: 'جارٍ توليد كلمة مرور جديدة وإرسالها عبر البريد الإلكتروني وواتساب…',
        action$: this.http.post<any>(`/api/v1/faculty/members/${t.id}/reset-password/`, {}),
      },
    }).afterClosed().subscribe(() => this.activatingId.set(null));
  }

  getPendingCount(): number {
    return this.teachers().filter(t => t.status === 'pending_review' || t.status === 'draft').length;
  }

  initials(name: string): string {
    const parts = name.replace('أ.', '').replace('م.', '').trim().split(' ');
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  }
}