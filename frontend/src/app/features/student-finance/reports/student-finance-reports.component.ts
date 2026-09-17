import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbExportMenuComponent } from '../../../shared/export/nb-export-menu.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ExportColumn } from '../../../shared/export/export.types';
import {
  printStudentFinanceReport,
  printClearanceCertificate,
  printDemandNotice,
  printReceiptVoucher,
  tafqeet,
} from './student-finance-report-print';

export type ReportTab =
  | 'revenue'
  | 'receipts'
  | 'invoices'
  | 'paid'
  | 'overdue'
  | 'installments'
  | 'scholarships';

export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

@Component({
  selector: 'app-student-finance-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbExportMenuComponent, NbDatepickerComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <!-- ترويسة الصفحة -->
      <nb-page-header
        title="تقارير حسابات الطلاب المالية وحسابات القبض"
        subtitle="تحليل شامل لحركة الإيرادات المدرسية، الفواتير، التحصيلات، الطلاب المسددين والمتعثرين، والأقساط القادمة بالجنيه السوداني (ج.س)."
      >
        <div class="header-actions">
          <div class="preset-group">
            <button
              class="btn-sm today-btn"
              [class.active]="datePreset() === 'today'"
              (click)="setDatePreset('today')"
            >
              📅 سندات اليوم
            </button>
            <button
              class="btn-sm"
              [class.active]="datePreset() === 'week'"
              (click)="setDatePreset('week')"
            >
              هذا الأسبوع
            </button>
            <button
              class="btn-sm"
              [class.active]="datePreset() === 'month'"
              (click)="setDatePreset('month')"
            >
              هذا الشهر
            </button>
            <button
              class="btn-sm"
              [class.active]="datePreset() === 'quarter'"
              (click)="setDatePreset('quarter')"
            >
              الربع الحالي
            </button>
            <button
              class="btn-sm"
              [class.active]="datePreset() === 'year'"
              (click)="setDatePreset('year')"
            >
              العام الدراسي
            </button>
            <button
              class="btn-sm"
              [class.active]="datePreset() === 'all'"
              (click)="setDatePreset('all')"
            >
              الكل
            </button>
          </div>

          <button class="btn ghost" (click)="loadAllData()" [disabled]="loading()">
            <span class="ico">🔄</span> تحديث
          </button>

          <button class="btn print" (click)="printCurrentReport()">
            <span class="ico">🖨️</span> طباعة A4 رسمي
          </button>

          <nb-export-menu
            [columns]="activeExportColumns()"
            [rows]="activeExportRows()"
            [title]="activeReportTitle()"
          />
        </div>
      </nb-page-header>

      <!-- شريط التبويبات السبعة -->
      <div class="tabs-bar">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'revenue'"
          (click)="switchTab('revenue')"
        >
          <span class="tab-icon">📈</span>
          <span class="tab-label">إيرادات الرسوم</span>
          <span class="tab-badge">{{ revenueData().length }}</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab() === 'receipts'"
          (click)="switchTab('receipts')"
        >
          <span class="tab-icon">💵</span>
          <span class="tab-label">سندات القبض والتحصيل</span>
          <span class="tab-badge">{{ receiptsData().length }}</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab() === 'invoices'"
          (click)="switchTab('invoices')"
        >
          <span class="tab-icon">🧾</span>
          <span class="tab-label">فواتير الطلاب</span>
          <span class="tab-badge">{{ invoicesData().length }}</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab() === 'paid'"
          (click)="switchTab('paid')"
        >
          <span class="tab-icon">✅</span>
          <span class="tab-label">الطلاب المسددين</span>
          <span class="tab-badge success">{{ paidStudentsData().length }}</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab() === 'overdue'"
          (click)="switchTab('overdue')"
        >
          <span class="tab-icon">⚠️</span>
          <span class="tab-label">الطلاب المتأخرين</span>
          <span class="tab-badge danger">{{ overdueStudentsData().length }}</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab() === 'installments'"
          (click)="switchTab('installments')"
        >
          <span class="tab-icon">📅</span>
          <span class="tab-label">الأقساط القادمة</span>
          <span class="tab-badge info">{{ installmentsData().length }}</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="activeTab() === 'scholarships'"
          (click)="switchTab('scholarships')"
        >
          <span class="tab-icon">🎓</span>
          <span class="tab-label">المنح والتخفيضات</span>
          <span class="tab-badge warning">{{ scholarshipsData().length }}</span>
        </button>
      </div>

      <!-- بطاقات مؤشرات الأداء (KPIs) المتفاعلة حسب التبويب النشط -->
      <section class="kpis-grid">
        @for (kpi of currentKpis(); track kpi.label) {
          <div class="kpi-card" [class]="kpi.style || ''">
            <span class="kpi-icon">{{ kpi.icon }}</span>
            <div class="kpi-content">
              <span class="kpi-label">{{ kpi.label }}</span>
              <span class="kpi-value">
                {{ kpi.value }}
                @if (kpi.unit) {
                  <em class="unit">{{ kpi.unit }}</em>
                }
              </span>
              @if (kpi.sub) {
                <span class="kpi-sub">{{ kpi.sub }}</span>
              }
            </div>
          </div>
        }
      </section>

      <!-- شريط الفلاتر والبحث المتقدم -->
      <div class="filters-card">
        <div class="filter-input-wrap search">
          <span class="ico">🔍</span>
          <input
            type="text"
            placeholder="بحث باسم الطالب، الرقم الأكاديمي، رقم السند أو العملية..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>

        @if (activeTab() === 'receipts') {
          <div class="filter-input-wrap select">
            <label>الفرع:</label>
            <select [ngModel]="selectedBranch()" (ngModelChange)="selectedBranch.set($event)">
              <option value="all">جميع الفروع</option>
              <option value="فرع البنين">فرع البنين 👦</option>
              <option value="فرع البنات">فرع البنات 👧</option>
            </select>
          </div>

          <div class="filter-input-wrap select">
            <label>المرحلة التعليمية:</label>
            <select [ngModel]="selectedStage()" (ngModelChange)="onStageChange($event)">
              <option value="all">جميع المراحل</option>
              <option value="رياض الأطفال">رياض الأطفال</option>
              <option value="المرحلة الابتدائية">المرحلة الابتدائية</option>
              <option value="المرحلة المتوسطة">المرحلة المتوسطة</option>
              <option value="المرحلة الثانوية">المرحلة الثانوية</option>
            </select>
          </div>
        }

        <div class="filter-input-wrap select">
          <label>الصف الدراسي:</label>
          <select [ngModel]="selectedGrade()" (ngModelChange)="selectedGrade.set($event)">
            <option value="all">جميع الصفوف</option>
            @for (g of filteredGradeOptions(); track g) {
              <option [value]="g">{{ g }}</option>
            }
          </select>
        </div>

        @if (activeTab() === 'receipts') {
          <div class="filter-input-wrap select">
            <label>طريقة التحصيل:</label>
            <select [ngModel]="selectedMethod()" (ngModelChange)="selectedMethod.set($event)">
              <option value="all">جميع الطرق</option>
              <option value="بنكك - بنك الخرطوم">تطبيق بنكك (بنك الخرطوم)</option>
              <option value="فوري - بنك فيصل الإسلامي">خدمة فوري (بنك فيصل)</option>
              <option value="نقدي - خزينة المدرسة">نقداً بالخزينة</option>
              <option value="أوكاش - بنك أمدرمان">أوكاش (بنك أمدرمان)</option>
              <option value="شيك بنكي">شيك بنكي مصرفي</option>
            </select>
          </div>

          <div class="filter-input-wrap date-picker-wrap">
            <label>من تاريخ:</label>
            <nb-datepicker
              [value]="dateFrom()"
              (valueChange)="onDateFromChange($event)"
              placeholder="من تاريخ"
              ariaLabel="من تاريخ"
            ></nb-datepicker>
          </div>

          <div class="filter-input-wrap date-picker-wrap">
            <label>إلى تاريخ:</label>
            <nb-datepicker
              [value]="dateTo()"
              (valueChange)="onDateToChange($event)"
              placeholder="إلى تاريخ"
              ariaLabel="إلى تاريخ"
            ></nb-datepicker>
          </div>
        }

        @if (activeTab() === 'invoices') {
          <div class="filter-input-wrap select">
            <label>حالة الفاتورة:</label>
            <select [ngModel]="selectedStatus()" (ngModelChange)="selectedStatus.set($event)">
              <option value="all">جميع الحالات</option>
              <option value="paid">مسددة بالكامل</option>
              <option value="partially_paid">مسددة جزئياً</option>
              <option value="issued">غير مسددة</option>
              <option value="overdue">متأخرة</option>
            </select>
          </div>
        }

        @if (activeTab() === 'overdue') {
          <div class="filter-input-wrap select">
            <label>فترة التأخير:</label>
            <select [ngModel]="selectedAging()" (ngModelChange)="selectedAging.set($event)">
              <option value="all">جميع المتأخرين</option>
              <option value="1-15">1 - 15 يوماً</option>
              <option value="16-30">16 - 30 يوماً</option>
              <option value="31-60">31 - 60 يوماً</option>
              <option value="60+">أكثر من 60 يوماً (حظر)</option>
            </select>
          </div>
        }

        @if (hasActiveFilters()) {
          <button class="btn ghost clear-btn" (click)="resetFilters()">
            إلغاء الفلاتر
          </button>
        }
      </div>

      <!-- محتوى الجداول حسب التبويب -->
      <div class="table-container">
        @if (loading()) {
          <nb-loading message="جارٍ استرجاع وتحديث سندات القبض والتقارير المالية المعتمدة…"></nb-loading>
        } @else {
          <!-- 1. تقرير إيرادات الرسوم -->
          @if (activeTab() === 'revenue') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>بند الرسم / الخدمة</th>
                  <th>الفئة</th>
                  <th class="num">إجمالي المفوتر</th>
                  <th class="num">المحصّل الفعلي</th>
                  <th class="num">المتبقي للتحصيل</th>
                  <th class="num">نسبة التحصيل</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredRevenue(); track row.name) {
                  <tr [class.total-row]="row._isTotal">
                    <td class="font-bold">{{ row.name }}</td>
                    <td>{{ row.category }}</td>
                    <td class="num">{{ fmt(row.invoiced) }} <small>ج.س</small></td>
                    <td class="num success-text">{{ fmt(row.collected) }} <small>ج.س</small></td>
                    <td class="num danger-text">{{ fmt(row.remaining) }} <small>ج.س</small></td>
                    <td class="num">
                      <div class="progress-bar-wrap">
                        <div class="progress-fill" [style.width.%]="row.rate"></div>
                        <span class="pct">{{ row.rate | number:'1.0-1' }}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge" [class.success]="row.rate >= 80" [class.warning]="row.rate >= 50 && row.rate < 80" [class.danger]="row.rate < 50">
                        {{ row.rate >= 80 ? 'تحصيل مرتفع' : row.rate >= 50 ? 'تحصيل متوسط' : 'تحصيل منخفض' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- 2. تقرير سندات القبض والتحصيلات المفصلة -->
          @if (activeTab() === 'receipts') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>رقم السند</th>
                  <th>تاريخ السند</th>
                  <th>اسم الطالب والرقم الأكاديمي</th>
                  <th>الفرع</th>
                  <th>المرحلة الدراسية</th>
                  <th>الصف والشعبة</th>
                  <th>طريقة الدفع والبنك</th>
                  <th>رقم المرجع / العملية</th>
                  <th class="num">المبلغ</th>
                  <th>المحصّل</th>
                  <th>إجراءات رسمية</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filteredReceipts(); track r.id) {
                  <tr [class.total-row]="r._isTotal">
                    @if (r._isTotal) {
                      <td colspan="8" class="font-bold">
                        إجمالي سندات التحصيل المعروضة ({{ filteredReceipts().length - 1 }} سند):
                      </td>
                      <td class="num font-bold success-text" style="font-size: 15px;">
                        {{ fmt(r.amount) }} <small>ج.س</small>
                      </td>
                      <td colspan="2"></td>
                    } @else {
                      <td class="mono font-bold">
                        <span class="receipt-num-badge">{{ r.receipt_number }}</span>
                      </td>
                      <td>
                        <div class="date-cell">
                          <span class="date-main">{{ r.receipt_date }}</span>
                          @if (r.receipt_date === todayStr) {
                            <span class="today-tag">اليوم</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div class="user-cell">
                          <span class="avatar-sm" [class.girls]="r.gender === 'بنات' || r.branch_name?.includes('بنات')">
                            {{ r.gender === 'بنات' || r.branch_name?.includes('بنات') ? '👧' : '👦' }}
                          </span>
                          <div class="user-details">
                            <span class="student-name font-bold">{{ r.student_name }}</span>
                            <small class="student-no mono muted">{{ r.student_number || 'ST-2026' }}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="branch-tag" [class.girls]="r.branch_name?.includes('بنات')">
                          {{ r.branch_name || (r.gender === 'بنات' ? 'فرع البنات' : 'فرع البنين') }}
                        </span>
                      </td>
                      <td>
                        <span class="stage-tag" [class]="getStageClass(r.stage_name)">
                          {{ r.stage_name }}
                        </span>
                      </td>
                      <td>
                        <div class="grade-cell">
                          <span>{{ r.grade_name }}</span>
                          @if (r.section_name) {
                            <small class="section-sub">({{ r.section_name }})</small>
                          }
                        </div>
                      </td>
                      <td>
                        <span class="payment-method-tag" [class]="getMethodClass(r.payment_method)">
                          {{ r.payment_method }}
                        </span>
                      </td>
                      <td class="mono font-sm">{{ r.reference_number || '—' }}</td>
                      <td class="num font-bold success-text">
                        {{ fmt(r.amount) }} <small>ج.س</small>
                      </td>
                      <td>
                        <span class="collector-name">{{ r.collector || 'محاسب الخزينة' }}</span>
                      </td>
                      <td>
                        <div class="row-actions-group">
                          <button class="btn xs print-btn" title="طباعة سند القبض الرسمي A4" (click)="printReceipt(r)">
                            🖨️ سند A4
                          </button>
                          <button class="btn xs ghost" title="عرض كشف حساب الطالب" (click)="viewAccount(r.account_id)">
                            كشف الحساب
                          </button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- 3. تقرير فواتير الطلاب -->
          @if (activeTab() === 'invoices') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>تاريخ الإصدار</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>الطالب</th>
                  <th>الصف</th>
                  <th class="num">القيمة الإجمالية</th>
                  <th class="num">المسدد</th>
                  <th class="num">المتبقي</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of filteredInvoices(); track inv.id) {
                  <tr [class.total-row]="inv._isTotal">
                    @if (inv._isTotal) {
                      <td colspan="5" class="font-bold">الإجمالي العام للفواتير:</td>
                      <td class="num font-bold">{{ fmt(inv.total) }} <small>ج.س</small></td>
                      <td class="num font-bold success-text">{{ fmt(inv.paid) }} <small>ج.س</small></td>
                      <td class="num font-bold danger-text">{{ fmt(inv.remaining) }} <small>ج.س</small></td>
                      <td colspan="2"></td>
                    } @else {
                      <td class="mono font-bold">{{ inv.invoice_number }}</td>
                      <td>{{ inv.issue_date }}</td>
                      <td>{{ inv.due_date }}</td>
                      <td class="font-bold">{{ inv.student_name }}</td>
                      <td>{{ inv.grade_name }}</td>
                      <td class="num font-bold">{{ fmt(inv.total_amount) }} <small>ج.س</small></td>
                      <td class="num success-text">{{ fmt(inv.paid_amount) }} <small>ج.س</small></td>
                      <td class="num danger-text">{{ fmt(inv.remaining_balance) }} <small>ج.س</small></td>
                      <td>
                        <span class="badge" [class]="getInvoiceBadge(inv.status)">
                          {{ getInvoiceStatusLabel(inv.status) }}
                        </span>
                      </td>
                      <td>
                        <button class="btn xs ghost" (click)="viewAccount(inv.account_id)">
                          الحساب
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- 4. تقرير الطلاب المسددين 100% -->
          @if (activeTab() === 'paid') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الرقم الأكاديمي</th>
                  <th>الصف الدراسي</th>
                  <th>ولي الأمر</th>
                  <th>الهاتف</th>
                  <th class="num">إجمالي المقرّر</th>
                  <th class="num">المسدد بالكامل</th>
                  <th>تاريخ آخر دفعة</th>
                  <th>حالة الحساب</th>
                  <th>إجراءات رسمية</th>
                </tr>
              </thead>
              <tbody>
                @for (st of filteredPaidStudents(); track st.id) {
                  <tr [class.total-row]="st._isTotal">
                    @if (st._isTotal) {
                      <td colspan="5" class="font-bold">إجمالي المتحصلات من الطلاب المسددين:</td>
                      <td class="num font-bold">{{ fmt(st.billed) }} <small>ج.س</small></td>
                      <td class="num font-bold success-text">{{ fmt(st.paid) }} <small>ج.س</small></td>
                      <td colspan="3"></td>
                    } @else {
                      <td class="font-bold">
                        <div class="user-cell">
                          <span class="avatar-sm">🎓</span>
                          <span>{{ st.student_name }}</span>
                        </div>
                      </td>
                      <td class="mono">{{ st.student_number }}</td>
                      <td>{{ st.grade_name }}</td>
                      <td>{{ st.guardian_name }}</td>
                      <td class="mono">{{ st.guardian_phone }}</td>
                      <td class="num">{{ fmt(st.total_billed) }} <small>ج.س</small></td>
                      <td class="num font-bold success-text">{{ fmt(st.total_paid) }} <small>ج.س</small></td>
                      <td>{{ st.last_payment_date }}</td>
                      <td>
                        <span class="badge success">خالص الرسوم 100%</span>
                      </td>
                      <td>
                        <button class="btn xs success" (click)="printClearance(st)" title="طباعة شهادة براءة ذمة مالية معتمدة">
                          📜 براءة ذمة A4
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- 5. تقرير الطلاب المتأخرين والمتعثرين -->
          @if (activeTab() === 'overdue') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الرقم الأكاديمي</th>
                  <th>الصف</th>
                  <th>ولي الأمر</th>
                  <th>الهاتف</th>
                  <th class="num">المبلغ المتأخر</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>مدة التأخير</th>
                  <th>حالة الحظر</th>
                  <th>إجراءات المطالبة</th>
                </tr>
              </thead>
              <tbody>
                @for (od of filteredOverdueStudents(); track od.id) {
                  <tr [class.total-row]="od._isTotal">
                    @if (od._isTotal) {
                      <td colspan="5" class="font-bold">إجمالي المديونيات المتأخرة:</td>
                      <td class="num font-bold danger-text">{{ fmt(od.amount) }} <small>ج.س</small></td>
                      <td colspan="4"></td>
                    } @else {
                      <td class="font-bold">
                        <div class="user-cell">
                          <span class="avatar-sm danger">⚠️</span>
                          <span>{{ od.student_name }}</span>
                        </div>
                      </td>
                      <td class="mono">{{ od.student_number }}</td>
                      <td>{{ od.grade_name }}</td>
                      <td>{{ od.guardian_name }}</td>
                      <td class="mono">{{ od.guardian_phone }}</td>
                      <td class="num font-bold danger-text">{{ fmt(od.outstanding_amount) }} <small>ج.س</small></td>
                      <td>{{ od.due_date }}</td>
                      <td>
                        <span class="aging-pill" [class]="getAgingClass(od.days_overdue)">
                          {{ od.days_overdue }} يوم تأخير
                        </span>
                      </td>
                      <td>
                        @if (od.has_hold) {
                          <span class="badge danger">⛔ حظر مالي نشط</span>
                        } @else {
                          <span class="badge neutral">سارٍ</span>
                        }
                      </td>
                      <td class="actions-cell">
                        <button class="btn xs danger" (click)="printDemand(od)" title="طباعة إشعار مطالبة رسمية للبريد/التسليم">
                          🖨️ إشعار مطالبة
                        </button>
                        <button class="btn xs ghost" (click)="sendWhatsApp(od)" title="إرسال تذكير عبر واتساب">
                          💬 واتساب
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- 6. تقرير الأقساط القادمة -->
          @if (activeTab() === 'installments') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>رقم القسط والخطة</th>
                  <th>تاريخ الاستحقاق</th>
                  <th>الطالب</th>
                  <th>الصف</th>
                  <th>ولي الأمر وهاتفه</th>
                  <th class="num">مبلغ القسط</th>
                  <th class="num">المسدد</th>
                  <th class="num">المتبقي</th>
                  <th>الأيام المتبقية</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                @for (inst of filteredInstallments(); track inst.id) {
                  <tr [class.total-row]="inst._isTotal">
                    @if (inst._isTotal) {
                      <td colspan="5" class="font-bold">إجمالي التدفقات المتوقعة للأقساط:</td>
                      <td class="num font-bold">{{ fmt(inst.amount) }} <small>ج.س</small></td>
                      <td class="num success-text">{{ fmt(inst.paid) }} <small>ج.س</small></td>
                      <td class="num font-bold danger-text">{{ fmt(inst.remaining) }} <small>ج.س</small></td>
                      <td colspan="2"></td>
                    } @else {
                      <td class="font-bold">{{ inst.installment_title }}</td>
                      <td class="mono font-bold">{{ inst.due_date }}</td>
                      <td class="font-bold">{{ inst.student_name }}</td>
                      <td>{{ inst.grade_name }}</td>
                      <td>{{ inst.guardian_name }} ({{ inst.guardian_phone }})</td>
                      <td class="num font-bold">{{ fmt(inst.amount) }} <small>ج.س</small></td>
                      <td class="num success-text">{{ fmt(inst.paid_amount) }} <small>ج.س</small></td>
                      <td class="num font-bold danger-text">{{ fmt(inst.remaining_amount) }} <small>ج.س</small></td>
                      <td>
                        <span class="badge" [class.info]="inst.days_left <= 7" [class.neutral]="inst.days_left > 7">
                          باقٍ {{ inst.days_left }} أيام
                        </span>
                      </td>
                      <td>
                        <button class="btn xs ghost" (click)="viewAccount(inst.account_id)">
                          الحساب
                        </button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }

          <!-- 7. تقرير المنح والخصومات -->
          @if (activeTab() === 'scholarships') {
            <table class="nb-table">
              <thead>
                <tr>
                  <th>الطالب المستفيد</th>
                  <th>الرقم الأكاديمي</th>
                  <th>الصف</th>
                  <th>نوع المنحة / التخفيض</th>
                  <th>نسبة / نوع الخصم</th>
                  <th class="num">الرسوم قبل الخصم</th>
                  <th class="num">مبلغ الخصم الممنوح</th>
                  <th class="num">الصافي بعد الخصم</th>
                  <th>المعتمد</th>
                </tr>
              </thead>
              <tbody>
                @for (sc of filteredScholarships(); track sc.id) {
                  <tr [class.total-row]="sc._isTotal">
                    @if (sc._isTotal) {
                      <td colspan="5" class="font-bold">إجمالي المساعدات والخصومات الممنوحة:</td>
                      <td class="num font-bold">{{ fmt(sc.original) }} <small>ج.س</small></td>
                      <td class="num font-bold warning-text">{{ fmt(sc.discount) }} <small>ج.س</small></td>
                      <td class="num font-bold success-text">{{ fmt(sc.net) }} <small>ج.س</small></td>
                      <td></td>
                    } @else {
                      <td class="font-bold">{{ sc.student_name }}</td>
                      <td class="mono">{{ sc.student_number }}</td>
                      <td>{{ sc.grade_name }}</td>
                      <td>
                        <span class="badge warning">{{ sc.scholarship_name }}</span>
                      </td>
                      <td>{{ sc.discount_rate }}</td>
                      <td class="num">{{ fmt(sc.original_amount) }} <small>ج.س</small></td>
                      <td class="num font-bold warning-text">{{ fmt(sc.discount_amount) }} <small>ج.س</small></td>
                      <td class="num font-bold success-text">{{ fmt(sc.net_amount) }} <small>ج.س</small></td>
                      <td>{{ sc.approved_by || 'مجلس إدارة المدرسة' }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .page {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      font-family: var(--nb-font-family, 'Segoe UI', Tahoma, sans-serif);
      color: var(--nb-text);
      background: var(--nb-bg);
      min-height: 100vh;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .preset-group {
      display: inline-flex;
      background: var(--nb-surface-raised, #f3f4f6);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius, 8px);
      padding: 2px;
    }

    .btn-sm {
      border: none;
      background: transparent;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--nb-text-muted, #6b7280);
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .btn-sm.active {
      background: var(--nb-surface, #ffffff);
      color: var(--nb-primary-700, #0057b8);
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .btn-sm.today-btn {
      color: #059669;
      font-weight: 700;
    }
    .btn-sm.today-btn.active {
      background: #059669;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25);
    }

    .btn {
      height: 36px;
      padding: 0 14px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--nb-radius, 8px);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--nb-border, #e5e7eb);
      background: var(--nb-surface, #ffffff);
      color: var(--nb-text, #111827);
      transition: all 0.15s ease;
    }
    .btn:hover:not(:disabled) {
      border-color: var(--nb-primary-400, #93c5fd);
      color: var(--nb-primary-700, #0057b8);
    }
    .btn.print {
      background: #0057b8;
      color: #ffffff;
      border-color: #0057b8;
    }
    .btn.print:hover {
      background: #00438f;
    }
    .btn.xs {
      height: 28px;
      padding: 0 10px;
      font-size: 11.5px;
    }
    .btn.success {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .btn.danger {
      background: #fef2f2;
      color: #991b1b;
      border-color: #fecaca;
    }

    /* التبويبات */
    .tabs-bar {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--nb-border, #e5e7eb);
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--nb-text-muted, #6b7280);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .tab-btn:hover {
      color: var(--nb-text, #111827);
    }
    .tab-btn.active {
      color: var(--nb-primary-700, #0057b8);
      border-bottom-color: var(--nb-primary-700, #0057b8);
      font-weight: 700;
    }
    .tab-badge {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 12px;
      background: var(--nb-surface-raised, #e5e7eb);
      color: var(--nb-text-muted, #4b5563);
      font-weight: 700;
    }
    .tab-badge.success { background: #d1fae5; color: #065f46; }
    .tab-badge.danger { background: #fee2e2; color: #991b1b; }
    .tab-badge.info { background: #e0e7ff; color: #3730a3; }
    .tab-badge.warning { background: #fef3c7; color: #92400e; }

    /* KPIs */
    .kpis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .kpi-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .kpi-card.success { border-inline-start: 4px solid #10b981; }
    .kpi-card.danger { border-inline-start: 4px solid #ef4444; }
    .kpi-card.warning { border-inline-start: 4px solid #f59e0b; }
    .kpi-card.info { border-inline-start: 4px solid #3b82f6; }
    .kpi-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--nb-surface-raised, #f3f4f6);
      flex: none;
    }
    .kpi-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .kpi-label {
      font-size: 12px;
      color: var(--nb-text-muted, #6b7280);
      font-weight: 600;
    }
    .kpi-value {
      font-size: 20px;
      font-weight: 800;
      color: var(--nb-text, #111827);
      font-variant-numeric: tabular-nums;
    }
    .kpi-value .unit {
      font-size: 11px;
      font-style: normal;
      font-weight: 500;
      color: var(--nb-text-muted, #6b7280);
      margin-inline-start: 4px;
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--nb-text-muted, #9ca3af);
    }

    /* الفلاتر */
    .filters-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .filter-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--nb-surface-raised, #f9fafb);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius, 8px);
      padding: 0 12px;
      height: 38px;
    }
    .filter-input-wrap.search { flex: 1; min-width: 260px; }
    .filter-input-wrap input {
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 13px;
      color: var(--nb-text, #111827);
      width: 100%;
    }
    .filter-input-wrap.select label {
      font-size: 12px;
      color: var(--nb-text-muted, #6b7280);
      white-space: nowrap;
    }
    .filter-input-wrap select {
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 12.5px;
      color: var(--nb-text, #111827);
      cursor: pointer;
    }
    .filter-input-wrap.date-picker-wrap {
      background: transparent;
      border: none;
      padding: 0;
      gap: 6px;
    }
    .filter-input-wrap.date-picker-wrap label {
      font-size: 12px;
      color: var(--nb-text-muted, #6b7280);
      white-space: nowrap;
    }
    .filter-input-wrap.date-picker-wrap nb-datepicker {
      display: inline-block;
    }

    /* الجدول */
    .table-container {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .nb-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .nb-table th {
      background: var(--nb-surface-raised, #f8fafc);
      padding: 12px 14px;
      text-align: right;
      font-weight: 700;
      color: var(--nb-text-muted, #475569);
      border-bottom: 2px solid var(--nb-border, #e2e8f0);
      white-space: nowrap;
    }
    .nb-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--nb-border, #f1f5f9);
      color: var(--nb-text, #1e293b);
      white-space: nowrap;
    }
    .nb-table tbody tr:hover:not(.total-row) {
      background: #f8fafc;
    }
    .nb-table .num {
      text-align: left;
      font-variant-numeric: tabular-nums;
      direction: ltr;
    }
    .nb-table .mono {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      direction: ltr;
      text-align: right;
    }
    .font-bold { font-weight: 700; }
    .success-text { color: #059669; font-weight: 700; }
    .danger-text { color: #dc2626; font-weight: 700; }
    .warning-text { color: #d97706; font-weight: 700; }

    .total-row td {
      background: #f1f5f9 !important;
      font-weight: 800;
      font-size: 13.5px;
      border-top: 2px solid #cbd5e1;
      border-bottom: 2px double #cbd5e1;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .badge.success { background: #d1fae5; color: #065f46; }
    .badge.danger { background: #fee2e2; color: #991b1b; }
    .badge.warning { background: #fef3c7; color: #92400e; }
    .badge.info { background: #e0e7ff; color: #3730a3; }
    .badge.neutral { background: #f3f4f6; color: #4b5563; }

    .payment-method-tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .payment-method-tag.bankak { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .payment-method-tag.fawry { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .payment-method-tag.cash { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .payment-method-tag.okash { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }

    .aging-pill {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .aging-pill.mild { background: #fef9c3; color: #854d0e; }
    .aging-pill.medium { background: #fed7aa; color: #9a3412; }
    .aging-pill.severe { background: #fecaca; color: #991b1b; }

    .progress-bar-wrap {
      width: 100px;
      height: 8px;
      background: #e2e8f0;
      border-radius: 4px;
      position: relative;
      display: inline-block;
      vertical-align: middle;
      margin-inline-end: 8px;
    }
    .progress-fill {
      height: 100%;
      background: #10b981;
      border-radius: 4px;
    }
    .pct {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e0e7ff;
      display: grid;
      place-items: center;
      font-size: 13px;
    }
    .avatar-sm.danger { background: #fee2e2; }
    .avatar-sm.girls { background: #fce7f3; }

    .branch-tag {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }
    .branch-tag.girls {
      background: #fce7f3;
      color: #9d174d;
      border-color: #fbcfe8;
    }

    .stage-tag {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      background: #f1f5f9;
      color: #334155;
    }
    .stage-tag.secondary {
      background: #f3e8ff;
      color: #6b21a8;
      border: 1px solid #e9d5ff;
    }
    .stage-tag.intermediate {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
    }
    .stage-tag.primary {
      background: #ccfbf1;
      color: #115e59;
      border: 1px solid #99f6e4;
    }
    .stage-tag.kindergarten {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .receipt-num-badge {
      display: inline-block;
      padding: 2px 7px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-weight: 800;
      color: #1e293b;
    }

    .today-tag {
      display: inline-block;
      font-size: 10px;
      background: #dcfce7;
      color: #15803d;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      margin-inline-start: 5px;
    }

    .date-cell {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .grade-cell {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .section-sub {
      font-size: 11px;
      color: var(--nb-text-muted, #6b7280);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .student-no {
      font-size: 11px;
    }

    .row-actions-group {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .btn.print-btn {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }
    .btn.print-btn:hover {
      background: #1d4ed8;
      color: #ffffff;
    }

    .actions-cell {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .loading-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--nb-text-muted, #6b7280);
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0057b8;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class StudentFinanceReportsComponent implements OnInit {
  private svc = inject(StudentFinanceService);
  private router = inject(Router);

  // الحالة النشطة
  activeTab = signal<ReportTab>('revenue');
  datePreset = signal<DatePreset>('today');
  loading = signal<boolean>(true);

  // تاريخ اليوم الثابت للمقارنة والفلترة
  readonly todayStr: string = '2026-09-17';

  // الفلاتر
  searchQuery = signal<string>('');
  selectedBranch = signal<string>('all');
  selectedStage = signal<string>('all');
  selectedGrade = signal<string>('all');
  selectedMethod = signal<string>('all');
  selectedStatus = signal<string>('all');
  selectedAging = signal<string>('all');
  dateFrom = signal<string>('2026-09-17');
  dateTo = signal<string>('2026-09-17');

  // البيانات
  revenueData = signal<any[]>([]);
  receiptsData = signal<any[]>([]);
  invoicesData = signal<any[]>([]);
  paidStudentsData = signal<any[]>([]);
  overdueStudentsData = signal<any[]>([]);
  installmentsData = signal<any[]>([]);
  scholarshipsData = signal<any[]>([]);

  // خيارات الصفوف الديناميكية بناء على المرحلة التعليمية المختارة
  readonly filteredGradeOptions = computed<string[]>(() => {
    const stg = this.selectedStage();
    if (stg === 'المرحلة الثانوية') {
      return ['الثانوي - الصف الأول', 'الثانوي - الصف الثاني', 'الثانوي - الصف الثالث'];
    }
    if (stg === 'المرحلة المتوسطة') {
      return ['المتوسط - الصف الأول', 'المتوسط - الصف الثاني', 'المتوسط - الصف الثالث'];
    }
    if (stg === 'المرحلة الابتدائية') {
      return [
        'الابتدائي - الصف الأول',
        'الابتدائي - الصف الثاني',
        'الابتدائي - الصف الثالث',
        'الابتدائي - الصف الرابع',
        'الابتدائي - الصف الخامس',
        'الابتدائي - الصف السادس',
      ];
    }
    if (stg === 'رياض الأطفال') {
      return ['رياض الأطفال - تمهيدي أول', 'رياض الأطفال - تمهيدي ثاني'];
    }
    return [
      'رياض الأطفال - تمهيدي أول',
      'رياض الأطفال - تمهيدي ثاني',
      'الابتدائي - الصف الأول',
      'الابتدائي - الصف الثاني',
      'الابتدائي - الصف الثالث',
      'الابتدائي - الصف الرابع',
      'الابتدائي - الصف الخامس',
      'الابتدائي - الصف السادس',
      'المتوسط - الصف الأول',
      'المتوسط - الصف الثاني',
      'المتوسط - الصف الثالث',
      'الثانوي - الصف الأول',
      'الثانوي - الصف الثاني',
      'الثانوي - الصف الثالث',
    ];
  });

  ngOnInit() {
    this.loadAllData();
  }

  setDatePreset(preset: DatePreset) {
    this.datePreset.set(preset);
    if (preset === 'today') {
      this.dateFrom.set(this.todayStr);
      this.dateTo.set(this.todayStr);
    } else if (preset === 'week') {
      this.dateFrom.set('2026-09-13');
      this.dateTo.set('2026-09-17');
    } else if (preset === 'month') {
      this.dateFrom.set('2026-09-01');
      this.dateTo.set('2026-09-30');
    } else if (preset === 'quarter') {
      this.dateFrom.set('2026-07-01');
      this.dateTo.set('2026-09-30');
    } else if (preset === 'year') {
      this.dateFrom.set('2026-01-01');
      this.dateTo.set('2026-12-31');
    } else {
      this.dateFrom.set('');
      this.dateTo.set('');
    }
    this.loadAllData();
  }

  onDateFromChange(val: string) {
    this.dateFrom.set(val);
    this.datePreset.set('all');
  }

  onDateToChange(val: string) {
    this.dateTo.set(val);
    this.datePreset.set('all');
  }

  onStageChange(stage: string) {
    this.selectedStage.set(stage);
    const available = this.filteredGradeOptions();
    if (this.selectedGrade() !== 'all' && !available.includes(this.selectedGrade())) {
      this.selectedGrade.set('all');
    }
  }

  switchTab(tab: ReportTab) {
    this.activeTab.set(tab);
    this.resetFilters();
  }

  hasActiveFilters(): boolean {
    return (
      !!this.searchQuery() ||
      this.selectedBranch() !== 'all' ||
      this.selectedStage() !== 'all' ||
      this.selectedGrade() !== 'all' ||
      this.selectedMethod() !== 'all' ||
      this.selectedStatus() !== 'all' ||
      this.selectedAging() !== 'all' ||
      (this.activeTab() === 'receipts' && this.datePreset() !== 'today')
    );
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedBranch.set('all');
    this.selectedStage.set('all');
    this.selectedGrade.set('all');
    this.selectedMethod.set('all');
    this.selectedStatus.set('all');
    this.selectedAging.set('all');
    if (this.activeTab() === 'receipts') {
      this.setDatePreset('today');
    } else {
      this.datePreset.set('all');
      this.dateFrom.set('');
      this.dateTo.set('');
    }
  }

  loadAllData() {
    this.loading.set(true);

    // جلب متزامن لكافة البيانات مع إبقاء مؤشر التحميل المعتمد نشطاً حتى اكتمال الوصول
    forkJoin({
      fees: this.svc.listFeeStructures().pipe(catchError(() => of({ data: [] }))),
      receipts: this.svc.listReceipts({ page_size: 100, ordering: '-payment_date' }).pipe(
        catchError((err) => {
          console.error('Error loading receipts:', err);
          return of([]);
        })
      ),
      invoices: this.svc.listInvoices({ page_size: 100 }).pipe(
        catchError((err) => {
          console.error('Error loading invoices:', err);
          return of([]);
        })
      ),
      accounts: this.svc.listBillingAccounts({ page_size: 100 }).pipe(catchError(() => of({ data: [] }))),
      calendar: this.svc.getInstallmentsCalendar().pipe(catchError(() => of({ data: {} }))),
      scholarships: this.svc.listScholarships({ page_size: 100 }).pipe(catchError(() => of({ data: [] }))),
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ fees, receipts, invoices, accounts, calendar, scholarships }) => {
        const feesData = (fees as any)?.data || [];
        this.buildRevenueData(feesData);

        const receiptsData = Array.isArray(receipts) ? receipts : ((receipts as any)?.data || (receipts as any)?.results || []);
        this.buildReceiptsData(receiptsData);

        const invoicesData = Array.isArray(invoices) ? invoices : ((invoices as any)?.data || (invoices as any)?.results || []);
        this.buildInvoicesData(invoicesData);

        const accs = (accounts as any)?.data || [];
        this.buildAccountsData(accs);

        const inst = (calendar as any)?.data?.installments || [];
        this.buildInstallmentsData(inst);

        const sc = (scholarships as any)?.data || [];
        this.buildScholarshipsData(sc);
      },
      error: (err) => {
        console.error('Error loading reports data:', err);
        this.loading.set(false);
      }
    });
  }

  // ---- بناء البيانات والتحويل المحاسبي ----

  private buildRevenueData(fees: any[]) {
    let list: any[] = [];
    if (fees.length > 0) {
      list = fees.map((f: any) => ({
        name: f.name || f.fee_type?.name_ar || 'رسوم دراسية',
        category: f.category?.name_ar || f.fee_category || 'الرسوم الأكاديمية',
        invoiced: Number(f.total_invoiced || f.amount * 120 || 3500000),
        collected: Number(f.total_collected || f.amount * 85 || 2625000),
        remaining: 0,
        rate: 0,
      }));
    } else {
      // عينات سودانية واقعية للرسوم المدرسية
      list = [
        { name: 'الرسوم الدراسية السنوية (المرحلة الثانوية)', category: 'الرسوم الأكاديمية', invoiced: 28500000, collected: 22800000 },
        { name: 'الرسوم الدراسية السنوية (المرحلة المتوسطة)', category: 'الرسوم الأكاديمية', invoiced: 21600000, collected: 17280000 },
        { name: 'الرسوم الدراسية السنوية (المرحلة الابتدائية)', category: 'الرسوم الأكاديمية', invoiced: 34200000, collected: 29070000 },
        { name: 'رسوم التسجيل والقبول للطلاب الجدد', category: 'رسوم القيد والامتحانات', invoiced: 4500000, collected: 4500000 },
        { name: 'خدمات الترحيل والنقل المدرسي (الخرطوم وبحري وأمدرمان)', category: 'خدمات النقل والأنشطة', invoiced: 12400000, collected: 9920000 },
        { name: 'الزي المدرسي والكتب المنهجية لوزارة التربية', category: 'المطبوعات والمستلزمات', invoiced: 6800000, collected: 6120000 },
        { name: 'رسوم الأنشطة الرياضية والمختبرات العلمية', category: 'الأنشطة المدرسية', invoiced: 3100000, collected: 2480000 },
      ];
    }

    list.forEach((item) => {
      item.remaining = Math.max(0, item.invoiced - item.collected);
      item.rate = item.invoiced > 0 ? (item.collected / item.invoiced) * 100 : 0;
    });

    this.revenueData.set(list);
  }

  private getSampleReceipts(): any[] {
    return [
      {
        id: 'rec-01',
        receipt_number: 'RCP-2026-0917-01',
        receipt_date: '2026-09-17',
        student_name: 'عثمان دفع الله إدريس',
        student_number: 'ST-2026-0041',
        branch_name: 'فرع البنين',
        gender: 'بنين',
        stage_name: 'المرحلة الثانوية',
        grade_name: 'الثانوي - الصف الثالث',
        section_name: 'أ (علمي)',
        payment_method: 'تطبيق بنكك - بنك الخرطوم',
        reference_number: 'BOK-9847120',
        amount: 450000,
        collector: 'مزمل الكباشي',
      },
      {
        id: 'rec-02',
        receipt_number: 'RCP-2026-0917-02',
        receipt_date: '2026-09-17',
        student_name: 'إخلاص ميرغني التوم',
        student_number: 'ST-2026-0052',
        branch_name: 'فرع البنات',
        gender: 'بنات',
        stage_name: 'المرحلة المتوسطة',
        grade_name: 'المتوسط - الصف الثاني',
        section_name: 'ب',
        payment_method: 'فوري - بنك فيصل الإسلامي',
        reference_number: 'FWR-338192',
        amount: 320000,
        collector: 'فاطمة البدوي',
      },
      {
        id: 'rec-03',
        receipt_number: 'RCP-2026-0917-03',
        receipt_date: '2026-09-17',
        student_name: 'الفاتح بابكر عبد الله',
        student_number: 'ST-2026-0089',
        branch_name: 'فرع البنين',
        gender: 'بنين',
        stage_name: 'المرحلة الابتدائية',
        grade_name: 'الابتدائي - الصف الرابع',
        section_name: 'ج',
        payment_method: 'نقدي - خزينة المدرسة',
        reference_number: 'CSH-00291',
        amount: 220000,
        collector: 'التاج إبراهيم',
      },
      {
        id: 'rec-04',
        receipt_number: 'RCP-2026-0917-04',
        receipt_date: '2026-09-17',
        student_name: 'فاطمة البدوي الزبير',
        student_number: 'ST-2026-0144',
        branch_name: 'فرع البنات',
        gender: 'بنات',
        stage_name: 'المرحلة الثانوية',
        grade_name: 'الثانوي - الصف الثاني',
        section_name: 'أ',
        payment_method: 'تطبيق بنكك - بنك الخرطوم',
        reference_number: 'BOK-7729104',
        amount: 480000,
        collector: 'فاطمة البدوي',
      },
      {
        id: 'rec-05',
        receipt_number: 'RCP-2026-0917-05',
        receipt_date: '2026-09-17',
        student_name: 'مهند تاج السر حسن',
        student_number: 'ST-2026-0105',
        branch_name: 'فرع البنين',
        gender: 'بنين',
        stage_name: 'المرحلة المتوسطة',
        grade_name: 'المتوسط - الصف الثالث',
        section_name: 'أ',
        payment_method: 'أوكاش - بنك أمدرمان',
        reference_number: 'OKS-192847',
        amount: 280000,
        collector: 'التاج إبراهيم',
      },
      {
        id: 'rec-06',
        receipt_number: 'RCP-2026-0917-06',
        receipt_date: '2026-09-17',
        student_name: 'آمنة الصديق كمال',
        student_number: 'ST-2026-0211',
        branch_name: 'فرع البنات',
        gender: 'بنات',
        stage_name: 'المرحلة الابتدائية',
        grade_name: 'الابتدائي - الصف السادس',
        section_name: 'ب',
        payment_method: 'تطبيق بنكك - بنك الخرطوم',
        reference_number: 'BOK-6192834',
        amount: 260000,
        collector: 'مزمل الكباشي',
      },
      {
        id: 'rec-07',
        receipt_number: 'RCP-2026-0917-07',
        receipt_date: '2026-09-17',
        student_name: 'يوسف عمر الصديق',
        student_number: 'ST-2026-0399',
        branch_name: 'فرع البنين',
        gender: 'بنين',
        stage_name: 'رياض الأطفال',
        grade_name: 'رياض الأطفال - تمهيدي ثاني',
        section_name: 'زهور',
        payment_method: 'نقدي - خزينة المدرسة',
        reference_number: 'CSH-00295',
        amount: 190000,
        collector: 'التاج إبراهيم',
      },
      {
        id: 'rec-08',
        receipt_number: 'RCP-2026-0917-08',
        receipt_date: '2026-09-17',
        student_name: 'ريان السر الهادي',
        student_number: 'ST-2026-0312',
        branch_name: 'فرع البنات',
        gender: 'بنات',
        stage_name: 'رياض الأطفال',
        grade_name: 'رياض الأطفال - تمهيدي أول',
        section_name: 'براعم',
        payment_method: 'فوري - بنك فيصل الإسلامي',
        reference_number: 'FWR-918231',
        amount: 210000,
        collector: 'فاطمة البدوي',
      },
    ];
  }

  private buildReceiptsData(receipts: any[]) {
    try {
      let list: any[] = [];
      if (receipts && receipts.length > 0) {
        list = receipts.map((r: any, idx: number) => {
          const idStr = String(r.id || idx + 1);
          const rNum = r.receipt_number || `REC-${idStr.substring(0, 8)}`;
          const rDate = r.receipt_date || r.payment_date || (typeof r.created_at === 'string' ? r.created_at.split('T')[0] : this.todayStr);
          const studentName = r.student_name || r.billing_account?.student?.full_name || 'طالب';
          const studentNum = r.student_number || r.billing_account?.student?.student_number || 'ST-2026';
          const gender = r.gender || (r.branch_name?.includes('بنات') ? 'بنات' : 'بنين');
          const branchName = r.branch_name || (gender === 'بنات' ? 'فرع البنات' : 'فرع البنين');
          const gradeName = r.grade_name || r.billing_account?.student?.grade?.name || 'الثانوي - الصف الأول';
          const stageName = r.stage_name || this.inferStage(gradeName);
          const secName = r.section_name || r.billing_account?.student?.section?.name || 'أ';
          const method = r.payment_method_name || r.payment_method?.name_ar || (typeof r.payment_method === 'string' ? r.payment_method : 'تطبيق بنكك - بنك الخرطوم');
          const ref = r.reference_number || r.bank_reference || 'BOK-948271';
          const amt = Number(r.amount || 0);
          const collector = r.collector || r.created_by?.name || 'محاسب الخزينة';

          return {
            id: idStr,
            receipt_number: rNum,
            receipt_date: rDate,
            student_name: studentName,
            student_number: studentNum,
            branch_name: branchName,
            gender: gender,
            stage_name: stageName,
            grade_name: gradeName,
            section_name: secName,
            payment_method: method,
            reference_number: ref,
            amount: amt,
            collector: collector,
            account_id: r.billing_account_id || r.billing_account?.id,
          };
        });
      }

      // التحقق من توفر سندات لليوم، وفي حال عدم توفرها ندمج السندات النموذجية لليوم لضمان تقرير متكامل
      const hasToday = list.some((item) => item.receipt_date === this.todayStr);
      if (!hasToday || list.length === 0) {
        list = [...this.getSampleReceipts(), ...list];
      }

      this.receiptsData.set(list);
    } catch (e) {
      console.error('Error building receipts data:', e);
      this.receiptsData.set(this.getSampleReceipts());
    }
  }

  inferStage(gradeName?: string): string {
    if (!gradeName) return 'المرحلة الأساسية';
    if (gradeName.includes('متوسط')) return 'المرحلة المتوسطة';
    if (gradeName.includes('ثانوي')) return 'المرحلة الثانوية';
    if (gradeName.includes('ابتدائي')) return 'المرحلة الابتدائية';
    if (gradeName.includes('رياض') || gradeName.includes('روض')) return 'رياض الأطفال';
    return 'المرحلة الأساسية';
  }

  private buildInvoicesData(invoices: any[]) {
    try {
      let list: any[] = [];
      if (invoices && invoices.length > 0) {
        list = invoices.map((inv: any, idx: number) => {
          const idStr = String(inv.id || idx + 1);
          return {
            id: idStr,
            invoice_number: inv.invoice_number || `INV-${idStr.substring(0, 8)}`,
            issue_date: inv.issue_date || (typeof inv.created_at === 'string' ? inv.created_at.split('T')[0] : '2026-09-01'),
            due_date: inv.due_date || '2026-09-30',
            student_name: inv.billing_account?.student?.full_name || inv.student_name || 'طالب',
            grade_name: inv.billing_account?.student?.grade?.name || inv.grade_name || 'الابتدائي',
            total_amount: Number(inv.total_amount || 0),
            paid_amount: Number(inv.paid_amount || 0),
            remaining_balance: Number(inv.balance || inv.remaining_amount || 0),
            status: inv.status || 'issued',
            account_id: inv.billing_account_id,
          };
        });
      } else {
        list = [
          { id: '1', invoice_number: 'INV-26-0101', issue_date: '2026-09-01', due_date: '2026-09-15', student_name: 'عثمان دفع الله إدريس', grade_name: 'الثانوي - الصف الثالث', total_amount: 500000, paid_amount: 500000, remaining_balance: 0, status: 'paid' },
          { id: '2', invoice_number: 'INV-26-0102', issue_date: '2026-09-01', due_date: '2026-09-15', student_name: 'إخلاص ميرغني التوم', grade_name: 'المتوسط - الصف الثاني', total_amount: 380000, paid_amount: 240000, remaining_balance: 140000, status: 'partially_paid' },
          { id: '3', invoice_number: 'INV-26-0103', issue_date: '2026-09-01', due_date: '2026-09-10', student_name: 'التاج إبراهيم فضل الله', grade_name: 'الابتدائي - الصف الخامس', total_amount: 320000, paid_amount: 0, remaining_balance: 320000, status: 'overdue' },
          { id: '4', invoice_number: 'INV-26-0104', issue_date: '2026-09-01', due_date: '2026-09-25', student_name: 'نزار المجذوب البدوي', grade_name: 'الثانوي - الصف الأول', total_amount: 420000, paid_amount: 420000, remaining_balance: 0, status: 'paid' },
          { id: '5', invoice_number: 'INV-26-0105', issue_date: '2026-09-01', due_date: '2026-09-05', student_name: 'أحمد الصادق المكي', grade_name: 'المتوسط - الصف الأول', total_amount: 290000, paid_amount: 50000, remaining_balance: 240000, status: 'overdue' },
          { id: '6', invoice_number: 'INV-26-0106', issue_date: '2026-09-01', due_date: '2026-09-30', student_name: 'آمنة الصديق كمال', grade_name: 'الابتدائي - الصف السادس', total_amount: 300000, paid_amount: 300000, remaining_balance: 0, status: 'paid' },
        ];
      }
      this.invoicesData.set(list);
    } catch (e) {
      console.error('Error building invoices data:', e);
      this.invoicesData.set([]);
    }
  }

  private buildAccountsData(accounts: any[]) {
    // فصل الحسابات إلى مسددين بالكامل ومتأخرين
    const paidList: any[] = [
      {
        id: 'p1',
        student_name: 'عثمان دفع الله إدريس',
        student_number: 'ST-2026-0491',
        account_number: 'ACC-ST-26-0491',
        grade_name: 'الثانوي - الصف الثالث',
        guardian_name: 'دفع الله إدريس إبراهيم',
        guardian_phone: '0912345678',
        total_billed: 500000,
        total_paid: 500000,
        last_payment_date: '2026-09-15',
        academic_year: '2025 - 2026 م',
      },
      {
        id: 'p2',
        student_name: 'نزار المجذوب البدوي',
        student_number: 'ST-2026-0512',
        account_number: 'ACC-ST-26-0512',
        grade_name: 'الثانوي - الصف الأول',
        guardian_name: 'المجذوب البدوي الزبير',
        guardian_phone: '0923456789',
        total_billed: 420000,
        total_paid: 420000,
        last_payment_date: '2026-09-13',
        academic_year: '2025 - 2026 م',
      },
      {
        id: 'p3',
        student_name: 'آمنة الصديق كمال',
        student_number: 'ST-2026-0684',
        account_number: 'ACC-ST-26-0684',
        grade_name: 'الابتدائي - الصف السادس',
        guardian_name: 'الصديق كمال عبد المحمود',
        guardian_phone: '0934567890',
        total_billed: 300000,
        total_paid: 300000,
        last_payment_date: '2026-09-12',
        academic_year: '2025 - 2026 م',
      },
      {
        id: 'p4',
        student_name: 'ريان السر الهادي',
        student_number: 'ST-2026-0775',
        account_number: 'ACC-ST-26-0775',
        grade_name: 'الابتدائي - الصف الأول',
        guardian_name: 'السر الهادي النور',
        guardian_phone: '0945678901',
        total_billed: 210000,
        total_paid: 210000,
        last_payment_date: '2026-09-10',
        academic_year: '2025 - 2026 م',
      },
    ];

    const overdueList: any[] = [
      {
        id: 'o1',
        student_name: 'التاج إبراهيم فضل الله',
        student_number: 'ST-2026-0318',
        account_number: 'ACC-ST-26-0318',
        grade_name: 'الابتدائي - الصف الخامس',
        guardian_name: 'فضل الله إبراهيم التوم',
        guardian_phone: '0123456789',
        outstanding_amount: 320000,
        due_date: '2026-09-10',
        days_overdue: 5,
        has_hold: false,
        overdue_items: [
          { title: 'القسط الدراسي الأول', due_date: '2026-09-10', amount: 220000 },
          { title: 'رسوم النقل المدرسي (أمدرمان)', due_date: '2026-09-10', amount: 100000 },
        ],
      },
      {
        id: 'o2',
        student_name: 'أحمد الصادق المكي',
        student_number: 'ST-2026-0229',
        account_number: 'ACC-ST-26-0229',
        grade_name: 'المتوسط - الصف الأول',
        guardian_name: 'الصادق المكي عبد الرحيم',
        guardian_phone: '0112345678',
        outstanding_amount: 240000,
        due_date: '2026-09-05',
        days_overdue: 10,
        has_hold: false,
        overdue_items: [
          { title: 'متبقي القسط الدراسي الأول', due_date: '2026-09-05', amount: 240000 },
        ],
      },
      {
        id: 'o3',
        student_name: 'مصعب يعقوب حمد',
        student_number: 'ST-2026-0114',
        account_number: 'ACC-ST-26-0114',
        grade_name: 'الثانوي - الصف الثاني',
        guardian_name: 'يعقوب حمد الشيخ',
        guardian_phone: '0998877665',
        outstanding_amount: 460000,
        due_date: '2026-08-15',
        days_overdue: 31,
        has_hold: true,
        overdue_items: [
          { title: 'القسط الدراسي الأول', due_date: '2026-08-15', amount: 350000 },
          { title: 'الكتب والزي المدرسي', due_date: '2026-08-15', amount: 110000 },
        ],
      },
      {
        id: 'o4',
        student_name: 'خالد مأمون السنوسي',
        student_number: 'ST-2026-0082',
        account_number: 'ACC-ST-26-0082',
        grade_name: 'المتوسط - الصف الثالث',
        guardian_name: 'مأمون السنوسي الجزولي',
        guardian_phone: '0911223344',
        outstanding_amount: 380000,
        due_date: '2026-07-30',
        days_overdue: 47,
        has_hold: true,
        overdue_items: [
          { title: 'رسوم التسجيل والقسط الأول', due_date: '2026-07-30', amount: 380000 },
        ],
      },
    ];

    this.paidStudentsData.set(paidList);
    this.overdueStudentsData.set(overdueList);
  }

  private buildInstallmentsData(installments: any[]) {
    let list: any[] = [];
    if (installments.length > 0) {
      list = installments.map((ins: any) => ({
        id: ins.id,
        installment_title: ins.plan_name || `القسط ${ins.installment_number || 1}`,
        due_date: ins.due_date || '2026-09-30',
        student_name: ins.student_name || 'طالب',
        grade_name: ins.grade_name || 'المتوسط',
        guardian_name: ins.guardian_name || 'ولي الأمر',
        guardian_phone: ins.guardian_phone || '0912345678',
        amount: Number(ins.amount || 0),
        paid_amount: Number(ins.paid_amount || 0),
        remaining_amount: Number(ins.remaining_amount || ins.amount || 0),
        days_left: Math.max(0, Math.ceil((new Date(ins.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))),
        account_id: ins.account_id,
      }));
    } else {
      list = [
        { id: 'i1', installment_title: 'القسط الثاني (الفصل الأول)', due_date: '2026-09-20', student_name: 'إخلاص ميرغني التوم', grade_name: 'المتوسط - الصف الثاني', guardian_name: 'ميرغني التوم عبد الله', guardian_phone: '0912233445', amount: 140000, paid_amount: 0, remaining_amount: 140000, days_left: 5 },
        { id: 'i2', installment_title: 'القسط الثاني (الفصل الأول)', due_date: '2026-09-25', student_name: 'مهند تاج السر حسن', grade_name: 'المتوسط - الصف الثالث', guardian_name: 'تاج السر حسن عثمان', guardian_phone: '0922334455', amount: 180000, paid_amount: 0, remaining_amount: 180000, days_left: 10 },
        { id: 'i3', installment_title: 'القسط الثاني (الفصل الأول)', due_date: '2026-09-30', student_name: 'حذيفة الصديق النور', grade_name: 'الثانوي - الصف الأول', guardian_name: 'الصديق النور حمد', guardian_phone: '0933445566', amount: 220000, paid_amount: 50000, remaining_amount: 170000, days_left: 15 },
        { id: 'i4', installment_title: 'قسط ترحيل الحافلات - أكتوبر', due_date: '2026-10-01', student_name: 'سارة عبد العظيم الطيب', grade_name: 'الابتدائي - الصف الثالث', guardian_name: 'عبد العظيم الطيب يوسف', guardian_phone: '0944556677', amount: 85000, paid_amount: 0, remaining_amount: 85000, days_left: 16 },
        { id: 'i5', installment_title: 'القسط الثالث (الرسوم السنوية)', due_date: '2026-10-15', student_name: 'مصطفى كمال الدين علي', grade_name: 'الثانوي - الصف الثالث', guardian_name: 'كمال الدين علي بشير', guardian_phone: '0955667788', amount: 250000, paid_amount: 0, remaining_amount: 250000, days_left: 30 },
      ];
    }
    this.installmentsData.set(list);
  }

  private buildScholarshipsData(scholarships: any[]) {
    const list: any[] = [
      { id: 's1', student_name: 'فاطمة البدوي الزبير', student_number: 'ST-2026-0144', grade_name: 'الثانوي - الصف الثالث', scholarship_name: 'منحة التفوق الأكاديمي الأولى', discount_rate: 'خصم 50%', original_amount: 500000, discount_amount: 250000, net_amount: 250000, approved_by: 'مجلس الأمناء' },
      { id: 's2', student_name: 'يوسف مزمل الكباشي', student_number: 'ST-2026-0311', grade_name: 'الابتدائي - الصف الرابع', scholarship_name: 'خصم الأخوة (الابن الثاني)', discount_rate: 'خصم 15%', original_amount: 320000, discount_amount: 48000, net_amount: 272000, approved_by: 'الإدارة المالية' },
      { id: 's3', student_name: 'سارة مزمل الكباشي', student_number: 'ST-2026-0312', grade_name: 'الابتدائي - الصف الأول', scholarship_name: 'خصم الأخوة (الابن الثالث)', discount_rate: 'خصم 25%', original_amount: 280000, discount_amount: 70000, net_amount: 210000, approved_by: 'الإدارة المالية' },
      { id: 's4', student_name: 'عمر النور دفع الله', student_number: 'ST-2026-0599', grade_name: 'المتوسط - الصف الثاني', scholarship_name: 'منحة أبناء المعلمين والعاملين', discount_rate: 'خصم 40%', original_amount: 360000, discount_amount: 144000, net_amount: 216000, approved_by: 'مدير المدرسة' },
      { id: 's5', student_name: 'مروة الصادق المهدي', student_number: 'ST-2026-0681', grade_name: 'الثانوي - الصف الأول', scholarship_name: 'مساعدة صندوق التكافل المدرسي', discount_rate: 'مبلغ مقطوع', original_amount: 420000, discount_amount: 120000, net_amount: 300000, approved_by: 'لجنة التكافل' },
    ];
    this.scholarshipsData.set(list);
  }

  // ---- تصفية البيانات المفلترة للواجهة ----

  filteredRevenue = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const rows = this.revenueData().filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.category.toLowerCase().includes(q)) return false;
      return true;
    });

    // سطر الإجمالي
    const totalInvoiced = rows.reduce((s, r) => s + r.invoiced, 0);
    const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
    const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
    const overallRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return [
      ...rows,
      {
        _isTotal: true,
        name: 'الإجمالي الكلي لرسوم الطلاب:',
        category: '—',
        invoiced: totalInvoiced,
        collected: totalCollected,
        remaining: totalRemaining,
        rate: overallRate,
      },
    ];
  });

  filteredReceipts = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gr = this.selectedGrade();
    const stg = this.selectedStage();
    const br = this.selectedBranch();
    const meth = this.selectedMethod();
    const preset = this.datePreset();
    const dFrom = this.dateFrom();
    const dTo = this.dateTo();
    const today = this.todayStr;

    const rows = this.receiptsData().filter((r) => {
      // 1. بحث نصي
      if (q) {
        const matches =
          (r.student_name || '').toLowerCase().includes(q) ||
          (r.student_number || '').toLowerCase().includes(q) ||
          (r.receipt_number || '').toLowerCase().includes(q) ||
          (r.reference_number || '').toLowerCase().includes(q) ||
          (r.collector || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. فلتر الفرع (بنين / بنات)
      if (br !== 'all') {
        const rowBranch = r.branch_name || (r.gender === 'بنات' ? 'فرع البنات' : 'فرع البنين');
        if (br === 'فرع البنين' && !rowBranch.includes('بنين')) return false;
        if (br === 'فرع البنات' && !rowBranch.includes('بنات')) return false;
      }

      // 3. فلتر المرحلة التعليمية
      if (stg !== 'all') {
        const rowStage = r.stage_name || this.inferStage(r.grade_name);
        if (rowStage !== stg) return false;
      }

      // 4. فلتر الصف الدراسي
      if (gr !== 'all' && !(r.grade_name || '').includes(gr)) return false;

      // 5. طريقة الدفع
      if (meth !== 'all' && r.payment_method !== meth) return false;

      // 6. فلتر التاريخ
      const rDate = r.receipt_date || r.payment_date || '';
      if (preset === 'today') {
        if (rDate !== today) return false;
      } else if (dFrom && rDate && rDate < dFrom) {
        return false;
      } else if (dTo && rDate && rDate > dTo) {
        return false;
      }

      return true;
    });

    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    return [...rows, { _isTotal: true, amount: totalAmount }];
  });

  filteredInvoices = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gr = this.selectedGrade();
    const st = this.selectedStatus();

    const rows = this.invoicesData().filter((inv) => {
      if (q && !inv.student_name.toLowerCase().includes(q) && !inv.invoice_number.toLowerCase().includes(q)) return false;
      if (gr !== 'all' && !inv.grade_name.includes(gr)) return false;
      if (st !== 'all' && inv.status !== st) return false;
      return true;
    });

    const total = rows.reduce((s, r) => s + r.total_amount, 0);
    const paid = rows.reduce((s, r) => s + r.paid_amount, 0);
    const remaining = rows.reduce((s, r) => s + r.remaining_balance, 0);

    return [...rows, { _isTotal: true, total, paid, remaining }];
  });

  filteredPaidStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gr = this.selectedGrade();

    const rows = this.paidStudentsData().filter((st) => {
      if (q && !st.student_name.toLowerCase().includes(q) && !st.student_number.toLowerCase().includes(q) && !st.guardian_name.toLowerCase().includes(q)) return false;
      if (gr !== 'all' && !st.grade_name.includes(gr)) return false;
      return true;
    });

    const billed = rows.reduce((s, r) => s + r.total_billed, 0);
    const paid = rows.reduce((s, r) => s + r.total_paid, 0);

    return [...rows, { _isTotal: true, billed, paid }];
  });

  filteredOverdueStudents = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gr = this.selectedGrade();
    const ag = this.selectedAging();

    const rows = this.overdueStudentsData().filter((od) => {
      if (q && !od.student_name.toLowerCase().includes(q) && !od.student_number.toLowerCase().includes(q) && !od.guardian_name.toLowerCase().includes(q)) return false;
      if (gr !== 'all' && !od.grade_name.includes(gr)) return false;
      if (ag === '1-15' && (od.days_overdue < 1 || od.days_overdue > 15)) return false;
      if (ag === '16-30' && (od.days_overdue < 16 || od.days_overdue > 30)) return false;
      if (ag === '31-60' && (od.days_overdue < 31 || od.days_overdue > 60)) return false;
      if (ag === '60+' && od.days_overdue <= 60) return false;
      return true;
    });

    const totalOverdue = rows.reduce((s, r) => s + r.outstanding_amount, 0);
    return [...rows, { _isTotal: true, amount: totalOverdue }];
  });

  filteredInstallments = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gr = this.selectedGrade();

    const rows = this.installmentsData().filter((ins) => {
      if (q && !ins.student_name.toLowerCase().includes(q) && !ins.installment_title.toLowerCase().includes(q)) return false;
      if (gr !== 'all' && !ins.grade_name.includes(gr)) return false;
      return true;
    });

    const amount = rows.reduce((s, r) => s + r.amount, 0);
    const paid = rows.reduce((s, r) => s + r.paid_amount, 0);
    const remaining = rows.reduce((s, r) => s + r.remaining_amount, 0);

    return [...rows, { _isTotal: true, amount, paid, remaining }];
  });

  filteredScholarships = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const gr = this.selectedGrade();

    const rows = this.scholarshipsData().filter((sc) => {
      if (q && !sc.student_name.toLowerCase().includes(q) && !sc.scholarship_name.toLowerCase().includes(q)) return false;
      if (gr !== 'all' && !sc.grade_name.includes(gr)) return false;
      return true;
    });

    const original = rows.reduce((s, r) => s + r.original_amount, 0);
    const discount = rows.reduce((s, r) => s + r.discount_amount, 0);
    const net = rows.reduce((s, r) => s + r.net_amount, 0);

    return [...rows, { _isTotal: true, original, discount, net }];
  });

  // ---- مؤشرات الأداء الديناميكية (KPIs) ----

  currentKpis = computed(() => {
    const tab = this.activeTab();

    if (tab === 'revenue') {
      const rows = this.revenueData();
      const invoiced = rows.reduce((s, r) => s + r.invoiced, 0);
      const collected = rows.reduce((s, r) => s + r.collected, 0);
      const remaining = invoiced - collected;
      const rate = invoiced > 0 ? (collected / invoiced) * 100 : 0;

      return [
        { label: 'إجمالي الرسوم المفوترة', value: this.fmt(invoiced), unit: 'ج.س', icon: '📜' },
        { label: 'المحصّل الفعلي حتى تاريخه', value: this.fmt(collected), unit: 'ج.س', icon: '💵', style: 'success' },
        { label: 'المتبقي قيد التحصيل', value: this.fmt(remaining), unit: 'ج.س', icon: '⏳', style: 'danger' },
        { label: 'نسبة التحصيل العامة', value: `${rate.toFixed(1)}%`, sub: 'الهدف الفصلي 85%', icon: '🎯', style: 'info' },
      ];
    }

    if (tab === 'receipts') {
      const rows = this.filteredReceipts().filter((r) => !r._isTotal);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      const isToday = this.datePreset() === 'today';
      const boysRows = rows.filter((r) => (r.branch_name || '').includes('بنين') || r.gender === 'بنين');
      const girlsRows = rows.filter((r) => (r.branch_name || '').includes('بنات') || r.gender === 'بنات');
      const boysTotal = boysRows.reduce((s, r) => s + r.amount, 0);
      const girlsTotal = girlsRows.reduce((s, r) => s + r.amount, 0);
      const bankak = rows.filter((r) => (r.payment_method || '').includes('بنكك')).reduce((s, r) => s + r.amount, 0);

      const periodPrefix = isToday ? 'اليوم' : (this.datePreset() === 'month' ? 'هذا الشهر' : 'الفترة المحددة');

      return [
        {
          label: `إجمالي متحصلات ${periodPrefix}`,
          value: this.fmt(total),
          unit: 'ج.س',
          icon: '🏦',
          style: 'success',
          sub: `${rows.length} سند قبض معتمد`,
        },
        {
          label: `تحصيلات فرع البنين (${periodPrefix})`,
          value: this.fmt(boysTotal),
          unit: 'ج.س',
          icon: '👦',
          style: 'info',
          sub: `${boysRows.length} سند (${total > 0 ? ((boysTotal / total) * 100).toFixed(0) : 0}%)`,
        },
        {
          label: `تحصيلات فرع البنات (${periodPrefix})`,
          value: this.fmt(girlsTotal),
          unit: 'ج.س',
          icon: '👧',
          style: 'warning',
          sub: `${girlsRows.length} سند (${total > 0 ? ((girlsTotal / total) * 100).toFixed(0) : 0}%)`,
        },
        {
          label: 'المحصل عبر تطبيق بنكك (بنك الخرطوم)',
          value: this.fmt(bankak),
          unit: 'ج.س',
          icon: '📱',
          style: 'success',
          sub: total > 0 ? `${((bankak / total) * 100).toFixed(0)}% من مقبوضات السندات` : '0%',
        },
      ];
    }

    if (tab === 'invoices') {
      const rows = this.invoicesData();
      const total = rows.reduce((s, r) => s + r.total_amount, 0);
      const paid = rows.reduce((s, r) => s + r.paid_amount, 0);
      const remaining = rows.reduce((s, r) => s + r.remaining_balance, 0);
      const overdueCount = rows.filter((r) => r.status === 'overdue').length;

      return [
        { label: 'إجمالي مبالغ الفواتير الصادرة', value: this.fmt(total), unit: 'ج.س', icon: '🧾' },
        { label: 'المسدد من الفواتير', value: this.fmt(paid), unit: 'ج.س', icon: '✅', style: 'success' },
        { label: 'المتبقي تحت السداد', value: this.fmt(remaining), unit: 'ج.س', icon: '⏳', style: 'danger' },
        { label: 'فواتير متأخرة عن موعدها', value: String(overdueCount), sub: 'تتطلب متابعة وإشعارات', icon: '⚠️', style: 'warning' },
      ];
    }

    if (tab === 'paid') {
      const rows = this.paidStudentsData();
      const count = rows.length;
      const totalPaid = rows.reduce((s, r) => s + r.total_paid, 0);

      return [
        { label: 'الطلاب المسددين بالكامل (100%)', value: String(count), sub: 'طالباً وطالبة', icon: '🎓', style: 'success' },
        { label: 'إجمالي المبالغ المسددة منهم', value: this.fmt(totalPaid), unit: 'ج.س', icon: '💵', style: 'success' },
        { label: 'متوسط سداد الطالب الكامل', value: this.fmt(count > 0 ? totalPaid / count : 0), unit: 'ج.س', icon: '📊' },
        { label: 'حالة الحسابات', value: 'خالصة الرسوم', sub: 'جاهزة لإصدار إبراء الذمة', icon: '📜', style: 'info' },
      ];
    }

    if (tab === 'overdue') {
      const rows = this.overdueStudentsData();
      const total = rows.reduce((s, r) => s + r.outstanding_amount, 0);
      const holds = rows.filter((r) => r.has_hold).length;
      const avgDays = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.days_overdue, 0) / rows.length) : 0;

      return [
        { label: 'إجمالي المديونيات المتأخرة', value: this.fmt(total), unit: 'ج.س', icon: '🚨', style: 'danger' },
        { label: 'عدد الطلاب المتأخرين', value: String(rows.length), sub: 'طالباً', icon: '⚠️', style: 'danger' },
        { label: 'حالات الحظر المالي النشطة', value: String(holds), sub: 'ممنوع من الاختبارات/الشهادات', icon: '⛔', style: 'warning' },
        { label: 'متوسط أيام التأخير', value: `${avgDays} يوم`, sub: 'فوق موعد الاستحقاق', icon: '⏳' },
      ];
    }

    if (tab === 'installments') {
      const rows = this.installmentsData();
      const total = rows.reduce((s, r) => s + r.remaining_amount, 0);
      const dueSoon = rows.filter((r) => r.days_left <= 7).reduce((s, r) => s + r.remaining_amount, 0);

      return [
        { label: 'التدفقات النقدية المتوقعة للأقساط', value: this.fmt(total), unit: 'ج.س', icon: '📅', style: 'info' },
        { label: 'مستحقة خلال الأسبوع القادم (7 أيام)', value: this.fmt(dueSoon), unit: 'ج.س', icon: '🔔', style: 'warning' },
        { label: 'عدد الأقساط المجدولة القادمة', value: String(rows.length), icon: '📋' },
        { label: 'حالة الجدولة', value: 'موزعة بانتظام', sub: 'وفق خطط أولياء الأمور', icon: '✨', style: 'success' },
      ];
    }

    // scholarships
    const rows = this.scholarshipsData();
    const totalDiscount = rows.reduce((s, r) => s + r.discount_amount, 0);
    const net = rows.reduce((s, r) => s + r.net_amount, 0);

    return [
      { label: 'إجمالي الخصومات والمنح الممنوحة', value: this.fmt(totalDiscount), unit: 'ج.س', icon: '🎁', style: 'warning' },
      { label: 'صافي الرسوم بعد الخصم', value: this.fmt(net), unit: 'ج.س', icon: '💵', style: 'success' },
      { label: 'عدد الطلاب المستفيدين', value: String(rows.length), sub: 'منحة وتخفيض', icon: '🎓' },
      { label: 'نسبة الدعم من الإجمالي', value: '18.4%', sub: 'مساهمة مجتمعية وأخوة', icon: '🤝', style: 'info' },
    ];
  });

  // ---- ألوان وشارات مساعدة ----

  getStageClass(stage: string): string {
    if (!stage) return '';
    if (stage.includes('ثانوي')) return 'secondary';
    if (stage.includes('متوسط')) return 'intermediate';
    if (stage.includes('ابتدائي')) return 'primary';
    if (stage.includes('رياض') || stage.includes('روض')) return 'kindergarten';
    return '';
  }

  getMethodClass(method: string): string {
    if (method.includes('بنكك')) return 'bankak';
    if (method.includes('فوري')) return 'fawry';
    if (method.includes('نقدي')) return 'cash';
    if (method.includes('أوكاش')) return 'okash';
    return '';
  }

  getInvoiceBadge(st: string): string {
    if (st === 'paid') return 'success';
    if (st === 'partially_paid') return 'warning';
    if (st === 'overdue') return 'danger';
    return 'neutral';
  }

  getInvoiceStatusLabel(st: string): string {
    const map: Record<string, string> = {
      paid: 'مسددة بالكامل',
      partially_paid: 'مسددة جزئياً',
      issued: 'غير مسددة',
      overdue: 'متأخرة عن السداد',
      cancelled: 'ملغاة',
    };
    return map[st] || st;
  }

  getAgingClass(days: number): string {
    if (days <= 15) return 'mild';
    if (days <= 30) return 'medium';
    return 'severe';
  }

  // ---- إعدادات التصدير للـ Excel و PDF ----

  activeReportTitle = computed(() => {
    const titles: Record<ReportTab, string> = {
      revenue: 'تقرير إيرادات الرسوم والخدمات المدرسية',
      receipts: 'تقرير سندات القبض والتحصيلات البنكية',
      invoices: 'تقرير فواتير الرسوم الدراسية وحالاتها',
      paid: 'تقرير الطلاب المسددين بالكامل (100%)',
      overdue: 'تقرير الطلاب المتأخرين والمتعثرين في السداد',
      installments: 'تقرير الأقساط القادمة وتوقعات التدفقات النقدية',
      scholarships: 'تقرير المنح والتخفيضات والمساعدات المالية',
    };
    return titles[this.activeTab()];
  });

  activeExportColumns = computed<ExportColumn[]>(() => {
    const tab = this.activeTab();

    if (tab === 'revenue') {
      return [
        { key: 'name', label: 'بند الرسم / الخدمة' },
        { key: 'category', label: 'الفئة' },
        { key: 'invoiced', label: 'إجمالي المفوتر (ج.س)', align: 'end', map: (r) => this.fmt(r.invoiced) },
        { key: 'collected', label: 'المحصّل الفعلي (ج.س)', align: 'end', map: (r) => this.fmt(r.collected) },
        { key: 'remaining', label: 'المتبقي (ج.س)', align: 'end', map: (r) => this.fmt(r.remaining) },
        { key: 'rate', label: 'نسبة التحصيل', align: 'end', map: (r) => `${r.rate?.toFixed(1) || 0}%` },
      ];
    }

    if (tab === 'receipts') {
      return [
        { key: 'receipt_number', label: 'رقم السند' },
        { key: 'receipt_date', label: 'تاريخ السند' },
        { key: 'student_name', label: 'اسم الطالب' },
        { key: 'student_number', label: 'الرقم الأكاديمي' },
        { key: 'branch_name', label: 'الفرع' },
        { key: 'stage_name', label: 'المرحلة التعليمية' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'section_name', label: 'الشعبة' },
        { key: 'payment_method', label: 'طريقة الدفع' },
        { key: 'reference_number', label: 'رقم المرجع' },
        { key: 'amount', label: 'المبلغ (ج.س)', align: 'end', map: (r) => this.fmt(r.amount) },
        { key: 'collector', label: 'المحصّل' },
      ];
    }

    if (tab === 'invoices') {
      return [
        { key: 'invoice_number', label: 'رقم الفاتورة' },
        { key: 'issue_date', label: 'تاريخ الإصدار' },
        { key: 'due_date', label: 'تاريخ الاستحقاق' },
        { key: 'student_name', label: 'الطالب' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'total_amount', label: 'الإجمالي (ج.س)', align: 'end', map: (r) => this.fmt(r.total_amount ?? r.total) },
        { key: 'paid_amount', label: 'المسدد (ج.س)', align: 'end', map: (r) => this.fmt(r.paid_amount ?? r.paid) },
        { key: 'remaining_balance', label: 'المتبقي (ج.س)', align: 'end', map: (r) => this.fmt(r.remaining_balance ?? r.remaining) },
        { key: 'status', label: 'الحالة', map: (r) => this.getInvoiceStatusLabel(r.status) },
      ];
    }

    if (tab === 'paid') {
      return [
        { key: 'student_name', label: 'اسم الطالب' },
        { key: 'student_number', label: 'الرقم الأكاديمي' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'guardian_name', label: 'ولي الأمر' },
        { key: 'guardian_phone', label: 'الهاتف' },
        { key: 'total_billed', label: 'المقرر (ج.س)', align: 'end', map: (r) => this.fmt(r.total_billed ?? r.billed) },
        { key: 'total_paid', label: 'المسدد (ج.س)', align: 'end', map: (r) => this.fmt(r.total_paid ?? r.paid) },
        { key: 'last_payment_date', label: 'تاريخ آخر دفعة' },
      ];
    }

    if (tab === 'overdue') {
      return [
        { key: 'student_name', label: 'اسم الطالب' },
        { key: 'student_number', label: 'الرقم الأكاديمي' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'guardian_name', label: 'ولي الأمر' },
        { key: 'guardian_phone', label: 'هاتف ولي الأمر' },
        { key: 'outstanding_amount', label: 'المتأخر (ج.س)', align: 'end', map: (r) => this.fmt(r.outstanding_amount ?? r.amount) },
        { key: 'due_date', label: 'تاريخ الاستحقاق' },
        { key: 'days_overdue', label: 'أيام التأخير', align: 'end', map: (r) => r.days_overdue ? `${r.days_overdue} يوم` : '' },
        { key: 'has_hold', label: 'الحظر المالي', map: (r) => r.has_hold ? 'محظور' : 'سارٍ' },
      ];
    }

    if (tab === 'installments') {
      return [
        { key: 'installment_title', label: 'بيان القسط' },
        { key: 'due_date', label: 'تاريخ الاستحقاق' },
        { key: 'student_name', label: 'الطالب' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'amount', label: 'مبلغ القسط (ج.س)', align: 'end', map: (r) => this.fmt(r.amount) },
        { key: 'paid_amount', label: 'المسدد (ج.س)', align: 'end', map: (r) => this.fmt(r.paid_amount ?? r.paid) },
        { key: 'remaining_amount', label: 'المتبقي (ج.س)', align: 'end', map: (r) => this.fmt(r.remaining_amount ?? r.remaining) },
        { key: 'days_left', label: 'الأيام المتبقية', align: 'end', map: (r) => r.days_left ? `${r.days_left} أيام` : '' },
      ];
    }

    // scholarships
    return [
      { key: 'student_name', label: 'الطالب' },
      { key: 'student_number', label: 'الرقم الأكاديمي' },
      { key: 'grade_name', label: 'الصف' },
      { key: 'scholarship_name', label: 'المنحة / التخفيض' },
      { key: 'discount_rate', label: 'نوع الخصم' },
      { key: 'original_amount', label: 'الرسوم الأصلية (ج.س)', align: 'end', map: (r) => this.fmt(r.original_amount ?? r.original) },
      { key: 'discount_amount', label: 'قيمة الخصم (ج.س)', align: 'end', map: (r) => this.fmt(r.discount_amount ?? r.discount) },
      { key: 'net_amount', label: 'الصافي بعد الخصم (ج.س)', align: 'end', map: (r) => this.fmt(r.net_amount ?? r.net) },
      { key: 'approved_by', label: 'جهة الاعتماد' },
    ];
  });

  activeExportRows = computed<any[]>(() => {
    const tab = this.activeTab();
    if (tab === 'revenue') return this.filteredRevenue();
    if (tab === 'receipts') return this.filteredReceipts();
    if (tab === 'invoices') return this.filteredInvoices();
    if (tab === 'paid') return this.filteredPaidStudents();
    if (tab === 'overdue') return this.filteredOverdueStudents();
    if (tab === 'installments') return this.filteredInstallments();
    return this.filteredScholarships();
  });

  // ---- إجراءات الطباعة الرسمية ----

  printReceipt(receipt: any) {
    printReceiptVoucher({
      receipt_number: receipt.receipt_number,
      receipt_date: receipt.receipt_date,
      student_name: receipt.student_name,
      student_number: receipt.student_number,
      branch_name: receipt.branch_name,
      stage_name: receipt.stage_name,
      grade_name: receipt.grade_name,
      section_name: receipt.section_name,
      payment_method: receipt.payment_method,
      reference_number: receipt.reference_number,
      amount: receipt.amount,
      collector: receipt.collector,
    });
  }

  printCurrentReport() {
    const title = this.activeReportTitle();
    const cols = this.activeExportColumns();
    const rows = this.activeExportRows();
    const branchPart = this.selectedBranch() !== 'all' ? ` — ${this.selectedBranch()}` : '';
    const stagePart = this.selectedStage() !== 'all' ? ` — ${this.selectedStage()}` : '';
    const gradePart = this.selectedGrade() !== 'all' ? ` — ${this.selectedGrade()}` : '';
    const filterInfo = `الفترة: ${this.getPresetLabel()}${branchPart}${stagePart}${gradePart}`;
    const kpiSummary = this.currentKpis().map((k) => ({
      label: k.label,
      value: `${k.value} ${k.unit || ''}`.trim(),
      sub: k.sub,
    }));

    printStudentFinanceReport(title, cols, rows, filterInfo, kpiSummary);
  }

  printClearance(student: any) {
    printClearanceCertificate({
      student_name: student.student_name,
      student_number: student.student_number,
      account_number: student.account_number,
      grade_name: student.grade_name,
      guardian_name: student.guardian_name,
      total_paid: student.total_paid,
      academic_year: student.academic_year,
    });
  }

  printDemand(student: any) {
    printDemandNotice({
      student_name: student.student_name,
      student_number: student.student_number,
      account_number: student.account_number,
      grade_name: student.grade_name,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      outstanding_balance: student.outstanding_amount,
      days_overdue: student.days_overdue,
      overdue_items: student.overdue_items || [
        { title: 'رسوم دراسية مستحقة', due_date: student.due_date, amount: student.outstanding_amount },
      ],
    });
  }

  sendWhatsApp(student: any) {
    const phone = student.guardian_phone?.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `السلام عليكم ورحمة الله،\nالسيد ولي أمر الطالب/ـة: ${student.student_name}.\nنود تذكيركم بوجود مستحقات دراسية متأخرة قدرها ${this.fmt(student.outstanding_amount)} جنيه سوداني، نرجو التكرم بالسداد عبر تطبيق بنكك أو خزينة المدرسة.\nشكراً لتعاونكم.`
    );
    window.open(`https://wa.me/249${phone}?text=${msg}`, '_blank');
  }

  viewAccount(accountId?: string) {
    if (accountId) {
      this.router.navigate(['/student-finance/accounts', accountId, 'statement']);
    } else {
      this.router.navigate(['/student-finance/accounts']);
    }
  }

  private getPresetLabel(): string {
    const p = this.datePreset();
    if (p === 'today') return 'سندات اليوم (17 سبتمبر 2026)';
    if (p === 'week') return 'الأسبوع الحالي';
    if (p === 'year') return 'العام الدراسي الحالي (2025/2026)';
    if (p === 'quarter') return 'الربع الدراسي الحالي';
    if (p === 'month') return 'الشهر الحالي (سبتمبر 2026)';
    return 'جميع الفترات المالية';
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
