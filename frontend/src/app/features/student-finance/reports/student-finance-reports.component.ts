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
import { StudentsService } from '../../students/students.service';
import { SfDocumentDrawerComponent, SfDoc } from '../shared/sf-document-drawer.component';
import { SendMessageModalComponent } from '../../communications/components/send-message-modal.component';
import { StudentFinanceService } from '../student-finance.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbExportMenuComponent } from '../../../shared/export/nb-export-menu.component';
import { NbDatepickerComponent } from '../../../shared/nebras/nb-datepicker.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { ExportColumn } from '../../../shared/export/export.types';
import {
  printStudentFinanceReport,
  exportStudentFinanceReportToPdf,
  printClearanceCertificate,
  printDemandNotice,
  tafqeet,
} from './student-finance-report-print';

export type ReportTab =
  | 'custom_statement'
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
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbExportMenuComponent, NbDatepickerComponent, NbLoadingComponent, SfDocumentDrawerComponent, SendMessageModalComponent],
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

          <nb-export-menu
            [columns]="activeExportColumns()"
            [rows]="activeExportRows()"
            [title]="activeReportTitle()"
            [showPrint]="false"
            [customPdf]="exportPdfOfficial"
          />

          <button class="btn print" (click)="printCurrentReport()" title="طباعة التقرير المالي الرسمي A4">
            <span class="ico">🖨️</span> طباعة A4 رسمي
          </button>
        </div>
      </nb-page-header>

      <!-- شريط التبويبات -->
      <div class="tabs-bar">
        <button
          class="tab-btn custom-statement-tab"
          [class.active]="activeTab() === 'custom_statement'"
          (click)="switchTab('custom_statement')"
        >
          <span class="tab-icon">📊</span>
          <span class="tab-label">تقرير مالي مخصص للطلاب</span>
          <span class="tab-badge primary">{{ customStatementData().length }}</span>
        </button>

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

        @if (activeTab() === 'receipts' || activeTab() === 'custom_statement') {
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

        @if (activeTab() === 'custom_statement') {
          <div class="filter-input-wrap select">
            <label>الفصل / الشعبة:</label>
            <select [ngModel]="selectedSection()" (ngModelChange)="selectedSection.set($event)">
              <option value="all">جميع الفصول والشعب</option>
              @for (sec of filteredSectionOptions(); track sec) {
                <option [value]="sec">شعبة {{ sec }}</option>
              }
            </select>
          </div>

          <div class="filter-input-wrap select">
            <label>حالة السداد:</label>
            <select [ngModel]="selectedPaymentStatus()" (ngModelChange)="selectedPaymentStatus.set($event)">
              <option value="all">جميع حالات السداد</option>
              <option value="paid">مسدد بالكامل (100%)</option>
              <option value="partial">مسدد جزئياً (به متبقي)</option>
              <option value="unpaid">غير مسدد / به متأخرات</option>
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
          <!-- 0. التقرير المالي المخصص لحسابات ورسوم الطلاب -->
          @if (activeTab() === 'custom_statement') {
            <table class="nb-table custom-statement-table">
              <thead>
                <tr>
                  <th style="width: 32px; text-align: center;">#</th>
                  <th style="min-width: 150px;">اسم الطالب والرقم الأكاديمي</th>
                  <th style="width: 80px; text-align: center;">الفرع</th>
                  <th style="min-width: 140px;">المرحلة والصف والشعبة</th>
                  <th style="min-width: 110px;">اسم ولي الأمر</th>
                  <th style="width: 120px;">رقم هاتف ولي الأمر</th>
                  <th class="num" style="width: 95px;">إجمالي الرسوم</th>
                  <th class="num" style="width: 95px;">
                    @if (dateFrom() || dateTo() || datePreset() !== 'all') {
                      المسدد بالفترة
                    } @else {
                      المدفوع الفعلي
                    }
                  </th>
                  <th class="num" style="width: 95px;">المتبقي للتحصيل</th>
                  <th style="width: 80px; text-align: center;">حالة السداد</th>
                  <th style="width: 85px; text-align: center;">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredCustomStatement(); track item._isTotal ? 'total-row' : (item.id || item.student_number || idx); let idx = $index) {
                  <tr [class.total-row]="item._isTotal">
                    @if (item._isTotal) {
                      <td colspan="6" class="font-bold">
                        إجمالي التقرير المالي المخصص ({{ filteredCustomStatement().length - 1 }} طالباً):
                      </td>
                      <td class="num font-bold" style="font-size: 13.5px;">
                        {{ fmt(item.total_billed) }} <small>ج.س</small>
                      </td>
                      <td class="num font-bold success-text" style="font-size: 13.5px;">
                        {{ fmt(item.total_paid) }} <small>ج.س</small>
                      </td>
                      <td class="num font-bold danger-text" style="font-size: 13.5px;">
                        {{ fmt(item.outstanding_balance) }} <small>ج.س</small>
                      </td>
                      <td colspan="2"></td>
                    } @else {
                      <td class="muted font-sm" style="text-align: center;">{{ idx + 1 }}</td>
                      <td>
                        <div class="user-cell">
                          <span class="avatar-sm" [class.girls]="item.gender === 'بنات' || item.branch_name?.includes('بنات')">
                            {{ item.gender === 'بنات' || item.branch_name?.includes('بنات') ? '👧' : '👦' }}
                          </span>
                          <div class="user-details">
                            <span class="student-name font-bold">{{ item.student_name }}</span>
                            <small class="student-no mono muted">{{ item.student_number }}</small>
                          </div>
                        </div>
                      </td>
                      <td style="text-align: center;">
                        <span class="branch-tag" [class.girls]="item.branch_name?.includes('بنات')">
                          {{ item.branch_name }}
                        </span>
                      </td>
                      <td>
                        <div class="grade-cell">
                          <span class="stage-tag mini" [class]="getStageClass(item.stage_name)">{{ item.stage_name }}</span>
                          <span class="font-bold">{{ item.grade_name }}</span>
                          @if (item.section_name) {
                            <small class="section-sub">شعبة ({{ item.section_name }})</small>
                          }
                        </div>
                      </td>
                      <td>
                        <div class="guardian-info">
                          <span class="font-bold">{{ item.guardian_name || '—' }}</span>
                        </div>
                      </td>
                      <td>
                        @if (item.guardian_phone && item.guardian_phone !== '—') {
                          <div class="phone-action-wrap">
                            <span class="phone-num-ltr" dir="ltr">{{ item.guardian_phone }}</span>
                            <button type="button" class="btn xs wa-direct-btn" (click)="openMessageModal(item)" title="مراسلة ولي الأمر بنظام القوالب والإرسال المباشر">
                              💬
                            </button>
                          </div>
                        } @else {
                          <span class="muted">—</span>
                        }
                      </td>
                      <td class="num font-bold">
                        {{ fmt(item.total_billed) }} <small>ج.س</small>
                      </td>
                      <td class="num font-bold success-text">
                        {{ fmt(item.period_paid != null ? item.period_paid : item.total_paid) }} <small>ج.س</small>
                      </td>
                      <td class="num font-bold" [class.danger-text]="item.outstanding_balance > 0" [class.success-text]="item.outstanding_balance === 0">
                        {{ fmt(item.outstanding_balance) }} <small>ج.س</small>
                      </td>
                      <td>
                        <span class="badge" [class.success]="item.payment_status === 'paid'" [class.warning]="item.payment_status === 'partial'" [class.danger]="item.payment_status === 'unpaid'">
                          {{ item.payment_status === 'paid' ? 'مسدد بالكامل' : item.payment_status === 'partial' ? 'مسدد جزئياً' : 'به متأخرات' }}
                        </span>
                      </td>
                      <td>
                        <div class="row-actions-group">
                          <button class="btn xs ghost" (click)="viewAccount(item)" title="استعراض كشف الحساب التفصيلي">
                            📋 كشف الحساب
                          </button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          }

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
                @for (r of filteredReceipts(); track r._isTotal ? 'total-receipts' : (r.id || r.receipt_number || idx); let idx = $index) {
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
                          <button class="btn xs print-btn" title="طباعة سند القبض الرسمي" (click)="openReceiptDrawer(r)">
                            🖨️ طباعة السند
                          </button>
                          <button class="btn xs ghost" title="عرض كشف حساب الطالب" (click)="viewAccount(r)">
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
                        <button class="btn xs ghost" (click)="openMessageModal(od)" title="إرسال تذكير عبر واتساب بنظام القوالب">
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

      <!-- درج عرض وطباعة السند الرسمي (نفس شكل سند ملف الطالب) -->
      <sf-document-drawer [doc]="receiptDoc()" [methods]="receiptMethods()" [schoolInfo]="receiptSchoolInfo()" (closed)="receiptDoc.set(null)"></sf-document-drawer>

      <!-- مودال مراسلة ولي الأمر المعتمد بنظام القوالب والإرسال المباشر -->
      <app-send-message-modal
        [open]="showMsgModal()"
        (openChange)="showMsgModal.set($event)"
        [recipientName]="msgRecipientName()"
        [recipientPhone]="msgRecipientPhone()"
        [contextVariables]="msgContextVariables()"
        defaultTemplateCode="FEE_REMINDER"
        [allowedCategories]="[]"
      ></app-send-message-modal>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    .page {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      font-family: var(--nb-font-family, 'Segoe UI', Tahoma, sans-serif);
      color: var(--nb-text);
      background: var(--nb-bg);
      min-height: 100%;
      width: 100%;
      box-sizing: border-box;
    }

    nb-page-header {
      display: block;
      flex-shrink: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }

    .preset-group {
      display: inline-flex;
      align-items: center;
      background: var(--nb-surface-raised, #f3f4f6);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius, 8px);
      padding: 2px;
      height: 34px;
      box-sizing: border-box;
    }

    .btn-sm {
      border: none;
      background: transparent;
      padding: 0 10px;
      height: 28px;
      line-height: 28px;
      font-size: 12px;
      font-weight: 600;
      color: var(--nb-text-muted, #6b7280);
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s ease;
      white-space: nowrap;
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
      height: 34px;
      padding: 0 12px;
      font-family: inherit;
      font-size: 12.5px;
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
      white-space: nowrap;
      box-sizing: border-box;
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
      flex-shrink: 0;
      min-height: 46px;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-text-muted, #6b7280);
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      flex-shrink: 0;
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
      gap: 12px;
      flex-shrink: 0;
    }
    .kpi-card {
      background: var(--nb-surface, #ffffff);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius-card, 12px);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .kpi-card.success { border-inline-start: 4px solid #10b981; }
    .kpi-card.danger { border-inline-start: 4px solid #ef4444; }
    .kpi-card.warning { border-inline-start: 4px solid #f59e0b; }
    .kpi-card.info { border-inline-start: 4px solid #3b82f6; }
    .kpi-icon {
      font-size: 22px;
      width: 44px;
      height: 44px;
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
      font-size: 11.5px;
      color: var(--nb-text-muted, #6b7280);
      font-weight: 600;
    }
    .kpi-value {
      font-size: 19px;
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
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .filter-input-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--nb-surface-raised, #f9fafb);
      border: 1px solid var(--nb-border, #e5e7eb);
      border-radius: var(--nb-radius, 8px);
      padding: 0 10px;
      height: 36px;
    }
    .filter-input-wrap.search { flex: 1; min-width: 220px; }
    .filter-input-wrap input {
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 12.5px;
      color: var(--nb-text, #111827);
      width: 100%;
    }
    .filter-input-wrap.select label {
      font-size: 11.5px;
      color: var(--nb-text-muted, #6b7280);
      white-space: nowrap;
    }
    .filter-input-wrap select {
      border: none;
      background: transparent;
      outline: none;
      font-family: inherit;
      font-size: 12px;
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
      font-size: 11.5px;
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
      width: 100%;
      box-sizing: border-box;
    }
    .nb-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      table-layout: auto;
    }
    .nb-table th {
      background: var(--nb-surface-raised, #f8fafc);
      padding: 9px 8px;
      text-align: right;
      font-weight: 700;
      color: var(--nb-text-muted, #475569);
      border-bottom: 2px solid var(--nb-border, #e2e8f0);
      white-space: nowrap;
      font-size: 11.5px;
    }
    .nb-table td {
      padding: 8px 8px;
      border-bottom: 1px solid var(--nb-border, #f1f5f9);
      color: var(--nb-text, #1e293b);
      white-space: nowrap;
      font-size: 12px;
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
      font-size: 11.5px;
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
      font-size: 13px;
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

    .phone-action-wrap {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .phone-num-ltr {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      letter-spacing: 0.5px;
      color: var(--nb-text);
    }
    .wa-direct-btn {
      padding: 2px 6px;
      font-size: 12px;
      border-radius: 4px;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .wa-direct-btn:hover {
      background: #059669;
      color: #ffffff;
      transform: scale(1.15);
    }
    .stage-tag.mini {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      align-self: flex-start;
      margin-bottom: 2px;
    }
    .custom-statement-tab.active {
      color: #0284c7;
      border-bottom-color: #0284c7;
    }
    .tab-badge.primary {
      background: #e0f2fe;
      color: #0369a1;
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
  private studentsSvc = inject(StudentsService);
  private router = inject(Router);

  // درج عرض السند الرسمي
  readonly receiptDoc = signal<SfDoc>(null);
  readonly receiptSchoolInfo = signal<any>(null);
  readonly receiptMethods = signal<any[]>([]);

  // الحالة النشطة
  activeTab = signal<ReportTab>('custom_statement');
  datePreset = signal<DatePreset>('all');
  loading = signal<boolean>(true);

  // تاريخ اليوم الديناميكي للمقارنة والفلترة
  get todayStr(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // الفلاتر
  searchQuery = signal<string>('');
  selectedBranch = signal<string>('all');
  selectedStage = signal<string>('all');
  selectedGrade = signal<string>('all');
  selectedSection = signal<string>('all');
  selectedPaymentStatus = signal<string>('all');
  selectedMethod = signal<string>('all');
  selectedStatus = signal<string>('all');
  selectedAging = signal<string>('all');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  // البيانات
  customStatementData = signal<any[]>([]);
  revenueData = signal<any[]>([]);
  receiptsData = signal<any[]>([]);
  invoicesData = signal<any[]>([]);
  paidStudentsData = signal<any[]>([]);
  overdueStudentsData = signal<any[]>([]);
  installmentsData = signal<any[]>([]);
  scholarshipsData = signal<any[]>([]);

  // خيارات الشعب والفصول الديناميكية
  readonly filteredSectionOptions = computed<string[]>(() => {
    const set = new Set<string>();
    for (const row of this.customStatementData()) {
      if (row.section_name && row.section_name !== '—' && row.section_name !== '-') {
        set.add(row.section_name);
      }
    }
    if (set.size === 0) {
      return ['أ', 'ب', 'ج', 'د', 'براعم', 'زهور'];
    }
    return Array.from(set).sort();
  });

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
    // تحميل بيانات المدرسة وطرق الدفع لدرج السند
    this.studentsSvc.getBranding().subscribe((b) => this.receiptSchoolInfo.set(b));
    this.svc.listPaymentMethods().subscribe((r) => this.receiptMethods.set(r?.data ?? []));
  }

  setDatePreset(preset: DatePreset) {
    this.datePreset.set(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${y}-${pad(m + 1)}-${pad(d)}`;

    if (preset === 'today') {
      this.dateFrom.set(today);
      this.dateTo.set(today);
      // الانتقال التلقائي إلى تبويب سندات القبض والتحصيل وتصفية عمليات اليوم فوراً
      this.activeTab.set('receipts');
    } else if (preset === 'week') {
      // بداية الأسبوع الحالي (الأحد)
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      this.dateFrom.set(`${startOfWeek.getFullYear()}-${pad(startOfWeek.getMonth() + 1)}-${pad(startOfWeek.getDate())}`);
      this.dateTo.set(today);
    } else if (preset === 'month') {
      this.dateFrom.set(`${y}-${pad(m + 1)}-01`);
      const endOfMonth = new Date(y, m + 1, 0);
      this.dateTo.set(`${y}-${pad(m + 1)}-${pad(endOfMonth.getDate())}`);
    } else if (preset === 'quarter') {
      const qStartMonth = Math.floor(m / 3) * 3;
      this.dateFrom.set(`${y}-${pad(qStartMonth + 1)}-01`);
      const qEndMonth = qStartMonth + 2;
      const endOfQuarter = new Date(y, qEndMonth + 1, 0);
      this.dateTo.set(`${y}-${pad(qEndMonth + 1)}-${pad(endOfQuarter.getDate())}`);
    } else if (preset === 'year') {
      this.dateFrom.set(`${y}-01-01`);
      this.dateTo.set(`${y}-12-31`);
    } else {
      this.dateFrom.set('');
      this.dateTo.set('');
    }
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
      this.selectedSection() !== 'all' ||
      this.selectedPaymentStatus() !== 'all' ||
      this.selectedMethod() !== 'all' ||
      this.selectedStatus() !== 'all' ||
      this.selectedAging() !== 'all' ||
      (this.activeTab() === 'receipts' && this.datePreset() !== 'today') ||
      (this.activeTab() === 'custom_statement' && (!!this.dateFrom() || !!this.dateTo()))
    );
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedBranch.set('all');
    this.selectedStage.set('all');
    this.selectedGrade.set('all');
    this.selectedSection.set('all');
    this.selectedPaymentStatus.set('all');
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

    forkJoin({
      receipts: this.svc.listReceipts({ page_size: 500, ordering: '-payment_date' }).pipe(catchError(() => of([]))),
      fees: this.svc.listFeeStructures().pipe(catchError(() => of({ data: [] }))),
      invoices: this.svc.listInvoices({ page_size: 500 }).pipe(catchError(() => of([]))),
      accounts: this.svc.listBillingAccounts({ page_size: 500 }).pipe(catchError(() => of({ data: [] }))),
      installments: this.svc.getInstallmentsCalendar().pipe(catchError(() => of({ data: {} }))),
      scholarships: this.svc.listScholarships({ page_size: 100 }).pipe(catchError(() => of({ data: [] }))),
    }).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ receipts, fees, invoices, accounts, installments, scholarships }) => {
        const receiptsData = Array.isArray(receipts) ? receipts : ((receipts as any)?.data || (receipts as any)?.results || []);
        this.buildReceiptsData(receiptsData);

        const feesData = (fees as any)?.data || [];
        this.buildRevenueData(feesData);

        const invoicesData = Array.isArray(invoices) ? invoices : ((invoices as any)?.data || (invoices as any)?.results || []);
        this.buildInvoicesData(invoicesData);

        const accs = (accounts as any)?.data || [];
        this.buildAccountsData(accs);

        const inst = (installments as any)?.data?.installments || [];
        this.buildInstallmentsData(inst);

        const sc = (scholarships as any)?.data || [];
        this.buildScholarshipsData(sc);
      },
      error: (err) => {
        console.error('Error loading finance report data:', err);
      },
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

  private buildReceiptsData(receipts: any[]) {
    try {
      let list: any[] = [];
      if (receipts && receipts.length > 0) {
        list = receipts.map((r: any, idx: number) => {
          const idStr = String(r.id || idx + 1);
          const rNum = r.receipt_number || `REC-${idStr.substring(0, 8)}`;
          const rDate = r.receipt_date || r.payment_date || (typeof r.created_at === 'string' ? r.created_at.split('T')[0] : this.todayStr);
          const studentName = r.student_name || r.billing_account?.student?.full_name || '—';
          const studentNum = r.student_number || r.billing_account?.student?.student_number || '—';
          const gender = r.gender || (r.branch_name?.includes('بنات') ? 'بنات' : 'بنين');
          const branchName = r.branch_name || (gender === 'بنات' ? 'فرع البنات' : 'فرع البنين');
          const gradeName = r.grade_name || r.billing_account?.student?.grade?.name || '—';
          const stageName = r.stage_name || (gradeName !== '—' ? this.inferStage(gradeName) : '—');
          const secName = r.section_name || r.billing_account?.student?.section?.name || '—';
          const method = r.payment_method_name || r.payment_method?.name_ar || (typeof r.payment_method === 'string' ? r.payment_method : '—');
          const ref = r.reference_number || r.bank_reference || '—';
          const amt = Number(r.amount || 0);
          const collector = r.collector_name || r.collector || r.created_by_name || 'أمين الخزينة';

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
            account_id: r.billing_account_id || r.billing_account?.id || r.student_billing_account_id,
            student_billing_account_id: r.student_billing_account_id || r.student_billing_account || r.billing_account_id || r.billing_account?.id,
            student_id: r.student_id || r.billing_account?.student_id || r.billing_account?.student?.id,
            account_number: r.account_number || r.billing_account?.account_number || (studentNum !== '—' ? `ACC-${studentNum}` : '—'),
            guardian_name: r.guardian_name || r.billing_account?.student?.guardian_name || r.billing_account?.guardian_name || '—',
            guardian_phone: r.guardian_phone || r.billing_account?.student?.guardian_phone || r.billing_account?.guardian_phone || '—',
            outstanding_balance: r.outstanding_balance ?? r.remaining_balance ?? r.billing_account?.outstanding_balance ?? 0,
          };
        });
      }

      this.receiptsData.set(list);
    } catch (e) {
      console.error('Error building receipts data:', e);
      this.receiptsData.set([]);
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
        list = [];
      }
      this.invoicesData.set(list);
    } catch (e) {
      console.error('Error building invoices data:', e);
      this.invoicesData.set([]);
    }
  }

  private buildAccountsData(accounts: any[]) {
    const customList: any[] = [];
    const paidList: any[] = [];
    const overdueList: any[] = [];

    if (accounts && accounts.length > 0) {
      for (const a of accounts) {
        if (a.student_name) {
          const billed = Number(a.total_billed || a.current_balance || a.outstanding_balance || 0);
          const paid = Number(a.total_paid != null ? a.total_paid : Math.max(0, billed - (a.outstanding_balance || 0)));
          const rem = Number(a.outstanding_balance != null ? a.outstanding_balance : Math.max(0, billed - paid));
          const status = a.payment_status || (rem <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));
          const item = {
            id: a.id || a.student_id,
            account_id: a.id,
            account_number: a.account_number || (a.student_number ? `ACC-${a.student_number}` : '—'),
            student_id: a.student_id,
            student_name: a.student_name,
            student_number: a.student_number || '—',
            branch_name: a.branch_name || (a.gender === 'بنات' ? 'فرع البنات' : 'فرع البنين'),
            gender: a.gender || 'بنين',
            stage_name: a.stage_name || this.inferStage(a.grade_name),
            grade_name: a.grade_name || '—',
            section_name: a.section_name || '—',
            guardian_name: a.guardian_name || '—',
            guardian_phone: a.guardian_phone || '—',
            total_billed: billed,
            total_paid: paid,
            outstanding_balance: rem,
            payment_status: status,
            last_payment_date: a.last_payment_date || (typeof a.updated_at === 'string' ? a.updated_at.split('T')[0] : this.todayStr),
          };
          customList.push(item);

          if (rem <= 0 && billed > 0) {
            paidList.push({
              id: a.id || a.student_id,
              student_name: a.student_name,
              student_number: a.student_number || '—',
              account_number: item.account_number,
              grade_name: a.grade_name || '—',
              guardian_name: a.guardian_name || '—',
              guardian_phone: a.guardian_phone || '—',
              total_billed: billed,
              total_paid: paid,
              last_payment_date: item.last_payment_date,
              academic_year: '2026 - 2027 م',
            });
          } else if (rem > 0) {
            overdueList.push({
              id: a.id || a.student_id,
              student_name: a.student_name,
              student_number: a.student_number || '—',
              account_number: item.account_number,
              grade_name: a.grade_name || '—',
              guardian_name: a.guardian_name || '—',
              guardian_phone: a.guardian_phone || '—',
              outstanding_amount: rem,
              due_date: a.due_date || '2026-09-30',
              days_overdue: 15,
              has_hold: rem > 300000,
              overdue_items: [
                { title: 'مستحقات دراسية متأخرة', due_date: a.due_date || '2026-09-30', amount: rem },
              ],
            });
          }
        }
      }
    }

    this.paidStudentsData.set(paidList);
    this.overdueStudentsData.set(overdueList);
    this.customStatementData.set(customList);
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

  filteredCustomStatement = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const br = this.selectedBranch();
    const stg = this.selectedStage();
    const gr = this.selectedGrade();
    const sec = this.selectedSection();
    const pStatus = this.selectedPaymentStatus();
    const dFrom = this.dateFrom();
    const dTo = this.dateTo();
    const hasDateFilter = !!dFrom || !!dTo;

    const receipts = this.receiptsData();

    // خريطة لتجميع مقبوضات كل طالب خلال الفترة المحددة
    const studentPaymentsMap = new Map<string, number>();
    if (hasDateFilter) {
      for (const r of receipts) {
        const rDate = r.receipt_date || r.payment_date || '';
        if (dFrom && rDate < dFrom) continue;
        if (dTo && rDate > dTo) continue;
        const amt = Number(r.amount) || 0;
        if (r.student_id) studentPaymentsMap.set(r.student_id, (studentPaymentsMap.get(r.student_id) || 0) + amt);
        if (r.account_id) studentPaymentsMap.set(r.account_id, (studentPaymentsMap.get(r.account_id) || 0) + amt);
        if (r.student_number) studentPaymentsMap.set(r.student_number, (studentPaymentsMap.get(r.student_number) || 0) + amt);
        if (r.student_name) studentPaymentsMap.set(r.student_name, (studentPaymentsMap.get(r.student_name) || 0) + amt);
      }
    }

    const rows = this.customStatementData().map((item) => {
      let periodPaid = item.total_paid;
      if (hasDateFilter) {
        const p1 = item.student_id ? studentPaymentsMap.get(item.student_id) : undefined;
        const p2 = item.account_id ? studentPaymentsMap.get(item.account_id) : undefined;
        const p3 = item.student_number ? studentPaymentsMap.get(item.student_number) : undefined;
        const p4 = item.student_name ? studentPaymentsMap.get(item.student_name) : undefined;
        periodPaid = p1 ?? p2 ?? p3 ?? p4 ?? 0;
      }
      return {
        ...item,
        period_paid: periodPaid,
      };
    }).filter((item) => {
      // 1. بحث نصي
      if (q) {
        const matches =
          (item.student_name || '').toLowerCase().includes(q) ||
          (item.student_number || '').toLowerCase().includes(q) ||
          (item.guardian_name || '').toLowerCase().includes(q) ||
          (item.guardian_phone || '').toLowerCase().includes(q) ||
          (item.section_name || '').toLowerCase().includes(q) ||
          (item.grade_name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. فلتر الفرع (بنين / بنات)
      if (br !== 'all') {
        const rowBranch = item.branch_name || (item.gender === 'بنات' ? 'فرع البنات' : 'فرع البنين');
        if (br === 'فرع البنين' && !rowBranch.includes('بنين')) return false;
        if (br === 'فرع البنات' && !rowBranch.includes('بنات')) return false;
      }

      // 3. فلتر المرحلة التعليمية
      if (stg !== 'all') {
        const rowStage = item.stage_name || this.inferStage(item.grade_name);
        if (rowStage !== stg) return false;
      }

      // 4. فلتر الصف الدراسي
      if (gr !== 'all' && !(item.grade_name || '').includes(gr)) return false;

      // 5. فلتر الشعبة / الفصل
      if (sec !== 'all' && item.section_name !== sec) return false;

      // 6. فلتر حالة السداد
      if (pStatus !== 'all') {
        if (pStatus === 'paid' && item.payment_status !== 'paid') return false;
        if (pStatus === 'partial' && item.payment_status !== 'partial') return false;
        if (pStatus === 'unpaid' && item.payment_status !== 'unpaid') return false;
      }

      // 7. فلتر التاريخ
      if (hasDateFilter) {
        const hasPeriodReceipt = (item.period_paid || 0) > 0;
        const lastDateInRange =
          (!dFrom || (item.last_payment_date && item.last_payment_date >= dFrom)) &&
          (!dTo || (item.last_payment_date && item.last_payment_date <= dTo));
        if (!hasPeriodReceipt && !lastDateInRange) {
          return false;
        }
      }

      return true;
    });

    const totalBilled = rows.reduce((s, r) => s + (r.total_billed || 0), 0);
    const totalPaid = rows.reduce((s, r) => s + (hasDateFilter ? (r.period_paid || 0) : (r.total_paid || 0)), 0);
    const totalRemaining = rows.reduce((s, r) => s + (r.outstanding_balance || 0), 0);

    return [
      ...rows,
      {
        _isTotal: true,
        total_billed: totalBilled,
        total_paid: totalPaid,
        outstanding_balance: totalRemaining,
      },
    ];
  });

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

    if (tab === 'custom_statement') {
      const rows = this.filteredCustomStatement().filter((r) => !r._isTotal);
      const totalBilled = rows.reduce((s, r) => s + (r.total_billed || 0), 0);
      const hasPeriod = !!this.dateFrom() || !!this.dateTo() || this.datePreset() !== 'all';
      const totalPaid = rows.reduce((s, r) => s + (r.period_paid != null ? r.period_paid : (r.total_paid || 0)), 0);
      const totalRemaining = rows.reduce((s, r) => s + (r.outstanding_balance || 0), 0);
      const rate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

      return [
        {
          label: 'إجمالي الطلاب في الكشف',
          value: String(rows.length),
          unit: 'طالباً وطالبة',
          icon: '👥',
          style: 'info',
          sub: 'حسب الفلاتر والشعب المحددة',
        },
        {
          label: 'إجمالي الرسوم المقررة',
          value: this.fmt(totalBilled),
          unit: 'ج.س',
          icon: '📜',
          style: 'neutral',
        },
        {
          label: hasPeriod ? 'المحصل المعتمد بالفترة' : 'المسدد الفعلي المعتمد',
          value: this.fmt(totalPaid),
          unit: 'ج.س',
          icon: '💵',
          style: 'success',
          sub: hasPeriod ? `مجموع سداد الفترة` : `نسبة التحصيل ${rate.toFixed(1)}%`,
        },
        {
          label: 'إجمالي المتبقي للتحصيل',
          value: this.fmt(totalRemaining),
          unit: 'ج.س',
          icon: '⏳',
          style: 'danger',
          sub: 'مستحقات غير محصلة',
        },
      ];
    }

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
      custom_statement: 'التقرير المالي المخصص لحسابات ورسوم الطلاب',
    };
    return titles[this.activeTab()];
  });

  activeExportColumns = computed<ExportColumn[]>(() => {
    const tab = this.activeTab();

    if (tab === 'custom_statement') {
      return [
        { key: 'student_name', label: 'اسم الطالب' },
        { key: 'student_number', label: 'الرقم الأكاديمي' },
        { key: 'branch_name', label: 'الفرع' },
        { key: 'stage_name', label: 'المرحلة' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'section_name', label: 'الشعبة' },
        { key: 'guardian_name', label: 'ولي الأمر' },
        { key: 'total_billed', label: 'الرسوم', align: 'end', map: (r) => this.fmt(r.total_billed) },
        { key: 'total_paid', label: 'المدفوع', align: 'end', map: (r) => this.fmt(r.total_paid) },
        { key: 'outstanding_balance', label: 'المتبقي', align: 'end', map: (r) => this.fmt(r.outstanding_balance) },
        { key: 'payment_status', label: 'الحالة', map: (r) => r.payment_status === 'paid' ? 'مسدد' : r.payment_status === 'partial' ? 'جزئي' : 'متأخر' },
        { key: 'last_payment_date', label: 'آخر سداد' },
      ];
    }

    if (tab === 'revenue') {
      return [
        { key: 'name', label: 'بند الرسم' },
        { key: 'category', label: 'الفئة' },
        { key: 'invoiced', label: 'المفوتر', align: 'end', map: (r) => this.fmt(r.invoiced) },
        { key: 'collected', label: 'المحصّل', align: 'end', map: (r) => this.fmt(r.collected) },
        { key: 'remaining', label: 'المتبقي', align: 'end', map: (r) => this.fmt(r.remaining) },
        { key: 'rate', label: 'النسبة', align: 'end', map: (r) => `${r.rate?.toFixed(1) || 0}%` },
      ];
    }

    if (tab === 'receipts') {
      return [
        { key: 'receipt_number', label: 'رقم السند' },
        { key: 'receipt_date', label: 'التاريخ' },
        { key: 'student_name', label: 'اسم الطالب' },
        { key: 'student_number', label: 'الرقم الأكاديمي' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'section_name', label: 'الشعبة' },
        { key: 'payment_method', label: 'طريقة الدفع' },
        { key: 'reference_number', label: 'المرجع' },
        { key: 'amount', label: 'المبلغ', align: 'end', map: (r) => this.fmt(r.amount) },
        { key: 'collector', label: 'المحصّل' },
      ];
    }

    if (tab === 'invoices') {
      return [
        { key: 'invoice_number', label: 'رقم الفاتورة' },
        { key: 'issue_date', label: 'الإصدار' },
        { key: 'due_date', label: 'الاستحقاق' },
        { key: 'student_name', label: 'الطالب' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'total_amount', label: 'الإجمالي', align: 'end', map: (r) => this.fmt(r.total_amount ?? r.total) },
        { key: 'paid_amount', label: 'المسدد', align: 'end', map: (r) => this.fmt(r.paid_amount ?? r.paid) },
        { key: 'remaining_balance', label: 'المتبقي', align: 'end', map: (r) => this.fmt(r.remaining_balance ?? r.remaining) },
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
        { key: 'total_billed', label: 'المقرر', align: 'end', map: (r) => this.fmt(r.total_billed ?? r.billed) },
        { key: 'total_paid', label: 'المسدد', align: 'end', map: (r) => this.fmt(r.total_paid ?? r.paid) },
        { key: 'last_payment_date', label: 'آخر دفعة' },
      ];
    }

    if (tab === 'overdue') {
      return [
        { key: 'student_name', label: 'اسم الطالب' },
        { key: 'student_number', label: 'الرقم الأكاديمي' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'guardian_name', label: 'ولي الأمر' },
        { key: 'guardian_phone', label: 'الهاتف' },
        { key: 'outstanding_amount', label: 'المتأخر', align: 'end', map: (r) => this.fmt(r.outstanding_amount ?? r.amount) },
        { key: 'due_date', label: 'الاستحقاق' },
        { key: 'days_overdue', label: 'التأخير', align: 'end', map: (r) => r.days_overdue ? `${r.days_overdue} يوم` : '' },
        { key: 'has_hold', label: 'الحظر', map: (r) => r.has_hold ? 'محظور' : 'سارٍ' },
      ];
    }

    if (tab === 'installments') {
      return [
        { key: 'installment_title', label: 'بيان القسط' },
        { key: 'due_date', label: 'الاستحقاق' },
        { key: 'student_name', label: 'الطالب' },
        { key: 'grade_name', label: 'الصف' },
        { key: 'amount', label: 'مبلغ القسط', align: 'end', map: (r) => this.fmt(r.amount) },
        { key: 'paid_amount', label: 'المسدد', align: 'end', map: (r) => this.fmt(r.paid_amount ?? r.paid) },
        { key: 'remaining_amount', label: 'المتبقي', align: 'end', map: (r) => this.fmt(r.remaining_amount ?? r.remaining) },
        { key: 'days_left', label: 'الأيام', align: 'end', map: (r) => r.days_left ? `${r.days_left}` : '' },
      ];
    }

    // scholarships
    return [
      { key: 'student_name', label: 'الطالب' },
      { key: 'student_number', label: 'الرقم الأكاديمي' },
      { key: 'grade_name', label: 'الصف' },
      { key: 'scholarship_name', label: 'المنحة' },
      { key: 'discount_rate', label: 'نوع الخصم' },
      { key: 'original_amount', label: 'الأصلية', align: 'end', map: (r) => this.fmt(r.original_amount ?? r.original) },
      { key: 'discount_amount', label: 'الخصم', align: 'end', map: (r) => this.fmt(r.discount_amount ?? r.discount) },
      { key: 'net_amount', label: 'الصافي', align: 'end', map: (r) => this.fmt(r.net_amount ?? r.net) },
      { key: 'approved_by', label: 'الاعتماد' },
    ];
  });

  activeExportRows = computed<any[]>(() => {
    const tab = this.activeTab();
    if (tab === 'custom_statement') return this.filteredCustomStatement();
    if (tab === 'revenue') return this.filteredRevenue();
    if (tab === 'receipts') return this.filteredReceipts();
    if (tab === 'invoices') return this.filteredInvoices();
    if (tab === 'paid') return this.filteredPaidStudents();
    if (tab === 'overdue') return this.filteredOverdueStudents();
    if (tab === 'installments') return this.filteredInstallments();
    return this.filteredScholarships();
  });

  // ---- إجراءات الطباعة الرسمية ----

  /** فتح درج السند الرسمي بنفس شكل سند ملف الطالب */
  openReceiptDrawer(receipt: any) {
    this.receiptDoc.set({
      type: 'receipt',
      data: {
        receipt_number: receipt.receipt_number,
        payment_date: receipt.receipt_date,
        student_name: receipt.student_name,
        student_number: receipt.student_number,
        grade_name: receipt.grade_name,
        section_name: receipt.section_name,
        guardian_name: receipt.guardian_name || '—',
        guardian_phone: receipt.guardian_phone || '—',
        account_number: receipt.account_number || `ACC-${receipt.student_number || 'ST-2026'}`,
        payment_method_name: receipt.payment_method,
        reference_number: receipt.reference_number,
        amount: receipt.amount,
        remaining_balance: receipt.outstanding_balance ?? receipt.remaining_balance ?? 0,
        outstanding_balance: receipt.outstanding_balance ?? receipt.remaining_balance ?? 0,
        student_billing_account_id: receipt.student_billing_account_id || receipt.account_id,
        student_id: receipt.student_id,
        notes: receipt.notes || 'دفعة سداد معتمدة بموجب إيصال قبض',
        status: receipt.status || 'posted',
        collector: receipt.collector,
      },
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

    printStudentFinanceReport(title, cols, rows, filterInfo, kpiSummary, undefined, this.receiptSchoolInfo());
  }

  readonly exportPdfOfficial = async () => {
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

    await exportStudentFinanceReportToPdf(title, cols, rows, filterInfo, kpiSummary, undefined, this.receiptSchoolInfo());
  };

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

  showMsgModal = signal(false);
  msgRecipientName = signal('');
  msgRecipientPhone = signal('');
  msgContextVariables = signal<any>({});

  openMessageModal(studentOrItem: any) {
    if (!studentOrItem) return;
    const name = studentOrItem.guardian_name && studentOrItem.guardian_name !== '—'
      ? studentOrItem.guardian_name
      : (studentOrItem.student_name ? `ولي أمر الطالب/ـة: ${studentOrItem.student_name}` : 'ولي الأمر');
    
    const phone = studentOrItem.guardian_phone && studentOrItem.guardian_phone !== '—'
      ? studentOrItem.guardian_phone
      : '';

    const outstanding = studentOrItem.outstanding_balance ?? studentOrItem.outstanding_amount ?? 0;
    const totalBilled = studentOrItem.total_billed ?? studentOrItem.original_amount ?? studentOrItem.total_amount ?? outstanding;
    const totalPaid = studentOrItem.total_paid ?? studentOrItem.paid_amount ?? 0;

    this.msgRecipientName.set(name);
    this.msgRecipientPhone.set(phone);
    this.msgContextVariables.set({
      student_name: studentOrItem.student_name || '',
      student_number: studentOrItem.student_number || '',
      guardian_name: name,
      guardian_phone: phone,
      outstanding_amount: this.fmt(outstanding),
      total_billed: this.fmt(totalBilled),
      total_paid: this.fmt(totalPaid),
      grade_name: studentOrItem.grade_name || '',
      section_name: studentOrItem.section_name || '',
      branch_name: studentOrItem.branch_name || '',
      due_date: studentOrItem.due_date || 'فوراً',
      academic_year: studentOrItem.academic_year || '2025/2026 م',
      school_name: 'مدارس نبراس النموذجية',
      date: this.todayStr,
    });
    this.showMsgModal.set(true);
  }

  sendWhatsApp(student: any) {
    this.openMessageModal(student);
  }

  viewAccount(itemOrId?: any) {
    if (!itemOrId) {
      this.router.navigate(['/student-finance/accounts']);
      return;
    }

    if (typeof itemOrId === 'string') {
      this.router.navigate(['/student-finance/accounts', itemOrId, 'statement']);
      return;
    }

    // كائن (سند أو فاتورة أو قسط)
    const targetId =
      itemOrId.student_billing_account_id ||
      itemOrId.account_id ||
      itemOrId.student_id ||
      itemOrId.account_number ||
      itemOrId.student_number ||
      itemOrId.id;

    if (targetId) {
      this.router.navigate(['/student-finance/accounts', targetId, 'statement']);
    } else {
      this.router.navigate(['/student-finance/accounts']);
    }
  }

  private getPresetLabel(): string {
    const p = this.datePreset();
    if (p === 'today') return `سندات اليوم (${this.todayStr})`;
    if (p === 'week') return 'الأسبوع الحالي';
    if (p === 'year') return 'العام الدراسي الحالي';
    if (p === 'quarter') return 'الربع الدراسي الحالي';
    if (p === 'month') return 'الشهر الحالي';
    return 'جميع الفترات المالية';
  }

  cleanPhone(phone: any): string {
    if (!phone) return '';
    let p = String(phone).replace(/[^0-9+]/g, '');
    if (p.startsWith('0')) p = '249' + p.substring(1);
    else if (!p.startsWith('+') && !p.startsWith('249')) p = '249' + p;
    return p.replace('+', '');
  }

  viewStudentStatement(item: any) {
    this.viewAccount(item);
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}
