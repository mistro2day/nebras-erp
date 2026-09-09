import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  totalAmount: number;
  count: number;
  overdueCount: number;
  dueTodayCount: number;
  paidCount: number;
}

@Component({
  selector: 'app-installments-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="calendar-page" dir="rtl">
      <!-- ترويسة الصفحة وإجراءات التنقل -->
      <nb-page-header
        title="تقويم الدفعات والأقساط الذكي"
        subtitle="متابعة مواعيد استحقاق أقساط الطلاب، مؤشرات السداد اليومية والأسبوعية، وتسهيل التحصيل الفوري.">
        <div class="header-actions no-print">
          <button class="btn secondary" (click)="goBack()">← العودة للوحة المالية</button>
          <button class="btn secondary print-btn" (click)="printTable()" title="طباعة كشف استحقاق الأقساط">
            <span class="btn-icon">🖨️</span>
            <span>طباعة الجدول</span>
          </button>
          <button class="btn success export-dues-btn" (click)="exportMonthlyDuesExcel()" [disabled]="exportingExcel()" title="تصدير كشف إكسل للطلاب المستحقين لهذا الشهر">
            @if (exportingExcel()) {
              <span class="spinner-sm"></span>
              <span>جارِ التصدير...</span>
            } @else {
              <span class="btn-icon">📥</span>
              <span>تصدير مستحقي الشهر (Excel)</span>
            }
          </button>
          <button class="btn primary" (click)="loadData()">🔄 تحديث البيانات</button>
        </div>
      </nb-page-header>

      <!-- مؤشرات الأداء السريعة (KPIs) -->
      <section class="kpi-grid">
        <div class="kpi-card today" (click)="quickFilter('today')">
          <div class="kpi-header">
            <span class="kpi-title">يستحق اليوم</span>
            <span class="kpi-badge today-badge">اليوم</span>
          </div>
          <div class="kpi-figures">
            <span class="kpi-val">{{ fmt(summary().due_today_amount) }} <em>ج.س</em></span>
            <span class="kpi-sub">{{ summary().due_today_count || 0 }} قسط مطلوب اليوم</span>
          </div>
        </div>

        <div class="kpi-card week" (click)="quickFilter('this_week')">
          <div class="kpi-header">
            <span class="kpi-title">مستحق خلال 7 أيام</span>
            <span class="kpi-icon">⏳</span>
          </div>
          <div class="kpi-figures">
            <span class="kpi-val">{{ fmt(summary().due_week_amount) }} <em>ج.س</em></span>
            <span class="kpi-sub">{{ summary().due_week_count || 0 }} قسط يستحق قريباً</span>
          </div>
        </div>

        <div class="kpi-card overdue" (click)="quickFilter('overdue')">
          <div class="kpi-header">
            <span class="kpi-title">متأخرات السداد</span>
            <span class="kpi-badge overdue-badge">بحاجة لمتابعة</span>
          </div>
          <div class="kpi-figures">
            <span class="kpi-val danger">{{ fmt(summary().overdue_amount) }} <em>ج.س</em></span>
            <span class="kpi-sub danger-text">{{ summary().overdue_count || 0 }} قسط تجاوز الموعد</span>
          </div>
        </div>

        <div class="kpi-card paid" (click)="quickFilter('paid')">
          <div class="kpi-header">
            <span class="kpi-title">المُحصّل هذا الشهر</span>
            <span class="kpi-icon success-icon">✓</span>
          </div>
          <div class="kpi-figures">
            <span class="kpi-val success">{{ fmt(summary().paid_month_amount) }} <em>ج.س</em></span>
            <span class="kpi-sub">{{ summary().paid_month_count || 0 }} قسط مسدد</span>
          </div>
        </div>
      </section>

      <!-- شريط التحكم: اختيار الشهر + تبديل العرض + البحث والتصفية -->
      <div class="controls-card">
        <div class="month-navigator">
          <button class="nav-arrow-btn" (click)="prevMonth()" title="الشهر السابق">
            <span class="arrow-sym">›</span>
          </button>
          
          <div class="month-select-container">
            <select
              class="month-dropdown"
              [ngModel]="currentMonth()"
              (ngModelChange)="onMonthChange($event)">
              @for (mName of monthNames; track $index) {
                <option [value]="$index + 1">{{ mName }}</option>
              }
            </select>
            <select
              class="year-dropdown"
              [ngModel]="currentYear()"
              (ngModelChange)="onYearChange($event)">
              <option [value]="2025">2025</option>
              <option [value]="2026">2026</option>
              <option [value]="2027">2027</option>
              <option [value]="2028">2028</option>
            </select>
          </div>

          <button class="nav-arrow-btn" (click)="nextMonth()" title="الشهر التالي">
            <span class="arrow-sym">‹</span>
          </button>
          <button class="btn-today" (click)="goToCurrentMonth()">الشهر الحالي</button>
        </div>

        <div class="search-and-view">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-field"
              placeholder="بحث باسم الطالب، الرقم المدرسي، رقم الفاتورة، أو هاتف ولي الأمر…"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
            />
            @if (searchQuery()) {
              <button class="clear-search" (click)="onSearchChange('')">✕</button>
            }
          </div>

          <div class="view-mode-toggle">
            <button
              class="toggle-btn"
              [class.active]="viewMode() === 'both'"
              (click)="setViewMode('both')"
              title="عرض التقويم الشهري وسجل الأقساط معاً">
              📅 عرض متكامل
            </button>
            <button
              class="toggle-btn"
              [class.active]="viewMode() === 'calendar_only'"
              (click)="setViewMode('calendar_only')"
              title="عرض شبكة التقويم فقط">
              🗓️ التقويم فقط
            </button>
            <button
              class="toggle-btn"
              [class.active]="viewMode() === 'agenda_only'"
              (click)="setViewMode('agenda_only')"
              title="عرض سجل استحقاق الأقساط فقط">
              📋 السجل فقط
            </button>
          </div>
        </div>

        <!-- فلاتر التبويب السريع -->
        <div class="filter-pills">
          <button class="pill" [class.on]="activeFilter() === 'all'" (click)="setFilter('all')">
            الكل ({{ installments().length }})
          </button>
          <button class="pill" [class.on]="activeFilter() === 'today'" (click)="setFilter('today')">
            يستحق اليوم @if(summary().due_today_count){ <span class="pill-badge">{{ summary().due_today_count }}</span> }
          </button>
          <button class="pill" [class.on]="activeFilter() === 'this_week'" (click)="setFilter('this_week')">
            خلال 7 أيام @if(summary().due_week_count){ <span class="pill-badge">{{ summary().due_week_count }}</span> }
          </button>
          <button class="pill overdue-pill" [class.on]="activeFilter() === 'overdue'" (click)="setFilter('overdue')">
            متأخرات @if(summary().overdue_count){ <span class="pill-badge danger-badge">{{ summary().overdue_count }}</span> }
          </button>
          <button class="pill paid-pill" [class.on]="activeFilter() === 'paid'" (click)="setFilter('paid')">
            مسدد بالكامل @if(summary().paid_month_count){ <span class="pill-badge success-badge">{{ summary().paid_month_count }}</span> }
          </button>
          @if (selectedDay()) {
            <span class="selected-day-tag">
              فلترة باليوم: {{ selectedDay()?.dateStr }}
              <button class="remove-day-btn" (click)="clearSelectedDay()">✕</button>
            </span>
          }
        </div>
      </div>

      <!-- عرض التقويم الشبكي (Calendar View) -->
      @if (viewMode() === 'both' || viewMode() === 'calendar_only') {
        <div class="calendar-container">
          <div class="weekdays-bar">
            @for (dayName of weekDayNames; track dayName) {
              <div class="weekday-cell">{{ dayName }}</div>
            }
          </div>

          <div class="calendar-grid">
            @for (day of calendarDays(); track day.dateStr) {
              <div
                class="calendar-day-cell"
                [class.other-month]="!day.isCurrentMonth"
                [class.is-today]="day.isToday"
                [class.is-selected]="day.isSelected"
                [class.has-installments]="day.count > 0"
                (click)="selectDay(day)">
                <div class="day-top">
                  <span class="day-num">{{ day.dayNumber }}</span>
                  @if (day.isToday) {
                    <span class="today-marker">اليوم</span>
                  }
                  @if (day.count > 0) {
                    <span class="day-count-badge" [class.has-overdue]="day.overdueCount > 0">
                      {{ day.count }}
                    </span>
                  }
                </div>

                @if (day.count > 0) {
                  <div class="day-amount">
                    <span class="amt-val">{{ fmt(day.totalAmount) }}</span>
                    <span class="amt-curr">ج.س</span>
                  </div>
                  <div class="day-status-dots">
                    @if (day.overdueCount > 0) {
                      <span class="dot overdue-dot" title="أقساط متأخرة"></span>
                    }
                    @if (day.dueTodayCount > 0) {
                      <span class="dot today-dot" title="مستحق اليوم"></span>
                    }
                    @if (day.paidCount > 0) {
                      <span class="dot paid-dot" title="أقساط مسددة"></span>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- جدول تفاصيل الأقساط (Agenda / List View) -->
      @if (viewMode() === 'both' || viewMode() === 'agenda_only') {
        <div class="installments-section">
          <div class="section-header">
            <h3 class="section-title">
              {{ selectedDay() ? 'أقساط يوم ' + selectedDay()?.dateStr : 'سجل استحقاق الأقساط المجدولة' }}
              <span class="items-count">({{ filteredInstallments().length }} قسط)</span>
            </h3>
            <div class="section-header-actions no-print">
              @if (selectedDay()) {
                <button class="btn ghost btn-sm" (click)="clearSelectedDay()">عرض كل أقساط الشهر</button>
              }
              <button class="btn secondary btn-sm" (click)="printTable()" title="طباعة كشف الأقساط المجدولة">
                <span class="btn-icon">🖨️</span>
                <span>طباعة الجدول</span>
              </button>
            </div>
          </div>

          <!-- ترويسة التقرير الرسمية للطباعة فقط -->
          <div class="print-document-header print-only">
            <div class="print-header-content">
              <div class="print-org-info">
                <h2>مدارس النبراس النموذجية الأهلية</h2>
                <p>نظام نبراس ERP المتكامل · الإدارة المالية والحسابات المدرسية</p>
                <div class="print-doc-title">
                  {{ selectedDay() ? 'كشف استحقاق أقساط يوم: ' + selectedDay()?.dateStr : 'كشف استحقاق الأقساط المجدولة لشهر ' + monthNames[currentMonth() - 1] + ' ' + currentYear() }}
                </div>
              </div>
              <div class="print-meta-box">
                <div class="print-meta-item"><span>تاريخ وتوقيت الطباعة:</span> <strong>{{ printDateStr }}</strong></div>
                <div class="print-meta-item"><span>الفلتر المعروض:</span> <strong>{{ getFilterLabel() }}</strong></div>
                <div class="print-meta-item"><span>عدد الأقساط:</span> <strong>{{ filteredInstallments().length }} قسط</strong></div>
              </div>
            </div>

            <!-- ملخص مالي علوي في الطباعة -->
            <div class="print-summary-strip">
              <div class="pss-box">
                <span class="pss-label">إجمالي المطلوب:</span>
                <strong class="pss-val">{{ fmt(totalRequiredAmount()) }} ج.س</strong>
              </div>
              <div class="pss-box">
                <span class="pss-label">إجمالي المسدد:</span>
                <strong class="pss-val success">{{ fmt(totalPaidAmount()) }} ج.س</strong>
              </div>
              <div class="pss-box">
                <span class="pss-label">إجمالي المتبقي للتحصيل:</span>
                <strong class="pss-val danger">{{ fmt(totalRemainingAmount()) }} ج.س</strong>
              </div>
            </div>
          </div>

        @if (loading()) {
          <div class="loading-box">
            <div class="spinner"></div>
            <span>جارٍ تحميل بيانات تقويم الأقساط…</span>
          </div>
        } @else if (filteredInstallments().length === 0) {
          <div class="empty-box">
            <span class="empty-icon">📅</span>
            <h4 class="empty-title">لا توجد أقساط مطابقة للمعايير المحددة</h4>
            <p class="empty-sub">جرّب تغيير خيارات التصفية أو اختيار شهر آخر لاستعراض الأقساط المجدولة.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="nebras-table">
              <thead>
                <tr>
                  <th>الطالب والصف</th>
                  <th>ولي الأمر والهاتف</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>المبلغ المطلوب</th>
                  <th>المسدد والمتبقي</th>
                  <th>الحالة</th>
                  <th class="actions-col no-print">الإجراءات السريعة</th>
                </tr>
              </thead>
              <tbody>
                @for (ins of filteredInstallments(); track ins.id) {
                  <tr [class.row-overdue]="ins.computed_status === 'overdue'" [class.row-today]="ins.computed_status === 'due_today'">
                    <td>
                      <div class="student-cell clickable-student" (click)="openStudentStatement(ins)" title="عرض كشف حساب الطالب المالي الشامل">
                        <strong class="stu-name stu-link">{{ ins.student_name || 'طالب مقيد' }} <span class="stmt-icon">📄</span></strong>
                        <div class="stu-sub">
                          <span class="stu-no">{{ ins.student_number }}</span>
                          @if (ins.grade_name) {
                            <span class="stu-dot">•</span>
                            <span class="stu-grade">{{ ins.grade_name }} {{ ins.section_name ? ('- ' + ins.section_name) : '' }}</span>
                          }
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="guardian-cell">
                        <span class="g-name">{{ ins.guardian_name || 'ولي أمر الطالب' }}</span>
                        @if (ins.guardian_phone) {
                          <span class="g-phone" dir="ltr">{{ ins.guardian_phone }}</span>
                        } @else {
                          <span class="g-phone-na">الهاتف غير مسجل</span>
                        }
                      </div>
                    </td>

                    <td>
                      <div class="due-cell">
                        <strong class="due-date">{{ ins.due_date }}</strong>
                        <span class="due-plan">{{ ins.plan_name || 'قسط دراسي' }}</span>
                      </div>
                    </td>

                    <td>
                      <div class="amount-cell">
                        <strong class="main-amount">{{ fmt(ins.amount) }}</strong>
                        <span class="curr-label">ج.س</span>
                      </div>
                    </td>

                    <td>
                      <div class="paid-rem-cell">
                        <div class="paid-bar-wrap">
                          <div class="paid-progress" [style.width.%]="calcPaidPct(ins)"></div>
                        </div>
                        <div class="paid-rem-text">
                          <span class="rem-val danger" *ngIf="ins.remaining_amount > 0">متبقي: {{ fmt(ins.remaining_amount) }} ج.س</span>
                          <span class="paid-val success" *ngIf="ins.paid_amount > 0">مسدد: {{ fmt(ins.paid_amount) }} ج.س</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span class="status-badge" [attr.data-status]="ins.computed_status">
                        {{ ins.computed_status_label || ins.status }}
                      </span>
                    </td>

                    <td class="actions-col no-print">
                      <div class="actions-cell">
                        <button
                          class="action-btn stmt-btn"
                          title="عرض كشف الحساب المالي الشامل للطالب (طباعة وتصدير)"
                          (click)="openStudentStatement(ins)">
                          📄 كشف الحساب
                        </button>

                        @if (ins.status !== 'paid') {
                          <button
                            class="action-btn pay-btn"
                            title="سداد فوري للقسط"
                            (click)="openQuickPay(ins)">
                            💳 سداد فوري
                          </button>
                        }

                        <button
                          class="action-btn wa-btn"
                          title="إرسال تذكير واتساب لولي الأمر"
                          (click)="openReminderModal(ins)">
                          💬 تذكير واتساب
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- توقيعات الاعتماد الرسمية في الطباعة -->
          <div class="print-signatures print-only">
            <div class="sig-block">
              <span class="sig-title">المحاسب المالي المختص:</span>
              <span class="sig-dots">...........................................</span>
            </div>
            <div class="sig-block">
              <span class="sig-title">مدير الإدارة المالية والرقابة:</span>
              <span class="sig-dots">...........................................</span>
            </div>
            <div class="sig-block">
              <span class="sig-title">الختم المالي المعتمد:</span>
              <div class="sig-seal-box">ختم المدرسة الرسمي</div>
            </div>
          </div>
        }
      </div>
      }

      <!-- نافذة مودال السداد الفوري (Nebras OS Custom Modal) -->
      @if (payModalOpen()) {
        <div class="modal-backdrop" (click)="closeQuickPay()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="mh-title">
                <span class="mh-icon">💳</span>
                <h3>تسجيل سداد فوري لقسط دراسي</h3>
              </div>
              <button class="modal-close" (click)="closeQuickPay()">✕</button>
            </div>

            <div class="modal-body">
              <div class="pay-target-info">
                <div class="pt-item">
                  <span class="pt-label">الطالب:</span>
                  <strong class="pt-value">{{ activeInstallment()?.student_name }}</strong>
                </div>
                <div class="pt-item">
                  <span class="pt-label">تاريخ الاستحقاق:</span>
                  <span class="pt-value">{{ activeInstallment()?.due_date }}</span>
                </div>
                <div class="pt-item">
                  <span class="pt-label">المتبقي المطلوب:</span>
                  <strong class="pt-value danger">{{ fmt(activeInstallment()?.remaining_amount) }} ج.س</strong>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">مبلغ السداد (ج.س) *</label>
                <input
                  type="number"
                  class="form-control"
                  [(ngModel)]="payFormAmount"
                  [max]="activeInstallment()?.remaining_amount || 9999999"
                  min="1"
                />
              </div>

              <div class="form-group">
                <label class="form-label">طريقة الدفع المعتمَدة *</label>
                <select class="form-control" [(ngModel)]="payFormMethod">
                  <option value="تطبيق بنكك (بنك الخرطوم)">تطبيق بنكك (بنك الخرطوم)</option>
                  <option value="تطبيق فوري (بنك فيصل الإسلامي)">تطبيق فوري (بنك فيصل الإسلامي)</option>
                  <option value="أوكاش (بنك أمدرمان الوطني)">أوكاش (بنك أمدرمان الوطني)</option>
                  <option value="نقداً بالخزينة المدرسية">نقداً بالخزينة المدرسية</option>
                  <option value="شيك مصرفي">شيك مصرفي</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">الرقم المرجعي للإشعار / المعاملة</label>
                <input
                  type="text"
                  class="form-control"
                  placeholder="مثال: رقم العملية في تطبيق بنكك (10 أرقام)"
                  [(ngModel)]="payFormRef"
                />
              </div>

              <div class="form-group">
                <label class="form-label">ملاحظات التحصيل</label>
                <textarea
                  class="form-control"
                  rows="2"
                  placeholder="ملاحظات محاسبية إضافية…"
                  [(ngModel)]="payFormNotes">
                </textarea>
              </div>

              @if (modalError()) {
                <div class="modal-error-box">
                  ⚠️ {{ modalError() }}
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn ghost" [disabled]="submittingPay()" (click)="closeQuickPay()">إلغاء</button>
              <button class="btn primary" [disabled]="submittingPay() || !payFormAmount" (click)="submitQuickPay()">
                {{ submittingPay() ? 'جارٍ تسجيل السداد…' : '✓ تأكيد السداد وإصدار سند القبض' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- نافذة مودال تذكير الواتساب (Nebras OS Custom Modal) -->
      @if (reminderModalOpen()) {
        <div class="modal-backdrop" (click)="closeReminderModal()">
          <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="mh-title">
                <span class="mh-icon wa-green">💬</span>
                <h3>إرسال تذكير سداد عبر واتساب (السياق السوداني)</h3>
              </div>
              <button class="modal-close" (click)="closeReminderModal()">✕</button>
            </div>

            <div class="modal-body">
              @if (loadingReminder()) {
                <div class="loading-box">
                  <div class="spinner"></div>
                  <span>جارٍ تجهيز إشعار التذكير…</span>
                </div>
              } @else {
                <div class="reminder-recipient">
                  <div class="rec-row">
                    <span class="rec-label">ولي أمر الطالب:</span>
                    <strong>{{ reminderData()?.student_name }}</strong>
                  </div>
                  <div class="rec-row">
                    <span class="rec-label">رقم هاتف ولي الأمر:</span>
                    <strong dir="ltr">{{ reminderData()?.guardian_phone || 'غير مسجل' }}</strong>
                  </div>
                  <div class="rec-row">
                    <span class="rec-label">المبلغ المستحق:</span>
                    <strong class="danger">{{ reminderData()?.formatted_amount }}</strong>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">نص الرسالة المعتمد:</label>
                  <textarea
                    class="form-control wa-textarea"
                    rows="8"
                    readonly
                    [value]="reminderData()?.reminder_text">
                  </textarea>
                </div>

                @if (copySuccess()) {
                  <div class="copy-success-banner">
                    ✓ تم نسخ نص الرسالة إلى الحافظة بنجاح!
                  </div>
                }
              }
            </div>

            <div class="modal-footer">
              <button class="btn ghost" (click)="closeReminderModal()">إغلاق</button>
              <button class="btn secondary" (click)="copyReminderText()">
                📋 نسخ النص
              </button>
              @if (reminderData()?.whatsapp_url) {
                <button class="btn wa-direct-btn" (click)="openWhatsAppDirect()">
                  💬 فتح تطبيق واتساب مباشرة
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- إشعار نجاح السداد (Success Toast / Popup) -->
      @if (receiptSuccess()) {
        <div class="modal-backdrop" (click)="receiptSuccess.set(null)">
          <div class="modal-card receipt-modal" (click)="$event.stopPropagation()">
            <div class="receipt-icon">🎉</div>
            <h3 class="receipt-title">تم استلام الدفعة بنجاح!</h3>
            <p class="receipt-sub">تم ترحيل السداد إلى الحساب المالي وإصدار سند القبض فوراً.</p>
            <div class="receipt-badge-box">
              <span class="rb-label">رقم سند القبض:</span>
              <strong class="rb-num">{{ receiptSuccess()?.receipt_number }}</strong>
            </div>
            <div class="receipt-actions">
              <button class="btn primary" (click)="receiptSuccess.set(null)">تم، العودة للتقويم</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .calendar-page {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      background: var(--nb-bg);
      font-family: var(--nb-font-family, 'IBM Plex Sans Arabic', sans-serif);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    /* أزرار نبراس */
    .btn {
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 700;
      padding: 9px 16px;
      border-radius: var(--nb-radius-button, 8px);
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn.primary { background: var(--nb-primary-600, #2563eb); color: #fff; }
    .btn.primary:hover { background: var(--nb-primary-700, #1d4ed8); }
    .btn.secondary { background: var(--nb-surface, #fff); border-color: var(--nb-border, #e5e7eb); color: var(--nb-text, #1f2937); }
    .btn.secondary:hover { background: var(--nb-surface-raised, #f3f4f6); }
    .btn.success {
      background: #059669;
      color: #ffffff;
      border-color: #047857;
      box-shadow: 0 1px 2px rgba(5, 150, 105, 0.2);
    }
    .btn.success:hover:not(:disabled) {
      background: #047857;
      transform: translateY(-1px);
    }
    .btn.success:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .btn.ghost { background: transparent; color: var(--nb-text-secondary, #4b5563); }
    .btn.ghost:hover { background: var(--nb-surface-raised, #f3f4f6); }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* شبكة مؤشرات الأداء */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }
    @media (max-width: 1024px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .kpi-grid { grid-template-columns: 1fr; }
    }

    .kpi-card {
      background: var(--nb-surface, #fff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 16px 18px;
      cursor: pointer;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.06);
      border-color: var(--nb-primary-400, #60a5fa);
    }
    .kpi-card.today { border-inline-start: 4px solid #2563eb; }
    .kpi-card.week { border-inline-start: 4px solid #f59e0b; }
    .kpi-card.overdue { border-inline-start: 4px solid #ef4444; }
    .kpi-card.paid { border-inline-start: 4px solid #10b981; }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .kpi-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--nb-text-secondary, #4b5563);
    }
    .kpi-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 999px;
    }
    .today-badge { background: #dbeafe; color: #1e40af; }
    .overdue-badge { background: #fee2e2; color: #991b1b; }
    .kpi-figures { display: flex; flex-direction: column; gap: 2px; }
    .kpi-val {
      font-size: 22px;
      font-weight: 800;
      color: var(--nb-text, #111827);
      font-variant-numeric: tabular-nums;
    }
    .kpi-val em { font-size: 12px; font-weight: 600; font-style: normal; color: var(--nb-text-muted, #6b7280); }
    .kpi-val.danger { color: #dc2626; }
    .kpi-val.success { color: #16a34a; }
    .kpi-sub { font-size: 12px; color: var(--nb-text-muted, #6b7280); }
    .danger-text { color: #dc2626; font-weight: 600; }

    /* بطاقة التحكم والتصفية */
    .controls-card {
      background: var(--nb-surface, #fff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .month-navigator {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nav-arrow-btn {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      border: 1px solid var(--nb-border, #e5e7eb);
      background: var(--nb-surface, #fff);
      color: var(--nb-text, #1f2937);
      font-size: 20px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.12s;
    }
    .nav-arrow-btn:hover { background: var(--nb-surface-raised, #f3f4f6); }
    .month-select-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .month-dropdown, .year-dropdown {
      height: 38px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--nb-border, #d1d5db);
      background: var(--nb-surface, #fff);
      color: var(--nb-text, #111827);
      font-family: inherit;
      font-size: 14.5px;
      font-weight: 800;
      cursor: pointer;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .month-dropdown:focus, .year-dropdown:focus {
      border-color: var(--nb-primary-600, #2563eb);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .month-dropdown { min-width: 120px; }
    .year-dropdown { min-width: 80px; }
    .arrow-sym { font-size: 20px; line-height: 1; display: inline-block; }
    .btn-today {
      background: var(--nb-surface-raised, #f3f4f6);
      border: 1px solid var(--nb-border-soft, #e5e7eb);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 12.5px;
      font-weight: 800;
      color: var(--nb-primary-700, #1d4ed8);
      cursor: pointer;
      transition: background 0.12s;
    }
    .btn-today:hover { background: #e0e7ff; }

    .search-and-view {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .search-input-wrapper {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;
      min-width: 260px;
    }
    .search-icon {
      position: absolute;
      right: 12px;
      font-size: 14px;
      color: var(--nb-text-muted, #9ca3af);
      pointer-events: none;
    }
    .search-field {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 38px 10px 36px;
      border: 1px solid var(--nb-border, #d1d5db);
      border-radius: 8px;
      font-size: 13.5px;
      font-family: inherit;
      background: var(--nb-surface, #fff);
      color: var(--nb-text, #111827);
    }
    .search-field:focus {
      outline: none;
      border-color: var(--nb-primary-600, #2563eb);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .clear-search {
      position: absolute;
      left: 10px;
      background: none;
      border: none;
      color: var(--nb-text-muted, #9ca3af);
      cursor: pointer;
      font-size: 13px;
    }

    .view-mode-toggle {
      display: flex;
      background: var(--nb-surface-raised, #f3f4f6);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--nb-border-soft, #e5e7eb);
    }
    .toggle-btn {
      padding: 8px 14px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--nb-text-secondary, #4b5563);
      cursor: pointer;
      transition: all 0.12s;
    }
    .toggle-btn.active {
      background: var(--nb-surface, #fff);
      color: var(--nb-primary-700, #1d4ed8);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .pill {
      background: var(--nb-surface-raised, #f3f4f6);
      border: 1px solid var(--nb-border-soft, #e5e7eb);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--nb-text-secondary, #4b5563);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.12s;
    }
    .pill.on {
      background: var(--nb-primary-600, #2563eb);
      color: #fff;
      border-color: transparent;
    }
    .pill-badge {
      background: rgba(255,255,255,0.3);
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 11px;
    }
    .danger-badge { background: #fee2e2; color: #991b1b; }
    .success-badge { background: #dcfce7; color: #166534; }
    .selected-day-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .remove-day-btn {
      background: none;
      border: none;
      color: #1e40af;
      cursor: pointer;
      font-size: 12px;
      font-weight: 800;
    }

    /* شبكة التقويم */
    .calendar-container {
      background: var(--nb-surface, #fff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .weekdays-bar {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      min-width: 760px;
      background: var(--nb-surface-raised, #f9fafb);
      border-bottom: 1px solid var(--nb-border, #e5e7eb);
    }
    .weekday-cell {
      padding: 11px 8px;
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      color: var(--nb-text-secondary, #4b5563);
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      min-width: 760px;
      border-collapse: collapse;
    }
    .calendar-day-cell {
      min-height: 86px;
      padding: 8px 10px;
      border-inline-end: 1px solid var(--nb-border-soft, #f3f4f6);
      border-bottom: 1px solid var(--nb-border-soft, #f3f4f6);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.15s ease;
      background: #ffffff;
    }
    .calendar-day-cell:hover { background: #f8fafc; }
    .calendar-day-cell.other-month { opacity: 0.35; background: #fafafa; }
    .calendar-day-cell.is-today { background: #eff6ff; }
    .calendar-day-cell.is-selected { outline: 2px solid var(--nb-primary-600, #2563eb); outline-offset: -2px; background: #eff6ff; }
    .calendar-day-cell.has-installments { font-weight: 600; }

    .day-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-num {
      font-size: 14px;
      font-weight: 800;
      color: var(--nb-text, #1f2937);
    }
    .today-marker {
      font-size: 10px;
      font-weight: 800;
      color: #1d4ed8;
      background: #dbeafe;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .day-count-badge {
      font-size: 11px;
      font-weight: 800;
      background: #e0e7ff;
      color: #3730a3;
      padding: 1px 6px;
      border-radius: 999px;
    }
    .day-count-badge.has-overdue {
      background: #fee2e2;
      color: #991b1b;
    }
    .day-amount {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin-top: 4px;
    }
    .amt-val {
      font-size: 12.5px;
      font-weight: 800;
      color: var(--nb-text, #111827);
    }
    .amt-curr { font-size: 10px; color: var(--nb-text-muted, #6b7280); }
    .day-status-dots {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .overdue-dot { background: #ef4444; }
    .today-dot { background: #2563eb; }
    .paid-dot { background: #10b981; }

    /* جدول قائمة الأقساط */
    .installments-section {
      background: var(--nb-surface, #fff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 18px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--nb-text, #111827);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .items-count { font-size: 13px; font-weight: 600; color: var(--nb-text-muted, #6b7280); }

    .table-responsive {
      overflow-x: auto;
    }
    .nebras-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .nebras-table th {
      background: var(--nb-surface-raised, #f9fafb);
      color: var(--nb-text-secondary, #4b5563);
      font-weight: 800;
      padding: 12px 14px;
      text-align: right;
      border-bottom: 1px solid var(--nb-border, #e5e7eb);
      white-space: nowrap;
    }
    .nebras-table td {
      padding: 14px;
      border-bottom: 1px solid var(--nb-border-soft, #f3f4f6);
      vertical-align: middle;
    }
    .nebras-table tr:hover { background: #fafafa; }
    .row-overdue { background: #fffbfb; }
    .row-today { background: #fbfdff; }

    .student-cell { display: flex; flex-direction: column; gap: 2px; }
    .stu-name { font-size: 14px; color: var(--nb-text, #111827); }
    .stu-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--nb-text-muted, #6b7280); }
    .stu-no { font-family: monospace; font-weight: 700; color: var(--nb-primary-700, #1d4ed8); }

    .guardian-cell { display: flex; flex-direction: column; gap: 2px; }
    .g-name { font-size: 13px; font-weight: 700; color: var(--nb-text, #1f2937); }
    .g-phone { font-size: 12px; color: var(--nb-text-muted, #6b7280); font-family: monospace; }
    .g-phone-na { font-size: 11px; color: #9ca3af; font-style: italic; }

    .due-cell { display: flex; flex-direction: column; gap: 2px; }
    .due-date { font-size: 13.5px; font-weight: 800; color: var(--nb-text, #111827); font-variant-numeric: tabular-nums; }
    .due-plan { font-size: 11.5px; color: var(--nb-text-muted, #6b7280); }

    .amount-cell { display: flex; align-items: baseline; gap: 4px; }
    .main-amount { font-size: 15px; font-weight: 800; color: var(--nb-text, #111827); }
    .curr-label { font-size: 11px; color: var(--nb-text-muted, #6b7280); }

    .paid-rem-cell { display: flex; flex-direction: column; gap: 4px; min-width: 130px; }
    .paid-bar-wrap { width: 100%; height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
    .paid-progress { height: 100%; background: #16a34a; border-radius: 999px; }
    .paid-rem-text { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 800;
      white-space: nowrap;
    }
    .status-badge[data-status="due_today"] { background: #dbeafe; color: #1e40af; }
    .status-badge[data-status="overdue"] { background: #fee2e2; color: #991b1b; }
    .status-badge[data-status="paid"] { background: #dcfce7; color: #166534; }
    .status-badge[data-status="pending"] { background: #f3f4f6; color: #4b5563; }

    .actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }
    .action-btn {
      font-family: inherit;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.12s;
      white-space: nowrap;
    }
    .pay-btn { background: #16a34a; color: #fff; }
    .pay-btn:hover { background: #15803d; }
    .wa-btn { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .wa-btn:hover { background: #dbeafe; }
    .stmt-btn { background: #f8fafc; border-color: #cbd5e1; color: #334155; }
    .stmt-btn:hover { background: #e2e8f0; color: #0f172a; }

    .clickable-student { cursor: pointer; border-radius: 6px; padding: 2px 4px; transition: background 0.12s; }
    .clickable-student:hover { background: #eff6ff; }
    .clickable-student:hover .stu-link { color: #1d4ed8; text-decoration: underline; }
    .stmt-icon { font-size: 11px; margin-inline-start: 4px; }

    /* النوافذ المنبثقة (Nebras OS Custom Modals) */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 20px;
    }
    .modal-card {
      background: var(--nb-surface, #fff);
      border-radius: var(--nb-radius-card, 16px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalSlide 0.2s ease-out;
    }
    .modal-card.modal-lg { max-width: 620px; }

    @keyframes modalSlide {
      from { transform: translateY(12px) scale(0.98); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--nb-border, #e5e7eb);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mh-title { display: flex; align-items: center; gap: 8px; }
    .mh-icon { font-size: 20px; }
    .mh-icon.wa-green { color: #16a34a; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 800; color: var(--nb-text, #111827); }
    .modal-close { background: none; border: none; font-size: 16px; color: var(--nb-text-muted, #9ca3af); cursor: pointer; }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 75vh;
      overflow-y: auto;
    }

    .pay-target-info, .reminder-recipient {
      background: var(--nb-surface-raised, #f9fafb);
      border: 1px solid var(--nb-border-soft, #e5e7eb);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pt-item, .rec-row { display: flex; justify-content: space-between; font-size: 13px; }
    .pt-label, .rec-label { color: var(--nb-text-muted, #6b7280); }
    .danger { color: #dc2626; font-weight: 800; }
    .success { color: #16a34a; font-weight: 800; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-label { font-size: 12.5px; font-weight: 800; color: var(--nb-text-secondary, #374151); }
    .form-control {
      font-family: inherit;
      font-size: 13.5px;
      padding: 10px 12px;
      border: 1px solid var(--nb-border, #d1d5db);
      border-radius: 8px;
      background: var(--nb-surface, #fff);
      color: var(--nb-text, #111827);
      box-sizing: border-box;
      width: 100%;
    }
    .form-control:focus {
      outline: none;
      border-color: var(--nb-primary-600, #2563eb);
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
    }
    .wa-textarea {
      line-height: 1.6;
      background: #fdfdfd;
      font-size: 13px;
    }

    .modal-error-box {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12.5px;
      color: #991b1b;
    }
    .copy-success-banner {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 12.5px;
      font-weight: 700;
      text-align: center;
    }

    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--nb-border, #e5e7eb);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: var(--nb-surface-raised, #f9fafb);
    }
    .wa-direct-btn {
      background: #16a34a;
      color: #fff;
      font-weight: 800;
    }
    .wa-direct-btn:hover { background: #15803d; }

    /* مودال سند القبض والنجاح */
    .receipt-modal { text-align: center; padding: 30px 24px; align-items: center; }
    .receipt-icon { font-size: 48px; margin-bottom: 8px; }
    .receipt-title { font-size: 20px; font-weight: 800; color: #111827; margin: 0 0 6px; }
    .receipt-sub { font-size: 13.5px; color: #6b7280; margin: 0 0 20px; }
    .receipt-badge-box {
      background: #eff6ff;
      border: 1px dashed #3b82f6;
      border-radius: 10px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    .rb-label { font-size: 13px; color: #1e40af; }
    .rb-num { font-size: 18px; font-weight: 800; color: #1d4ed8; font-family: monospace; }
    .receipt-actions { width: 100%; display: flex; justify-content: center; }

    .loading-box { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: var(--nb-text-muted, #6b7280); }
    .spinner { width: 22px; height: 22px; border: 3px solid #e5e7eb; border-top-color: var(--nb-primary-600, #2563eb); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-box { text-align: center; padding: 48px 20px; color: var(--nb-text-muted, #6b7280); }
    .empty-icon { font-size: 38px; display: block; margin-bottom: 10px; }
    .empty-title { font-size: 16px; font-weight: 800; color: var(--nb-text, #374151); margin: 0 0 6px; }
    .empty-sub { font-size: 13px; margin: 0; }

    .section-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .print-only {
      display: none;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print,
      .kpi-grid,
      .controls-card,
      .calendar-container,
      .header-actions,
      nb-page-header,
      .actions-col,
      .modal-backdrop,
      .section-header-actions,
      .items-count {
        display: none !important;
      }
      .print-only {
        display: block !important;
      }
      .calendar-page {
        padding: 0 !important;
        background: #fff !important;
        gap: 0 !important;
      }
      .installments-section {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .section-header {
        display: none !important;
      }
      .nebras-table {
        width: 100% !important;
        font-size: 11px !important;
        border-collapse: collapse !important;
      }
      .nebras-table th {
        background: #f1f5f9 !important;
        color: #0f172a !important;
        padding: 8px 6px !important;
        border: 1px solid #cbd5e1 !important;
      }
      .nebras-table td {
        padding: 7px 6px !important;
        border: 1px solid #e2e8f0 !important;
      }
      .print-document-header {
        margin-bottom: 12px;
        padding-bottom: 10px;
        border-bottom: 2px solid #0f172a;
      }
      .print-header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .print-org-info h2 {
        font-size: 17px;
        margin: 0 0 3px 0;
        font-weight: 800;
        color: #0f172a;
      }
      .print-org-info p {
        font-size: 11px;
        margin: 0 0 6px 0;
        color: #475569;
      }
      .print-doc-title {
        font-size: 13.5px;
        font-weight: 800;
        color: #1e40af;
      }
      .print-meta-box {
        font-size: 10.5px;
        text-align: left;
        color: #334155;
        direction: rtl;
      }
      .print-meta-item {
        margin-bottom: 2px;
      }
      .print-summary-strip {
        display: flex;
        gap: 20px;
        margin-top: 10px;
        padding: 8px 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      .pss-box {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
      }
      .pss-val {
        font-weight: bold;
      }
      .pss-val.success { color: #166534; }
      .pss-val.danger { color: #991b1b; }

      .print-signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 24px;
        padding-top: 14px;
        page-break-inside: avoid;
      }
      .sig-block {
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 11px;
        font-weight: bold;
      }
      .sig-dots {
        color: #94a3b8;
      }
      .sig-seal-box {
        width: 90px;
        height: 55px;
        border: 1px dashed #94a3b8;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        font-size: 10px;
      }
    }
  `]
})
export class SfInstallmentsCalendarComponent implements OnInit {
  private svc = inject(StudentFinanceService);
  private router = inject(Router);

  readonly monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  readonly weekDayNames = [
    'السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
  ];

  // الحالة الرئيسية
  currentYear = signal<number>(2026);
  currentMonth = signal<number>(9);
  loading = signal<boolean>(false);
  viewMode = signal<'both' | 'calendar_only' | 'agenda_only'>('both');
  activeFilter = signal<'all' | 'today' | 'this_week' | 'overdue' | 'paid'>('all');
  searchQuery = signal<string>('');
  selectedDay = signal<CalendarDay | null>(null);

  summary = signal<any>({
    overdue_count: 0,
    overdue_amount: 0,
    due_today_count: 0,
    due_today_amount: 0,
    due_week_count: 0,
    due_week_amount: 0,
    paid_month_count: 0,
    paid_month_amount: 0,
    month_total_due: 0
  });

  daysSummary = signal<Record<string, any>>({});
  installments = signal<any[]>([]);

  // مودال السداد الفوري
  payModalOpen = signal<boolean>(false);
  activeInstallment = signal<any | null>(null);
  payFormAmount: number = 0;
  payFormMethod: string = 'تطبيق بنكك (بنك الخرطوم)';
  payFormRef: string = '';
  payFormNotes: string = 'سداد قسط دراسي عبر تقويم الدفعات';
  submittingPay = signal<boolean>(false);
  modalError = signal<string | null>(null);
  receiptSuccess = signal<any | null>(null);

  // مودال تذكير واتساب
  reminderModalOpen = signal<boolean>(false);
  loadingReminder = signal<boolean>(false);
  reminderData = signal<any | null>(null);
  copySuccess = signal<boolean>(false);

  // حساب الأيام للشبكة الشهرية
  calendarDays = computed(() => {
    const year = Number(this.currentYear()) || 2026;
    const month = Number(this.currentMonth()) || 10; // 1-indexed
    const days: CalendarDay[] = [];

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const numDays = lastDayOfMonth.getDate();

    // في السودان والعالم العربي يبدأ الأسبوع بالسبت (Saturday = 6 في JS Date.getDay())
    // تحويل getDay() ليكون السبت = 0
    // السبت(6) -> 0, الأحد(0) -> 1, الإثنين(1) -> 2, ..., الجمعة(5) -> 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 1) % 7;

    const daysSum = this.daysSummary() || {};
    const selDayStr = this.selectedDay()?.dateStr;

    // أيام الشهر السابق لإكمال الصف الأول
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: new Date(prevY, prevM - 1, d),
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selDayStr === dStr,
        totalAmount: 0,
        count: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        paidCount: 0
      });
    }

    // أيام الشهر الحالي كاملاً (من 1 إلى numDays)
    const today = new Date();
    const isThisYear = today.getFullYear() === year;
    const isThisMonth = today.getMonth() + 1 === month;
    const todayDateNum = today.getDate();

    for (let d = 1; d <= numDays; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = daysSum[dStr] || { total_amount: 0, count: 0, overdue_count: 0, due_today_count: 0, paid_count: 0 };
      
      const isToday = isThisYear && isThisMonth && todayDateNum === d;

      days.push({
        date: new Date(year, month - 1, d),
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: isToday,
        isSelected: selDayStr === dStr,
        totalAmount: Number(dayData.total_amount) || 0,
        count: Number(dayData.count) || 0,
        overdueCount: Number(dayData.overdue_count) || 0,
        dueTodayCount: Number(dayData.due_today_count) || 0,
        paidCount: Number(dayData.paid_count) || 0
      });
    }

    // إكمال الصف الأخير من الشهر القادم حتى اكتمال مضاعف الـ 7
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        date: new Date(nextY, nextM - 1, d),
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selDayStr === dStr,
        totalAmount: 0,
        count: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        paidCount: 0
      });
    }

    // ضمان أن التقويم يحتوي دائماً على 5 أو 6 صفوف كاملة ومكتملة (35 أو 42 يوماً)
    while (days.length < 35) {
      const last = days[days.length - 1];
      const nextDate = new Date(last.date);
      nextDate.setDate(nextDate.getDate() + 1);
      const nY = nextDate.getFullYear();
      const nM = nextDate.getMonth() + 1;
      const nD = nextDate.getDate();
      const dStr = `${nY}-${String(nM).padStart(2, '0')}-${String(nD).padStart(2, '0')}`;
      days.push({
        date: nextDate,
        dateStr: dStr,
        dayNumber: nD,
        isCurrentMonth: false,
        isToday: false,
        isSelected: selDayStr === dStr,
        totalAmount: 0,
        count: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        paidCount: 0
      });
    }

    return days;
  });

  // قائمة الأقساط المفلترة
  filteredInstallments = computed(() => {
    let list = this.installments();
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    const selDay = this.selectedDay();

    if (selDay) {
      list = list.filter(ins => ins.due_date === selDay.dateStr);
    }

    if (filter === 'today') {
      list = list.filter(ins => ins.computed_status === 'due_today');
    } else if (filter === 'this_week') {
      const today = new Date();
      const in7Days = new Date(today);
      in7Days.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().split('T')[0];
      const in7Str = in7Days.toISOString().split('T')[0];
      list = list.filter(ins => ins.due_date >= todayStr && ins.due_date <= in7Str && ins.status !== 'paid');
    } else if (filter === 'overdue') {
      list = list.filter(ins => ins.computed_status === 'overdue');
    } else if (filter === 'paid') {
      list = list.filter(ins => ins.status === 'paid');
    }

    if (query) {
      list = list.filter(ins =>
        (ins.student_name || '').toLowerCase().includes(query) ||
        (ins.student_number || '').toLowerCase().includes(query) ||
        (ins.guardian_phone || '').includes(query) ||
        (ins.invoice_number || '').toLowerCase().includes(query) ||
        (ins.guardian_name || '').toLowerCase().includes(query)
      );
    }

    return list;
  });

  ngOnInit() {
    // تعيين التاريخ الافتراضي: أكتوبر 2026 كشهر بدء الأقساط الأساسي
    this.currentYear.set(2026);
    this.currentMonth.set(10);
    this.loadData();
  }

  onMonthChange(m: any) {
    this.currentMonth.set(Number(m));
    this.selectedDay.set(null);
    this.loadData();
  }

  onYearChange(y: any) {
    this.currentYear.set(Number(y));
    this.selectedDay.set(null);
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    const params = {
      year: this.currentYear(),
      month: this.currentMonth(),
      range: this.activeFilter() === 'today' ? 'today' : (this.activeFilter() === 'this_week' ? 'this_week' : undefined),
      status: this.activeFilter() === 'overdue' ? 'overdue' : (this.activeFilter() === 'paid' ? 'paid' : undefined),
    };

    this.svc.getInstallmentsCalendar(params).subscribe({
      next: (res) => {
        if (res?.success && res?.data) {
          this.summary.set(res.data.summary || {});
          this.daysSummary.set(res.data.days_summary || {});
          this.installments.set(res.data.installments || []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  prevMonth() {
    let m = this.currentMonth() - 1;
    let y = this.currentYear();
    if (m < 1) { m = 12; y--; }
    this.currentMonth.set(m);
    this.currentYear.set(y);
    this.selectedDay.set(null);
    this.loadData();
  }

  nextMonth() {
    let m = this.currentMonth() + 1;
    let y = this.currentYear();
    if (m > 12) { m = 1; y++; }
    this.currentMonth.set(m);
    this.currentYear.set(y);
    this.selectedDay.set(null);
    this.loadData();
  }

  goToCurrentMonth() {
    this.currentYear.set(2026);
    this.currentMonth.set(10);
    this.selectedDay.set(null);
    this.loadData();
  }

  setViewMode(mode: 'both' | 'calendar_only' | 'agenda_only') {
    this.viewMode.set(mode);
  }

  setFilter(filter: 'all' | 'today' | 'this_week' | 'overdue' | 'paid') {
    this.activeFilter.set(filter);
    this.selectedDay.set(null);
  }

  quickFilter(filter: 'today' | 'this_week' | 'overdue' | 'paid') {
    this.activeFilter.set(filter);
    this.selectedDay.set(null);
    if (this.viewMode() === 'calendar_only') {
      this.viewMode.set('both');
    }
  }

  onSearchChange(q: string) {
    this.searchQuery.set(q);
  }

  selectDay(day: CalendarDay) {
    if (!day.isCurrentMonth) {
      this.currentMonth.set(day.date.getMonth() + 1);
      this.currentYear.set(day.date.getFullYear());
      this.selectedDay.set(day);
      this.loadData();
      return;
    }
    if (this.selectedDay()?.dateStr === day.dateStr) {
      this.selectedDay.set(null);
    } else {
      this.selectedDay.set(day);
      if (this.viewMode() === 'calendar_only') {
        this.viewMode.set('both');
      }
    }
  }

  printTable() {
    window.print();
  }

  totalRequiredAmount = computed(() => {
    return this.filteredInstallments().reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  });

  totalPaidAmount = computed(() => {
    return this.filteredInstallments().reduce((sum, item) => sum + (Number(item.paid_amount) || 0), 0);
  });

  totalRemainingAmount = computed(() => {
    return this.filteredInstallments().reduce((sum, item) => sum + (Number(item.remaining_amount) || 0), 0);
  });

  get printDateStr(): string {
    const d = new Date();
    return `${d.toLocaleDateString('ar-SD')} - ${d.toLocaleTimeString('ar-SD', { hour: '2-digit', minute: '2-digit' })}`;
  }

  getFilterLabel(): string {
    const f = this.activeFilter();
    if (f === 'today') return 'مستحق اليوم';
    if (f === 'this_week') return 'مستحق خلال 7 أيام';
    if (f === 'overdue') return 'متأخرات السداد';
    if (f === 'paid') return 'مسدد بالكامل';
    if (this.selectedDay()) return `أقساط يوم ${this.selectedDay()?.dateStr}`;
    return 'جميع الأقساط (الشهر كاملاً)';
  }

  clearSelectedDay() {
    this.selectedDay.set(null);
  }

  calcPaidPct(ins: any): number {
    const amt = Number(ins.amount) || 0;
    const paid = Number(ins.paid_amount) || 0;
    if (amt <= 0) return 0;
    return Math.min(100, Math.round((paid / amt) * 100));
  }

  // --- إجراءات المودال: سداد فوري ---
  openQuickPay(ins: any) {
    this.activeInstallment.set(ins);
    this.payFormAmount = ins.remaining_amount || ins.amount;
    this.payFormMethod = 'تطبيق بنكك (بنك الخرطوم)';
    this.payFormRef = '';
    this.payFormNotes = `سداد قسط مستحق بتاريخ ${ins.due_date}`;
    this.modalError.set(null);
    this.payModalOpen.set(true);
  }

  closeQuickPay() {
    this.payModalOpen.set(false);
    this.activeInstallment.set(null);
    this.modalError.set(null);
  }

  submitQuickPay() {
    const ins = this.activeInstallment();
    if (!ins) return;

    if (!this.payFormAmount || this.payFormAmount <= 0) {
      this.modalError.set('يرجى إدخال مبلغ سداد صحيح.');
      return;
    }

    this.submittingPay.set(true);
    this.modalError.set(null);

    this.svc.quickPayInstallment(ins.id, {
      amount: this.payFormAmount,
      payment_method: this.payFormMethod,
      reference_number: this.payFormRef,
      notes: this.payFormNotes
    }).subscribe({
      next: (res) => {
        this.submittingPay.set(false);
        this.closeQuickPay();
        this.receiptSuccess.set(res?.data || { receipt_number: 'REC-GENERATED' });
        this.loadData();
      },
      error: (err) => {
        this.submittingPay.set(false);
        const msg = err?.error?.message || err?.error?.error?.message || 'تعذر تسجيل السداد، يرجى المحاولة لاحقاً.';
        this.modalError.set(msg);
      }
    });
  }

  // --- إجراءات المودال: تذكير واتساب ---
  openReminderModal(ins: any) {
    this.activeInstallment.set(ins);
    this.loadingReminder.set(true);
    this.copySuccess.set(false);
    this.reminderModalOpen.set(true);

    this.svc.getInstallmentReminderInfo(ins.id).subscribe({
      next: (res) => {
        this.reminderData.set(res?.data || null);
        this.loadingReminder.set(false);
      },
      error: () => {
        this.loadingReminder.set(false);
      }
    });
  }

  closeReminderModal() {
    this.reminderModalOpen.set(false);
    this.reminderData.set(null);
    this.copySuccess.set(false);
  }

  copyReminderText() {
    const txt = this.reminderData()?.reminder_text;
    if (txt && navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        this.copySuccess.set(true);
        setTimeout(() => this.copySuccess.set(false), 3000);
      });
    }
  }

  openWhatsAppDirect() {
    const url = this.reminderData()?.whatsapp_url;
    if (url) {
      window.open(url, '_blank');
    }
  }

  openStudentStatement(ins: any) {
    const accId = ins.account_id || ins.student_billing_account;
    if (accId) {
      this.router.navigate(['/student-finance/accounts', accId, 'statement']);
    }
  }

  exportingExcel = signal<boolean>(false);

  /**
   * تصدير كشف الطلاب المستحقين في الأقساط والدفعات لشهر التقويم الحالي
   */
  exportMonthlyDuesExcel() {
    if (this.exportingExcel()) return;
    this.exportingExcel.set(true);

    const year = this.currentYear();
    const month = this.currentMonth();
    const status = this.activeFilter() === 'overdue' ? 'overdue' : (this.activeFilter() === 'paid' ? 'paid' : 'all');

    this.svc.exportMonthlyDues(year, month, status).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const monthPad = String(month).padStart(2, '0');
        const monthTitle = this.monthNames[month - 1] || monthPad;
        a.download = `كشف-مستحقي-الأقساط-${monthTitle}-${year}.xlsx`;
        a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        this.exportingExcel.set(false);
      },
      error: (err) => {
        console.error('فشل تصدير كشف مستحقي الأقساط:', err);
        this.exportingExcel.set(false);
      }
    });
  }

  goBack() {
    this.router.navigateByUrl('/student-finance/dashboard');
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}
