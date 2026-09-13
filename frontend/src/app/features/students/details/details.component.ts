import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { StudentsService } from '../students.service';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import { SfDocumentDrawerComponent, SfDoc } from '../../student-finance/shared/sf-document-drawer.component';
import { HttpClient } from '@angular/common/http';
import { ClinicService } from '../../clinic/clinic.service';
import { LibraryService } from '../../library/library.service';
import { ExaminationsService } from '../../examinations/examinations.service';
import { forkJoin } from 'rxjs';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  AccountActionDialogComponent,
} from '../../../shared/components/account-action-dialog/account-action-dialog.component';

import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';
import { compressFile, formatFileSize, CompressionResult } from '../../../core/utils/file-compressor.util';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-student-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CommonModule, RouterLink, MatTabsModule, MatDialogModule, MatSnackBarModule, NbLoadingComponent, SfDocumentDrawerComponent, FormsModule],
  template: `
    @if (pageLoading() || !student().id) {
      <div class="page" dir="rtl" style="display: flex; align-items: center; justify-content: center; min-height: 480px;">
        <nb-loading message="جارٍ استرجاع ملف وبيانات الطالب…"></nb-loading>
      </div>
    } @else {
      @if (student(); as s) {
        <div class="page" dir="rtl">
          
          <!-- الهيدر والملخص العلوي الفاخر -->
          <div class="nb-card summary-card">
          <div class="summary-content">
            <div class="avatar-section">
              <div class="avatar-wrapper" (click)="photoInput.click()" title="انقر لتحديث الصورة الشخصية">
                <img *ngIf="$any(s.profile)?.photo_url" [src]="$any(s.profile)?.photo_url" class="student-photo" alt="صورة الطالب" />
                <div *ngIf="!$any(s.profile)?.photo_url" class="avatar-placeholder">{{ (s.profile.arabic_name || '؟').charAt(0) }}</div>
                <div class="avatar-overlay">
                  <span>تغيير 📷</span>
                </div>
              </div>
              <input type="file" #photoInput (change)="onPhotoSelected($event, s)" style="display: none;" accept="image/*" />

              <div class="basic-info">
                <h2>{{ s.profile.arabic_name || 'ملف طالب' }}</h2>
                <p class="eng-name">{{ s.profile.english_name }}</p>
                <div class="badge-row">
                  <span [class]="statusBadge(s.status)">{{ statusText(s.status) }}</span>
                  <span class="num-badge">رقم الطالب: {{ s.student_number }}</span>
                  <span class="academic-badge grade-badge">🏫 {{ s.grade_name || 'الصف غير مسجل' }}</span>
                  <span class="academic-badge section-badge">🏷️ {{ s.section_name ? ('الفصل: ' + s.section_name) : 'الفصل غير محدد' }}</span>
                  <span class="academic-badge year-badge" *ngIf="s.academic_year_name">📅 {{ s.academic_year_name }}</span>
                </div>
              </div>
            </div>
            
            <div class="quick-stats">
              <div class="stat-item"><span class="label">الجنسية</span><span class="val">{{ s.profile.nationality || '—' }}</span></div>
              <div class="stat-item"><span class="label">الجنس</span><span class="val">{{ s.profile.gender === 'male' ? 'ذكر' : s.profile.gender === 'female' ? 'أنثى' : '—' }}</span></div>
              <div class="stat-item"><span class="label">تاريخ الميلاد</span><span class="val">{{ s.profile.date_of_birth || '—' }}</span></div>
              <div class="stat-item"><span class="label">العمر</span><span class="val font-semibold">{{ getAge(s.profile.date_of_birth) }}</span></div>
            </div>
          </div>

          <div class="action-bar">
            <button class="nb-btn-secondary" (click)="back()">
              <span>←</span> عودة للقائمة
            </button>
            <button class="nb-btn-primary print-btn" (click)="printReportCard()" title="طباعة شهادة النتيجة على ورقة A4">
              <span class="pico" aria-hidden="true">🖨️</span> طباعة النتيجة (A4)
            </button>
            <div class="spacer"></div>

            <button class="nb-btn-secondary" [routerLink]="['/students/edit', s.id]">
              <span>✏️</span> تعديل الملف
            </button>

            <!-- القائمة المنسدلة المجمعة لإجراءات وعمليات الطالب -->
            <div class="actions-dropdown-wrap">
              <button type="button" class="nb-btn-secondary actions-dropdown-trigger" 
                      (click)="toggleActionsMenu($event)" 
                      [class.active]="showActionsMenu()">
                <span>⚡ إجراءات وعمليات الطالب</span>
                <span class="caret" [class.open]="showActionsMenu()">▼</span>
              </button>

              @if (showActionsMenu()) {
                <div class="actions-dropdown-menu" (click)="$event.stopPropagation()">
                  <div class="menu-header">إجراءات الطالب الإدارية</div>
                  
                  <button type="button" class="menu-item" [routerLink]="['/students/edit', s.id]" [queryParams]="{ tab: 'academic' }" (click)="showActionsMenu.set(false)">
                    <span class="item-icon">🎓</span>
                    <div class="item-info">
                      <span class="item-title">تعديل الصف والفصل</span>
                      <span class="item-desc">تعديل التسكين الأكاديمي والفصل والحالة</span>
                    </div>
                  </button>

                  <button type="button" class="menu-item" (click)="activateStudent(s); showActionsMenu.set(false)" [disabled]="activatingStudent()">
                    <span class="item-icon">🔑</span>
                    <div class="item-info">
                      <span class="item-title">{{ activatingStudent() ? 'جارٍ التفعيل…' : 'تفعيل حساب بوابة الطالب' }}</span>
                      <span class="item-desc">إنشاء حساب وإرسال بيانات الدخول للطالب</span>
                    </div>
                  </button>

                  <div class="menu-divider"></div>
                  <div class="menu-header">حالة القيد والمسار</div>

                  <button type="button" class="menu-item" (click)="graduate(s); showActionsMenu.set(false)" [disabled]="s.status === 'graduated'">
                    <span class="item-icon">📜</span>
                    <div class="item-info">
                      <span class="item-title">تخريج الطالب</span>
                      <span class="item-desc">تحويل حالة الطالب إلى خريج</span>
                    </div>
                  </button>

                  <button type="button" class="menu-item" (click)="withdraw(s); showActionsMenu.set(false)" [disabled]="s.status === 'withdrawn'">
                    <span class="item-icon">🚪</span>
                    <div class="item-info">
                      <span class="item-title">تسجيل انسحاب</span>
                      <span class="item-desc">تسجيل انسحاب الطالب وإنهاء القيد</span>
                    </div>
                  </button>

                  <button type="button" class="menu-item" (click)="archive(s); showActionsMenu.set(false)">
                    <span class="item-icon">📦</span>
                    <div class="item-info">
                      <span class="item-title">أرشفة الملف</span>
                      <span class="item-desc">نقل ملف الطالب للأرشيف</span>
                    </div>
                  </button>

                  <div class="menu-divider danger"></div>

                  <button type="button" class="menu-item danger" (click)="deleteStudent(s); showActionsMenu.set(false)">
                    <span class="item-icon">🗑️</span>
                    <div class="item-info">
                      <span class="item-title">حذف الطالب نهائياً</span>
                      <span class="item-desc">إزالة سجل الطالب وكافة بياناته</span>
                    </div>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- تبويبات التفاصيل المتقدمة -->
        <div class="nb-card tabs-card">
          <mat-tab-group animationDuration="200ms">
            
            <!-- تبويب 1: نظرة عامة -->
            <mat-tab label="نظرة عامة">
              <div class="tab-content">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <h3 style="margin: 0;">🎓 البيانات الأكاديمية والتسكين المدرسي</h3>
                  <a [routerLink]="['/students/edit', s.id]" [queryParams]="{ tab: 'academic' }" class="nb-btn-secondary sm" style="font-size: 12px; padding: 4px 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">✏️ تعديل الصف والفصل</a>
                </div>
                <div class="info-grid" style="margin-bottom: 24px;">
                  <div class="info-item"><strong>الصف الدراسي الحالي</strong><span style="font-weight: 700; color: var(--nb-primary-700); font-size: 14.5px;">{{ s.grade_name || 'غير مسكن بصف بعد' }}</span></div>
                  <div class="info-item"><strong>الفصل</strong><span style="font-weight: 600;">{{ s.section_name ? ('فصل: ' + s.section_name) : 'الفصل غير محدد' }}</span></div>
                  <div class="info-item"><strong>العام الدراسي</strong><span>{{ s.academic_year_name || '—' }}</span></div>
                  <div class="info-item"><strong>الفرع / المجمع</strong><span>{{ s.branch_name || 'المقر الرئيسي' }}</span></div>
                </div>

                <hr class="nb-divider" />

                <h3>المعلومات الشخصية الأساسية</h3>
                <div class="info-grid">
                  <div class="info-item"><strong>الاسم الكامل (عربي)</strong>{{ s.profile.arabic_name }}</div>
                  <div class="info-item"><strong>الاسم الكامل (إنجليزي)</strong>{{ s.profile.english_name || '—' }}</div>
                  <div class="info-item"><strong>الرقم الوطني / الجواز</strong>{{ s.profile.national_id || '—' }}</div>
                  <div class="info-item"><strong>رقم جواز السفر</strong>{{ s.profile.passport || '—' }}</div>
                  <div class="info-item"><strong>الجنسية</strong>{{ s.profile.nationality }}</div>
                  <div class="info-item"><strong>تاريخ الميلاد</strong>{{ s.profile.date_of_birth }}</div>
                  <div class="info-item"><strong>الديانة</strong>{{ s.profile.religion || '—' }}</div>
                  <div class="info-item"><strong>فصيلة الدم</strong><span class="blood-group">{{ s.profile.blood_group || '—' }}</span></div>
                </div>

                <hr class="nb-divider" />

                <h3>أولياء الأمور وجهات الاتصال</h3>
                <div class="family-list">
                  @for (member of s.family_relations; track $index) {
                    <div class="info-item family-item">
                      <div class="member-header">
                        <h4>{{ member.full_name }}</h4>
                        <span class="badge info">{{ member.relationship }}</span>
                      </div>
                      <p><strong>الهاتف:</strong> {{ member.phone || '—' }}</p>
                      <p><strong>البريد الإلكتروني:</strong> {{ member.email || 'غير متوفر' }}</p>
                      <p><strong>الرقم الوطني / الجواز:</strong> {{ member.national_id || 'غير متوفر' }}</p>
                      <div class="guardian-actions">
                        <button class="nb-btn-primary sm" (click)="activateGuardian(s, member.id)"
                          [disabled]="!member.email || activatingGuardianId() === member.id"
                          [title]="!member.email ? 'يجب إدخال البريد الإلكتروني أولاً لتفعيل الحساب' : 'تفعيل حساب البوابة وإرسال بيانات الدخول'">
                          {{ activatingGuardianId() === member.id ? 'جارٍ التفعيل…' : '🔑 تفعيل حساب ولي الأمر' }}
                        </button>
                        <button class="nb-btn-secondary sm" (click)="resetGuardianPassword(s, member.id)"
                          [disabled]="!member.email || activatingGuardianId() === member.id"
                          title="إعادة تعيين كلمة المرور وإرسال بيانات الدخول الجديدة عبر البريد وواتساب">
                          🔄 إعادة إرسال بيانات الدخول
                        </button>
                      </div>
                    </div>
                  }
                  @if (!s.family_relations || s.family_relations.length === 0) {
                    <div class="no-data">لم يتم تسجيل أفراد العائلة بعد.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- تبويب 2: الرسوم والمالية (حقيقي) -->
            <mat-tab label="الرسوم والمالية">
              <div class="tab-content">
                @if (financeLoading()) {
                  <div style="padding: 40px 0; display: flex; justify-content: center;">
                    <nb-loading message="جارٍ تحميل الحساب المالي والفواتير والسندات…"></nb-loading>
                  </div>
                } @else if (billingAccount()) {
                  <div class="finance-header-box">
                    <div class="fin-stat-card">
                      <span class="fin-label">رقم الحساب المالي</span>
                      <span class="fin-value">{{ billingAccount().account_number }}</span>
                    </div>
                    <div class="fin-stat-card">
                      <span class="fin-label">الرصيد المستحق</span>
                      <span class="fin-value text-danger">{{ billingAccount().outstanding_balance | number:'1.2-2' }} ج.س</span>
                    </div>
                    <div class="fin-stat-card">
                      <span class="fin-label">إجمالي المُحصّل</span>
                      <span class="fin-value text-success">{{ totalCollected() | number:'1.2-2' }} ج.س</span>
                    </div>
                    <div class="fin-stat-card">
                      <span class="fin-label">الرصيد الدائن</span>
                      <span class="fin-value">{{ billingAccount().credit_balance | number:'1.2-2' }} ج.س</span>
                    </div>
                    <a class="fin-link" (click)="openFinanceAccount()">فتح الحساب المالي الكامل (360°) ←</a>
                  </div>

                  <h3 style="margin-top: 20px;">الفواتير الصادرة</h3>
                  <div class="tbl" *ngIf="invoices().length > 0; else noInvoices">
                    <div class="tbl-head finance-tbl">
                      <span>رقم الفاتورة</span>
                      <span>المبلغ الإجمالي</span>
                      <span>الرصيد المتبقي</span>
                      <span>حالة الفاتورة</span>
                      <span>تاريخ الاستحقاق</span>
                    </div>
                    @for (inv of invoices(); track inv.id) {
                      <div class="tbl-row finance-tbl clickable" (click)="openDoc('invoice', inv)">
                        <span class="strong">{{ inv.invoice_number }}</span>
                        <span>{{ inv.total_amount | number:'1.2-2' }} ج.س</span>
                        <span class="text-danger">{{ inv.outstanding_amount | number:'1.2-2' }} ج.س</span>
                        <span>
                          <span class="badge" [class.success]="+inv.outstanding_amount === 0" [class.warning]="+inv.outstanding_amount > 0 && +inv.paid_amount > 0" [class.danger]="+inv.outstanding_amount > 0 && +inv.paid_amount === 0">
                            {{ +inv.outstanding_amount === 0 ? 'مدفوعة بالكامل' : (+inv.paid_amount > 0 ? 'مدفوعة جزئياً' : 'مستحقة') }}
                          </span>
                        </span>
                        <span>{{ inv.due_date }}</span>
                      </div>
                    }
                  </div>

                  <ng-template #noInvoices>
                    <div class="tbl-empty">لا توجد فواتير صادرة لهذا الطالب حالياً.</div>
                  </ng-template>

                  <!-- سندات القبض / التحصيلات المالية -->
                  <div style="margin-top: 24px;">
                    <h3>السندات المالية (سندات القبض)</h3>
                    <div class="tbl" *ngIf="receipts().length > 0; else noReceipts">
                      <div class="tbl-head receipts-tbl">
                        <span>رقم السند</span>
                        <span>تاريخ الدفع</span>
                        <span>المبلغ المحصّل</span>
                        <span>الحالة</span>
                      </div>
                      @for (r of receipts(); track r.id) {
                        <div class="tbl-row receipts-tbl clickable" (click)="openDoc('receipt', r)">
                          <span class="strong">{{ r.receipt_number }}</span>
                          <span>{{ r.payment_date }}</span>
                          <span class="text-success">{{ r.amount | number:'1.2-2' }} ج.س</span>
                          <span>
                            <span class="badge" [class.success]="r.status === 'posted'" [class.warning]="r.status === 'draft'" [class.danger]="r.status === 'cancelled'">
                              {{ r.status === 'posted' ? 'مرحل ومقفل' : r.status === 'draft' ? 'مسودة' : 'ملغي' }}
                            </span>
                          </span>
                        </div>
                      }
                    </div>
                    <ng-template #noReceipts>
                      <div class="tbl-empty">لا توجد سندات قبض (تحصيلات) لهذا الطالب حالياً.</div>
                    </ng-template>
                  </div>
                } @else {
                  <div class="no-data-box">
                    <span class="icon">💳</span>
                    <h4>لا يوجد حساب مالي نشط</h4>
                    <p>هذا الطالب ليس لديه حساب مالي نشط في الوقت الحالي. يمكنك إنشاء حساب مالي من شؤون الطلاب المالية.</p>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- تبويب 3: الحضور والانصراف -->
            <mat-tab label="الحضور والانصراف">
              <div class="tab-content">
                <h3>تقرير نسبة حضور الطالب</h3>
                <div class="attendance-summary">
                  <div class="attendance-circle">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                      <path class="circle-bg"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path class="circle"
                        stroke-dasharray="94, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <text x="18" y="20.35" class="percentage">94%</text>
                    </svg>
                  </div>

                  <div class="attendance-stats-grid">
                    <div class="att-card present">
                      <span class="label">أيام الحضور</span>
                      <span class="count">47 يوم</span>
                    </div>
                    <div class="att-card absent">
                      <span class="label">أيام الغياب</span>
                      <span class="count">2 يوم</span>
                    </div>
                    <div class="att-card late">
                      <span class="label">أيام التأخير</span>
                      <span class="count">1 يوم</span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- تبويب 4: استعارات المكتبة -->
            <mat-tab label="المكتبة">
              <div class="tab-content">
                <h3>الكتب المستعارة حالياً</h3>
                <div class="tbl">
                  <div class="tbl-head library-tbl">
                    <span>عنوان الكتاب</span>
                    <span>تاريخ الاستعارة</span>
                    <span>تاريخ الإرجاع المتوقع</span>
                    <span>حالة الاستعارة</span>
                  </div>
                  @for (row of studentBorrows(); track row.id) {
                    <div class="tbl-row library-tbl">
                      <span class="strong">{{ getBookTitle(row.copy) }}</span>
                      <span>{{ row.borrow_date }}</span>
                      <span>{{ row.due_date }}</span>
                      <span>
                        <span class="badge" [class.success]="row.status === 'returned'" [class.warning]="row.status === 'borrowed'" [class.danger]="row.status === 'overdue'">
                          {{ getBorrowStatusText(row.status) }}
                        </span>
                      </span>
                    </div>
                  }
                  @if (studentBorrows().length === 0) {
                    <div class="tbl-empty">لا توجد استعارات مسجلة لهذا الطالب.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- تبويب 5: العيادة والملف الطبي -->
            <mat-tab label="الملف الطبي والعيادة">
              <div class="tab-content">
                <h3>الملف الطبي للطالب</h3>
                <div class="info-grid">
                  <div class="info-item">
                    <strong>الحساسية</strong>
                    <div class="tag-list">
                      @for (allergy of s.medical_profile.allergies || []; track allergy) {
                        <span class="tag danger">{{ allergy }}</span>
                      }
                      @if (!(s.medical_profile.allergies?.length)) {
                        <span>لا توجد حساسية مسجلة.</span>
                      }
                    </div>
                  </div>
                  <div class="info-item">
                    <strong>الأمراض المزمنة</strong>
                    <div class="tag-list">
                      @for (disease of s.medical_profile.chronic_diseases || []; track disease) {
                        <span class="tag warning">{{ disease }}</span>
                      }
                      @if (!(s.medical_profile.chronic_diseases?.length)) {
                        <span>سليم.</span>
                      }
                    </div>
                  </div>
                  <div class="info-item">
                    <strong>الأدوية المنتظمة</strong>
                    <div class="tag-list">
                      @for (med of s.medical_profile.medication || []; track med) {
                        <span class="tag info">{{ med }}</span>
                      }
                      @if (!(s.medical_profile.medication?.length)) {
                        <span>لا يوجد.</span>
                      }
                    </div>
                  </div>
                  <div class="info-item"><strong>طبيب العائلة المفضل</strong>{{ s.medical_profile.doctor || '—' }}</div>
                </div>

                <hr class="nb-divider" />

                <h3>سجل زيارات العيادة المدرسية</h3>
                <div class="tbl">
                  <div class="tbl-head clinic-tbl">
                    <span>التاريخ والوقت</span>
                    <span>السبب / الشكوى</span>
                    <span>الحالة</span>
                    <span>وقت الدخول</span>
                  </div>
                  @for (row of studentVisits(); track row.id) {
                    <div class="tbl-row clinic-tbl">
                      <span>{{ row.visit_date || (row.check_in_time | date:'yyyy-MM-dd') }}</span>
                      <span class="strong">{{ row.notes || 'لا يوجد ملاحظات' }}</span>
                      <span>
                        <span class="badge" [class.success]="row.status === 'discharged'" [class.warning]="row.status === 'referred'" [class.info]="row.status === 'checked_in'">
                          {{ getVisitStatusText(row.status) }}
                        </span>
                      </span>
                      <span>{{ row.check_in_time | date:'shortTime' }}</span>
                    </div>
                  }
                  @if (studentVisits().length === 0) {
                    <div class="tbl-empty">لا توجد زيارات عيادة مسجلة لهذا الطالب.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- تبويب 6: الوثائق والخط الزمني -->
            <mat-tab label="الوثائق والخط الزمني">
              <div class="tab-content">
                <!-- قسم الوثائق المرفوعة -->
                <div class="docs-section-header">
                  <div>
                    <h3 class="docs-title">
                      📁 الوثائق والمستندات الرسمية للطالب
                      <span class="count-pill">{{ attachments().length }}</span>
                    </h3>
                    <p class="section-subtext">إدارة الوثائق الثبوتية والشهادات مع تقنية الضغط الذاتي الفائق للملفات لتقليص استهلاك الإنترنت.</p>
                  </div>
                  <button type="button" class="nb-btn-primary" (click)="openUploadModal()">
                    <span style="font-size: 14px;">➕</span> رفع وثيقة جديدة مباشرة
                  </button>
                </div>

                @if (loadingAttachments()) {
                  <div style="padding: 28px 0; text-align: center;">
                    <nb-loading message="جارٍ استرجاع وثائق ومرفقات الطالب…"></nb-loading>
                  </div>
                } @else if (attachments().length === 0) {
                  <div class="empty-docs-box">
                    <div class="empty-icon">📂</div>
                    <h4>لا توجد وثائق مرفوعة للطالب حتى الآن</h4>
                    <p>يمكنك رفع شهادة الميلاد، الرقم الوطني، الجواز، والتقارير الطبية والأكاديمية مباشرة هنا دون الحاجة للدخول في شاشة التعديل.</p>
                    <button type="button" class="nb-btn-primary sm" (click)="openUploadModal()">
                      ➕ رفع أول وثيقة للطالب
                    </button>
                  </div>
                } @else {
                  <div class="docs-grid">
                    @for (att of attachments(); track att.id) {
                      <div class="doc-card">
                        <div class="doc-card-top">
                          <div class="doc-type-icon">{{ getDocTypeIcon(att.attachment_type) }}</div>
                          <div class="doc-info">
                            <h4 class="doc-title" [title]="att.file_name || att.attachment_type_display">{{ att.file_name || att.attachment_type_display }}</h4>
                            <div class="doc-meta-tags">
                              <span class="doc-badge type">{{ att.attachment_type_display }}</span>
                              <span class="doc-badge size">⚡ {{ formatSize(att.file_size) }}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div class="doc-card-details">
                          <div class="doc-date">📅 {{ att.created_at | date:'yyyy/MM/dd' }}</div>
                          <div class="doc-ext">{{ getFileExt(att.file_url) }}</div>
                        </div>

                        <div class="doc-card-actions">
                          <button type="button" class="action-btn preview" (click)="viewDoc(att)" title="معاينة الوثيقة">
                            👁️ معاينة
                          </button>
                          <a [href]="att.file_url" target="_blank" download class="action-btn download" title="تحميل الملف">
                            📥 تحميل
                          </a>
                          <button type="button" class="action-btn delete" (click)="confirmDeleteDoc(att)" title="حذف الوثيقة">
                            🗑️
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <hr class="nb-divider" />

                <!-- قسم الخط الزمني المطور -->
                <div class="timeline-section-header">
                  <div>
                    <h3 class="timeline-title">
                      ⏳ خط نشاط ومحطات الطالب الأكاديمية
                      <span class="count-pill">{{ timeline().length }}</span>
                    </h3>
                    <p class="section-subtext">سجل زمني حي وتفاعلي يوثّق التسكين المدرسي، رفع الوثائق، وتغيير الحالات الأكاديمية والترفيع.</p>
                  </div>
                </div>

                <div class="timeline-v2">
                  @for (ev of timeline(); track $index) {
                    <div class="timeline-node">
                      <div class="timeline-axis">
                        <div class="node-icon-bubble" [style.background-color]="getTimelineColor(ev.type)">
                          <span>{{ getTimelineIcon(ev.type) }}</span>
                        </div>
                      </div>
                      
                      <div class="timeline-card">
                        <div class="node-header">
                          <div class="node-title-group">
                            <span class="node-badge" [style.color]="getTimelineColor(ev.type)">{{ getTimelineCategoryLabel(ev.type) }}</span>
                            <h4 class="node-title">{{ ev.title }}</h4>
                          </div>
                          <span class="node-time">{{ ev.date | date:'yyyy/MM/dd - hh:mm a' }}</span>
                        </div>
                        
                        <p class="node-desc">{{ ev.comments }}</p>
                        
                        @if (ev.file_url) {
                          <div class="node-attachment-preview">
                            <div class="att-thumb-info">
                              <span>📎 المستند المرفق: <strong>{{ ev.comments || 'وثيقة رسمية' }}</strong></span>
                              @if (ev.file_size) { <span class="att-size">({{ formatSize(ev.file_size) }})</span> }
                            </div>
                            <button type="button" class="nb-btn-secondary xs" (click)="viewDoc({ file_url: ev.file_url, file_name: ev.title })">
                              👁️ معاينة المستند
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }
                  @if (timeline().length === 0) {
                    <div class="tbl-empty">لا يوجد سجل أنشطة للطالب حالياً.</div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- تبويب الدرجات والامتحانات -->
            <mat-tab label="الدرجات والامتحانات">
              <div class="tab-content">
                <div class="grades-dashboard">
                  <!-- كرت المعدل العام الفاخر -->
                  <div class="gpa-card">
                    <div class="gpa-info">
                      <span class="gpa-title">المعدل التراكمي العام</span>
                      <span class="gpa-value">94.2%</span>
                      <span class="gpa-grade">ممتاز مرتفع (A+)</span>
                    </div>
                    <div class="gpa-stats">
                      <div class="stat-mini">
                        <span class="lbl">الترتيب على الصف</span>
                        <span class="val">الثاني (2)</span>
                      </div>
                      <div class="stat-mini">
                        <span class="lbl">الساعات المعتمدة</span>
                        <span class="val">28 ساعة</span>
                      </div>
                    </div>
                  </div>

                  <!-- توزيع درجات المواد -->
                  <div class="grades-header-actions">
                    <h3 class="section-title">تقرير درجات المواد الدراسية</h3>
                    <button type="button" class="nb-btn-primary" (click)="printReportCard()">🖨️ طباعة النتيجة (A4)</button>
                  </div>
                  <div class="subjects-grades-grid">
                    <div class="subject-grade-card" *ngFor="let grade of studentGrades()">
                      <div class="card-header">
                        <span class="subject-name">{{ grade.subject }}</span>
                        <span class="grade-percent" [class.excellent]="grade.score >= 90" [class.good]="grade.score >= 75 && grade.score < 90" [class.warn]="grade.score < 75">{{ grade.score }}%</span>
                      </div>
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill" [style.width.%]="grade.score" [class.excellent]="grade.score >= 90" [class.good]="grade.score >= 75 && grade.score < 90" [class.warn]="grade.score < 75"></div>
                      </div>
                      <div class="score-breakdown">
                        <span>أعمال الفصل: <strong>{{ grade.classwork }}/30</strong></span>
                        <span>الامتحان النهائي: <strong>{{ grade.finalExam }}/70</strong></span>
                      </div>
                    </div>
                  </div>

                  <!-- جدول الامتحانات -->
                  <h3 class="section-title" style="margin-top: 30px;">جدول امتحانات نهاية الفصل الدراسي</h3>
                  <div class="tbl">
                    <div class="tbl-head exams-tbl">
                      <span>المادة</span>
                      <span>نوع الامتحان</span>
                      <span>تاريخ الامتحان</span>
                      <span>الوقت</span>
                      <span>القاعة</span>
                      <span>الحالة</span>
                    </div>
                    <div class="tbl-row exams-tbl" *ngFor="let exam of examSchedule()">
                      <span class="strong">{{ exam.subject }}</span>
                      <span>{{ exam.type }}</span>
                      <span>{{ exam.date }}</span>
                      <span class="mono">{{ exam.time }}</span>
                      <span>{{ exam.room }}</span>
                      <span>
                        <span class="badge" [class.success]="exam.status === 'completed'" [class.warning]="exam.status === 'upcoming'">
                          {{ exam.status === 'completed' ? 'مكتمل' : 'قادم' }}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

          </mat-tab-group>
        </div>

        <!-- نافذة تفاصيل المستند (فاتورة / سند قبض) — عرض وطباعة وتصدير -->
        <sf-document-drawer [doc]="doc()" [studentName]="student().profile.arabic_name || ''"
          [student]="student()" [schoolInfo]="schoolInfo()"
          [methods]="paymentMethods()" (closed)="doc.set(null)"></sf-document-drawer>

        <!-- حاوية الطباعة الخاصة بـ A4 (مخفية في المتصفح وتظهر فقط عند الطباعة) -->
        <div class="print-only-container" *ngIf="student() && schoolInfo()" dir="rtl">
          <!-- إطار الشهادة المزدوج الفاخر والمائي -->
          <div class="print-certificate-frame" [style.--school-logo-url]="'url(' + schoolInfo().logo_url + ')'">
            
            <!-- ترويسة المدرسة (من قاعدة البيانات) -->
            <div class="print-header">
              <div class="school-logo-box">
                <img [src]="schoolInfo().logo_url" alt="شعار المدرسة" class="print-school-logo" />
              </div>
              <div class="school-details-box">
                <h1 class="print-school-name">{{ schoolInfo().name_ar || schoolInfo().name }}</h1>
                @if (schoolInfo().name_en) { <p class="print-school-sub">{{ schoolInfo().name_en }}</p> }
                @if (schoolInfo().phone_number || schoolInfo().email) {
                  <p class="print-school-contact">
                    @if (schoolInfo().phone_number) { <span>الهاتف: {{ schoolInfo().phone_number }}</span> }
                    @if (schoolInfo().phone_number && schoolInfo().email) { <span> · </span> }
                    @if (schoolInfo().email) { <span>البريد: {{ schoolInfo().email }}</span> }
                  </p>
                }
                @if (schoolInfo().address) { <p class="print-school-addr">العنوان: {{ schoolInfo().address }}</p> }
              </div>
              <div class="print-student-photo-box">
                @if ($any(student().profile)?.photo_url) {
                  <img [src]="$any(student().profile)?.photo_url" alt="صورة الطالب" class="print-student-photo" />
                } @else {
                  <div class="print-photo-placeholder">صورة الطالب</div>
                }
              </div>
            </div>

            <!-- الفاصل الهندسي الفاخر -->
            <div class="print-geometric-divider">
              <span class="print-geometric-diamond"></span>
            </div>

            <h2 class="print-title">شهادة نتائج الفصل الدراسي الثاني</h2>

            <!-- تفاصيل الطالب -->
            <div class="print-student-info">
              <div class="info-item"><strong>اسم الطالب:</strong> {{ student().profile.arabic_name }}</div>
              <div class="info-item"><strong>الرقم الأكاديمي:</strong> {{ student().student_number }}</div>
              <div class="info-item"><strong>المرحلة/الصف:</strong> {{ $any(student())?.enrollments?.[0]?.grade_level || 'الصف العاشر' }}</div>
              <div class="info-item"><strong>الجنسية:</strong> {{ student().profile.nationality || '—' }}</div>
              <div class="info-item"><strong>العام الدراسي:</strong> {{ academicYearLabel() }}</div>
              <div class="info-item"><strong>تاريخ الإصدار:</strong> {{ today() }}</div>
            </div>

            <!-- جدول الدرجات الفعلي -->
            <table class="print-table">
              <thead>
                <tr>
                  <th>المادة الدراسية</th>
                  <th>أعمال السنة (30)</th>
                  <th>الامتحان النهائي (70)</th>
                  <th>المجموع المئوي (100)</th>
                  <th>التقدير</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let grade of studentGrades()">
                  <td>{{ grade.subject }}</td>
                  <td class="center">{{ grade.classwork }}</td>
                  <td class="center">{{ grade.finalExam }}</td>
                  <td class="center bold">{{ grade.score }}%</td>
                  <td class="center bold">{{ grade.score >= 90 ? 'ممتاز' : grade.score >= 75 ? 'جيد جداً' : 'مقبول' }}</td>
                </tr>
              </tbody>
            </table>

            <!-- إحصائيات المعدل -->
            <div class="print-summary">
              <div class="summary-box">
                <span>المعدل التراكمي العام: <strong>94.2%</strong></span>
                <span>التقدير العام: <strong>ممتاز (A+)</strong></span>
              </div>
            </div>

            <!-- التوقيعات والختم -->
            <div class="print-signatures-stamps">
              <div class="sig-box">
                <p>مربّي الصف</p>
                <div class="sig-line"></div>
              </div>
              
              <div class="stamp-box">
                <p>ختم المدرسة الرسمي</p>
                <img [src]="schoolInfo().stamp_url" alt="ختم المدرسة" class="print-school-stamp" />
              </div>

              <div class="sig-box">
                <p>مدير المدرسة</p>
                <div class="sig-line"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- نافذة رفع وثيقة جديدة مباشرة مع الضغط الفائق اللحظي -->
        @if (showUploadModal()) {
          <div class="modal-backdrop" (click)="closeUploadModal()">
            <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <div class="modal-title-box">
                  <span class="modal-header-icon">📤</span>
                  <div>
                    <h3 class="modal-title">رفع وثيقة ومستند للطالب مباشرة</h3>
                    <p class="modal-subtitle">المستند يُحفظ فوراً في السحابة الآمنة للمؤسسة مع ضغط فائق ذكي لتقليص استهلاك الإنترنت.</p>
                  </div>
                </div>
                <button type="button" class="close-btn" (click)="closeUploadModal()">✖</button>
              </div>

              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">نوع الوثيقة <span class="req">*</span></label>
                    <select class="form-select" [(ngModel)]="uploadDocType" (ngModelChange)="onDocTypeChange($event)">
                      <option value="national_id">الرقم الوطني / الهوية السودانية</option>
                      <option value="birth_certificate">شهادة الميلاد الرسمية</option>
                      <option value="passport">جواز السفر</option>
                      <option value="medical_report">تقرير طبي / فحص سريري</option>
                      <option value="academic_certificate">شهادة أكاديمية / نقل من مدرسة سابقة</option>
                      <option value="transfer_certificate">شهادة انتقال</option>
                      <option value="photo">صورة شخصية رسمية</option>
                      <option value="custom">وثيقة / مستند إضافي آخر</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">عنوان أو مسمى الوثيقة</label>
                    <input type="text" class="form-input" [(ngModel)]="uploadDocTitle" placeholder="مثال: شهادة ميلاد الطالب الأصلية" />
                  </div>
                </div>

                <!-- تنبيه منع تكرار نوع أو مسمى الوثيقة -->
                @if (isDuplicateType()) {
                  <div class="duplicate-warning-box">
                    <span class="warn-icon">⚠️</span>
                    <div class="warn-text">
                      <strong>تنبيه: نوع الوثيقة مسجل مسبقاً لهذا الطالب!</strong>
                      <p>توجد وثيقة مسجلة مسبقاً من نوع «{{ getDocTypeDisplay(uploadDocType) }}». لمنع التكرار، يرجى حذف الوثيقة السابقة أولاً إذا كنت ترغب في استبدالها.</p>
                    </div>
                  </div>
                }
                @if (isDuplicateName()) {
                  <div class="duplicate-warning-box">
                    <span class="warn-icon">⚠️</span>
                    <div class="warn-text">
                      <strong>تنبيه: مسمى الوثيقة مسجل مسبقاً!</strong>
                      <p>يوجد ملف مسجل مسبقاً للطالب بنفس العنوان. يرجى اختيار مسمى آخر أو حذف الملف القديم.</p>
                    </div>
                  </div>
                }

                <!-- منطقة السحب والإفلات / اختيار الملف -->
                <div class="dropzone" [class.has-file]="!!selectedFile()" [class.dragging]="isDragging()"
                     (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onFileDropped($event)"
                     (click)="docFileInputRef.click()">
                  <input type="file" #docFileInputRef (change)="onFileSelected($event)" style="display: none;" accept="image/*,application/pdf" />
                  
                  @if (!selectedFile()) {
                    <div class="dropzone-content">
                      <div class="upload-icon-anim">☁️</div>
                      <p class="dropzone-title">اسحب وأفلت الملف هنا أو <span>تصفح جهازك</span></p>
                      <p class="dropzone-hint">يدعم الصور (JPG, PNG, WebP) وملفات PDF — الحد الأقصى 10 ميجابايت</p>
                    </div>
                  } @else {
                    <div class="selected-file-box">
                      <div class="file-icon-box">
                        {{ isSelectedFilePdf() ? '📄' : '🖼️' }}
                      </div>
                      <div class="file-details">
                        <span class="file-name">{{ selectedFile()?.name }}</span>
                        <span class="file-meta">الحجم الأصلي: {{ compressionResult()?.originalFormatted }}</span>
                      </div>
                      <button type="button" class="change-file-btn" (click)="$event.stopPropagation(); docFileInputRef.click()">
                        تغيير الملف
                      </button>
                    </div>
                  }
                </div>

                <!-- بطاقة مؤشر الضغط الفائق اللحظي -->
                @if (compressionResult()) {
                  <div class="compression-stat-box" [class.compressed]="compressionResult()?.wasCompressed">
                    @if (compressionResult()?.wasCompressed) {
                      <div class="comp-badge">⚡ ميزة الضغط الفائق في المتصفح (Ultra Client-side Compression)</div>
                      <div class="comp-grid">
                        <div class="comp-col">
                          <span class="comp-lbl">الحجم الأصلي</span>
                          <span class="comp-val strikethrough">{{ compressionResult()?.originalFormatted }}</span>
                        </div>
                        <div class="comp-arrow">←</div>
                        <div class="comp-col">
                          <span class="comp-lbl">الحجم بعد الضغط</span>
                          <span class="comp-val highlight">{{ compressionResult()?.compressedFormatted }}</span>
                        </div>
                        <div class="comp-col savings">
                          <span class="comp-lbl">نسبة التوفير</span>
                          <span class="comp-val badge-saved">📉 وفرت {{ compressionResult()?.savedPercentage }}%</span>
                        </div>
                      </div>
                      <p class="comp-note">
                        تم ضغط الصورة بنجاح فائق وتجهيزها بأحدث معايير الويب مع بقاء النصوص والبيانات حادة وقابلة للقراءة بوضوح.
                      </p>
                    } @else {
                      <div class="comp-pdf-note">
                        <span>📄</span>
                        <span>الملف جاهز للرفع المباشر بحجم <strong>{{ compressionResult()?.originalFormatted }}</strong>.</span>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="modal-footer">
                <button type="button" class="nb-btn-secondary" (click)="closeUploadModal()" [disabled]="uploadingAttachment()">
                  إلغاء
                </button>
                <button type="button" class="nb-btn-primary" (click)="submitUpload()" [disabled]="!selectedFile() || uploadingAttachment() || isDuplicateType() || isDuplicateName()">
                  @if (uploadingAttachment()) {
                    <span>جارٍ الرفع والحفظ…</span>
                  } @else {
                    <span>🚀 تأكيد ورفع الوثيقة</span>
                  }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- نافذة معاينة الوثيقة الفورية -->
        @if (previewDoc()) {
          <div class="modal-backdrop" (click)="previewDoc.set(null)">
            <div class="modal-card modal-preview" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3 class="modal-title">{{ previewDoc()?.file_name || previewDoc()?.title || 'معاينة الوثيقة' }}</h3>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <a [href]="previewDoc()?.file_url" target="_blank" download class="nb-btn-secondary sm">تحميل 📥</a>
                  <button type="button" class="close-btn" (click)="previewDoc.set(null)">✖</button>
                </div>
              </div>
              <div class="modal-body preview-body">
                @if (isPdf(previewDoc()?.file_url)) {
                  <iframe [src]="getSafeUrl(previewDoc()?.file_url)" class="preview-iframe"></iframe>
                } @else {
                  <img [src]="previewDoc()?.file_url" alt="معاينة الوثيقة" class="preview-img" />
                }
              </div>
            </div>
          </div>
        }

        </div>
      }
    }
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    
    /* الهيدر المطور */
    .summary-card {
      padding: 24px;
      margin-bottom: 20px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }
    .summary-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 24px;
    }
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    /* الصورة الرمزية التفاعلية */
    .avatar-wrapper {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      position: relative;
      cursor: pointer;
      overflow: hidden;
      border: 3px solid var(--nb-border-soft);
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
      background: var(--nb-surface-raised);
    }
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
      color: var(--nb-primary-600);
      background: var(--nb-primary-50);
    }
    .avatar-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 24px;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .avatar-wrapper:hover .avatar-overlay {
      opacity: 1;
    }

    .basic-info h2 { font-size: 22px; font-weight: 700; margin: 0; color: var(--nb-text); }
    .eng-name { color: var(--nb-text-muted); margin: 2px 0 10px; font-size: 13.5px; }
    .badge-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .num-badge { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 2px 8px; border-radius: var(--nb-radius-sm); font-size: 12px; color: var(--nb-text-secondary); }
    
    .academic-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .academic-badge.grade-badge {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .academic-badge.section-badge {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .academic-badge.year-badge {
      background: #f8fafc;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    
    .quick-stats { display: flex; gap: 24px; flex-wrap: wrap; }
    .stat-item { display: flex; flex-direction: column; align-items: flex-start; }
    .stat-item .label { font-size: 11px; color: var(--nb-text-muted); }
    .stat-item .val { font-size: 14.5px; font-weight: 600; color: var(--nb-text); margin-top: 2px; }
    .stat-item.highlight .val { color: var(--nb-primary-600); font-weight: 700; }
    
    .action-bar { display: flex; align-items: center; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--nb-border-soft); flex-wrap: wrap; }
    .action-bar .spacer { flex: 1; }
    .print-btn { display: inline-flex; align-items: center; gap: 6px; }
    .print-btn .pico { font-size: 14px; line-height: 1; }

    /* القائمة المنسدلة للعمليات العلوية */
    .actions-dropdown-wrap { position: relative; display: inline-block; }
    .actions-dropdown-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }
    .actions-dropdown-trigger.active,
    .actions-dropdown-trigger:hover {
      background: var(--nb-surface-raised, #f1f5f9);
      border-color: var(--nb-primary-400, #93c5fd);
    }
    .actions-dropdown-trigger .caret {
      font-size: 10px;
      transition: transform 0.2s ease;
      color: var(--nb-text-muted);
    }
    .actions-dropdown-trigger .caret.open {
      transform: rotate(180deg);
    }

    .actions-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 280px;
      background: #ffffff;
      border: 1px solid var(--nb-border, #e2e8f0);
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      z-index: 1000;
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: dropdownFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownFadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .actions-dropdown-menu .menu-header {
      font-size: 11px;
      font-weight: 700;
      color: var(--nb-text-muted, #64748b);
      padding: 6px 10px 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .actions-dropdown-menu .menu-divider {
      height: 1px;
      background: var(--nb-border-soft, #f1f5f9);
      margin: 4px 0;
    }
    .actions-dropdown-menu .menu-divider.danger {
      background: #fee2e2;
    }

    .actions-dropdown-menu .menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border: none;
      background: transparent;
      border-radius: 8px;
      text-align: right;
      cursor: pointer;
      width: 100%;
      text-decoration: none;
      color: var(--nb-text, #1e293b);
      transition: background 0.15s ease, color 0.15s ease;
      box-sizing: border-box;
    }
    .actions-dropdown-menu .menu-item:hover:not(:disabled) {
      background: var(--nb-primary-50, #eff6ff);
      color: var(--nb-primary-700, #1d4ed8);
    }
    .actions-dropdown-menu .menu-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .actions-dropdown-menu .menu-item.danger {
      color: #dc2626;
    }
    .actions-dropdown-menu .menu-item.danger:hover:not(:disabled) {
      background: #fef2f2;
      color: #b91c1c;
    }

    .actions-dropdown-menu .item-icon {
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: var(--nb-surface-raised, #f8fafc);
      flex-shrink: 0;
    }
    .actions-dropdown-menu .menu-item.danger .item-icon {
      background: #fee2e2;
    }
    .actions-dropdown-menu .item-info {
      display: flex;
      flex-direction: column;
      text-align: right;
      flex: 1;
      min-width: 0;
    }
    .actions-dropdown-menu .item-title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
    }
    .actions-dropdown-menu .item-desc {
      font-size: 11px;
      color: var(--nb-text-muted, #64748b);
      line-height: 1.2;
      margin-top: 1px;
    }

    /* التبويبات */
    .tabs-card {
      padding: 16px 20px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card);
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
    }
    .tab-content { padding: 20px 4px; }
    .tab-content h3 { color: var(--nb-primary-600); font-size: 14.5px; margin: 0 0 14px; font-weight: 700; }
    
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .info-item { background: var(--nb-surface-raised); padding: 14px; border-radius: var(--nb-radius-card); border: 1px solid var(--nb-border-soft); font-size: 13px; color: var(--nb-text); }
    .info-item strong { color: var(--nb-text-muted); display: block; margin-bottom: 6px; font-weight: 600; }
    .blood-group { font-weight: 700; color: var(--nb-danger); }

    .tag-list { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
    .tag.danger { background: #fee2e2; color: #ef4444; }
    .tag.warning { background: #fef3c7; color: #d97706; }
    .tag.info { background: #e0f2fe; color: #0284c7; }

    /* أولياء الأمور */
    .family-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }
    .guardian-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .member-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .member-header h4 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .badge { font-size: 10.5px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .badge.info { background: #e0f2fe; color: #0284c7; }
    .badge.success { background: #dcfce7; color: #15803d; }
    .badge.warning { background: #fef3c7; color: #b45309; }
    .badge.danger { background: #fee2e2; color: #b91c1c; }

    /* المالية */
    .finance-header-box {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .fin-stat-card {
      background: var(--nb-surface-raised);
      border: 1px solid var(--nb-border-soft);
      padding: 16px;
      border-radius: var(--nb-radius-card);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .fin-link {
      grid-column: 1 / -1;
      align-self: start;
      font-size: 13px;
      font-weight: 600;
      color: var(--nb-primary-600);
      cursor: pointer;
    }
    .fin-link:hover { color: var(--nb-primary-700); text-decoration: underline; }
    .fin-label { font-size: 11.5px; color: var(--nb-text-muted); }
    .fin-value { font-size: 18px; font-weight: 700; color: var(--nb-text); }
    .text-danger { color: #ef4444; }
    .text-success { color: #22c55e; }

    .no-data-box {
      text-align: center;
      padding: 40px 20px;
      color: var(--nb-text-muted);
    }
    .no-data-box .icon { font-size: 40px; }
    .no-data-box h4 { margin: 10px 0 6px; font-size: 15px; color: var(--nb-text); }
    .no-data-box p { font-size: 12.5px; margin: 0; }

    /* الحضور */
    .attendance-summary {
      display: flex;
      align-items: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    .attendance-circle {
      width: 120px;
      height: 120px;
    }
    .circular-chart {
      display: block;
      max-width: 100%;
      max-height: 100%;
    }
    .circle-bg {
      fill: none;
      stroke: var(--nb-border-soft);
      stroke-width: 2.8;
    }
    .circle {
      fill: none;
      stroke: var(--nb-primary-600);
      stroke-width: 2.8;
      stroke-linecap: round;
      animation: progress 1.2s ease-out forwards;
    }
    .percentage {
      fill: var(--nb-text);
      font-family: var(--nb-font-family);
      font-size: 8px;
      font-weight: 700;
      text-anchor: middle;
    }
    .attendance-stats-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    .att-card {
      padding: 14px;
      border-radius: var(--nb-radius-card);
      border: 1px solid var(--nb-border-soft);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .att-card.present { border-right: 4px solid #22c55e; background: #f0fdf4; }
    .att-card.absent { border-right: 4px solid #ef4444; background: #fef2f2; }
    .att-card.late { border-right: 4px solid #eab308; background: #fefce8; }
    .att-card .label { font-size: 11px; color: var(--nb-text-muted); }
    .att-card .count { font-size: 15px; font-weight: 700; color: var(--nb-text); }

    /* الجداول */
    .tbl { display: flex; flex-direction: column; border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); overflow: hidden; }
    .tbl-head, .tbl-row { display: grid; gap: 12px; padding: 12px 18px; align-items: center; }
    .tbl-head.doc, .tbl-row.doc { grid-template-columns: 1.4fr 1.4fr 1fr; }
    .tbl-head.finance-tbl, .tbl-row.finance-tbl { grid-template-columns: 1.2fr 1fr 1fr 1fr 1fr; }
    .tbl-head.receipts-tbl, .tbl-row.receipts-tbl { grid-template-columns: 1.2fr 1fr 1fr 1fr; }
    .tbl-row.clickable { cursor: pointer; }
    .tbl-row.clickable:hover { background: var(--nb-surface-raised); }
    .tbl-head.library-tbl, .tbl-row.library-tbl { grid-template-columns: 1.6fr 1fr 1fr 1fr; }
    .tbl-head.clinic-tbl, .tbl-row.clinic-tbl { grid-template-columns: 1.2fr 1.8fr 1.8fr 1fr; }
    
    .tbl-head { background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border-soft); font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .tbl-row { border-bottom: 1px solid var(--nb-border-row); font-size: 13px; color: var(--nb-text); }
    .tbl-row:last-child { border-bottom: none; }
    .strong { font-weight: 600; }

    /* أنماط معرض الوثائق والملفات */
    .docs-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .docs-title, .timeline-title {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 700;
      color: var(--nb-text);
    }
    .count-pill {
      display: inline-flex;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid #bfdbfe;
    }
    .section-subtext {
      margin: 4px 0 0;
      color: var(--nb-text-muted);
      font-size: 12.5px;
    }
    .docs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .doc-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    }
    .doc-card:hover {
      transform: translateY(-2px);
      border-color: var(--nb-primary-400);
      box-shadow: 0 8px 20px rgba(0,0,0,0.05);
    }
    .doc-card-top {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .doc-type-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--nb-surface-raised);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
      border: 1px solid var(--nb-border-soft);
    }
    .doc-info {
      flex: 1;
      min-width: 0;
    }
    .doc-title {
      margin: 0 0 4px;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--nb-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .doc-meta-tags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .doc-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
    }
    .doc-badge.type {
      background: var(--nb-surface-raised);
      color: var(--nb-text-secondary);
      border: 1px solid var(--nb-border-soft);
    }
    .doc-badge.size {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }
    .doc-card-details {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--nb-text-muted);
      padding-top: 8px;
      border-top: 1px dashed var(--nb-border-soft);
    }
    .doc-ext {
      font-weight: 700;
      background: var(--nb-surface-raised);
      padding: 1px 6px;
      border-radius: 4px;
    }
    .doc-card-actions {
      display: flex;
      gap: 6px;
      margin-top: auto;
      padding-top: 8px;
    }
    .action-btn {
      flex: 1;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--nb-border);
      background: var(--nb-surface);
      color: var(--nb-text);
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: var(--nb-surface-raised);
    }
    .action-btn.preview {
      color: var(--nb-primary-700);
      border-color: var(--nb-primary-200);
      background: var(--nb-primary-50);
    }
    .action-btn.preview:hover {
      background: var(--nb-primary-100);
    }
    .action-btn.download {
      color: #0284c7;
      border-color: #bae6fd;
      background: #f0f9ff;
    }
    .action-btn.download:hover {
      background: #e0f2fe;
    }
    .action-btn.delete {
      flex: 0 0 34px;
      color: #dc2626;
      border-color: #fecaca;
      background: #fef2f2;
    }
    .action-btn.delete:hover {
      background: #fee2e2;
    }
    .empty-docs-box {
      text-align: center;
      padding: 40px 20px;
      background: var(--nb-surface-raised);
      border: 2px dashed var(--nb-border);
      border-radius: var(--nb-radius-card);
      margin-bottom: 28px;
    }
    .empty-icon {
      font-size: 44px;
      margin-bottom: 8px;
    }
    .empty-docs-box h4 {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
      color: var(--nb-text);
    }
    .empty-docs-box p {
      margin: 0 0 16px;
      font-size: 12.5px;
      color: var(--nb-text-muted);
      max-width: 440px;
      margin-left: auto;
      margin-right: auto;
      line-height: 1.5;
    }

    /* الخط الزمني المطور */
    .timeline-section-header {
      margin-top: 10px;
      margin-bottom: 18px;
    }
    .timeline-v2 {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-right: 32px;
      gap: 16px;
    }
    .timeline-v2::before {
      content: '';
      position: absolute;
      right: 15px;
      top: 10px;
      bottom: 10px;
      width: 2px;
      background: var(--nb-border-soft);
    }
    .timeline-node {
      display: flex;
      gap: 16px;
      position: relative;
    }
    .timeline-axis {
      position: relative;
    }
    .node-icon-bubble {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #fff;
      position: absolute;
      right: -32px;
      top: 10px;
      border: 2px solid var(--nb-surface);
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      z-index: 2;
    }
    .timeline-card {
      flex: 1;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius-card);
      padding: 14px 18px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      transition: all 0.15s;
    }
    .timeline-card:hover {
      border-color: var(--nb-border);
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
    }
    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .node-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .node-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      background: var(--nb-surface-raised);
    }
    .node-title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      color: var(--nb-text);
    }
    .node-time {
      font-size: 11.5px;
      color: var(--nb-text-muted);
      direction: ltr;
      text-align: left;
    }
    .node-desc {
      margin: 0;
      font-size: 12.5px;
      color: var(--nb-text-secondary);
      line-height: 1.5;
    }
    .node-attachment-preview {
      margin-top: 10px;
      padding: 8px 12px;
      background: var(--nb-surface-raised);
      border-radius: 8px;
      border: 1px dashed var(--nb-border-soft);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .att-thumb-info {
      font-size: 12px;
      color: var(--nb-text);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .att-size {
      color: var(--nb-text-muted);
      font-size: 11px;
    }

    /* نوافذ Nebras OS المنبثقة للرفع والمعاينة */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-card {
      background: var(--nb-surface);
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      width: 100%;
      max-width: 540px;
      border: 1px solid var(--nb-border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-card.modal-preview {
      max-width: 860px;
      max-height: 90vh;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--nb-border-soft);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--nb-surface-raised);
    }
    .modal-title-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .modal-header-icon {
      font-size: 24px;
    }
    .modal-title {
      margin: 0;
      font-size: 15.5px;
      font-weight: 700;
      color: var(--nb-text);
    }
    .modal-subtitle {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--nb-text-muted);
    }
    .close-btn {
      background: none;
      border: none;
      font-size: 16px;
      color: var(--nb-text-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .close-btn:hover {
      background: rgba(0,0,0,0.06);
      color: var(--nb-text);
    }
    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }
    .preview-body {
      padding: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 380px;
      max-height: calc(85vh - 70px);
    }
    .preview-img {
      max-width: 100%;
      max-height: calc(85vh - 90px);
      object-fit: contain;
      border-radius: 8px;
    }
    .preview-iframe {
      width: 100%;
      height: 75vh;
      border: none;
      border-radius: 8px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .form-row { grid-template-columns: 1fr; }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--nb-text);
    }
    .form-label .req {
      color: #dc2626;
    }
    .form-select, .form-input {
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid var(--nb-border);
      background: var(--nb-surface);
      color: var(--nb-text);
      font-size: 13px;
      outline: none;
      font-family: inherit;
      transition: border-color 0.15s;
    }
    .form-select:focus, .form-input:focus {
      border-color: var(--nb-primary-600);
      box-shadow: 0 0 0 2px rgba(37,99,235,0.1);
    }
    .dropzone {
      border: 2px dashed #93c5fd;
      background: #f8fafc;
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .dropzone:hover, .dropzone.dragging {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .dropzone.has-file {
      border-style: solid;
      border-color: #22c55e;
      background: #f0fdf4;
      padding: 14px;
    }
    .upload-icon-anim {
      font-size: 34px;
      margin-bottom: 6px;
    }
    .dropzone-title {
      margin: 0 0 4px;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--nb-text);
    }
    .dropzone-title span {
      color: #2563eb;
      text-decoration: underline;
    }
    .dropzone-hint {
      margin: 0;
      font-size: 11.5px;
      color: var(--nb-text-muted);
    }
    .selected-file-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .file-icon-box {
      font-size: 26px;
    }
    .file-details {
      flex: 1;
      text-align: right;
      min-width: 0;
    }
    .file-name {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: var(--nb-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-meta {
      font-size: 11.5px;
      color: var(--nb-text-muted);
    }
    .change-file-btn {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--nb-surface);
      border: 1px solid var(--nb-border);
      cursor: pointer;
    }
    .compression-stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .compression-stat-box.compressed {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .comp-badge {
      font-size: 12px;
      font-weight: 700;
      color: #047857;
      margin-bottom: 8px;
      display: inline-block;
    }
    .comp-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .comp-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .comp-lbl {
      font-size: 10.5px;
      color: var(--nb-text-muted);
    }
    .comp-val {
      font-size: 13px;
      font-weight: 700;
      color: var(--nb-text);
    }
    .comp-val.strikethrough {
      text-decoration: line-through;
      color: #94a3b8;
    }
    .comp-val.highlight {
      color: #047857;
    }
    .badge-saved {
      background: #059669;
      color: #fff;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .comp-arrow {
      color: var(--nb-text-muted);
      font-size: 16px;
    }
    .comp-note {
      margin: 8px 0 0;
      font-size: 11.5px;
      color: #065f46;
      line-height: 1.4;
    }
    .comp-pdf-note {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--nb-text);
    }
    .duplicate-warning-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      color: #92400e;
    }
    .warn-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .warn-text strong {
      display: block;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .warn-text p {
      margin: 0;
      font-size: 12px;
      line-height: 1.4;
    }
    .modal-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--nb-border-soft);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: var(--nb-surface-raised);
    }

    .nb-divider { border: 0; border-top: 1px solid var(--nb-border-soft); margin: 24px 0; }
    .loading { text-align: center; padding: 40px; color: var(--nb-text-muted); font-size: 13px; }
    .no-data { text-align: center; padding: 28px; color: var(--nb-text-muted); font-size: 13px; }
    .tbl-empty { padding: 24px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }

    /* لوحة الدرجات والامتحانات */
    .gpa-card {
      background: linear-gradient(135deg, var(--nb-primary-600, #007aff) 0%, var(--nb-primary-800, #0056b3) 100%);
      color: #fff;
      border-radius: var(--nb-radius-card);
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      box-shadow: 0 8px 30px rgba(0, 122, 255, 0.15);
    }
    .gpa-info { display: flex; flex-direction: column; gap: 4px; }
    .gpa-title { font-size: 13px; opacity: 0.85; font-weight: 500; }
    .gpa-value { font-size: 38px; font-weight: 800; letter-spacing: -0.5px; }
    .gpa-grade { font-size: 14px; font-weight: 600; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; width: fit-content; margin-top: 4px; }
    .gpa-stats { display: flex; gap: 24px; }
    .stat-mini { display: flex; flex-direction: column; gap: 4px; text-align: left; }
    .stat-mini .lbl { font-size: 11px; opacity: 0.8; }
    .stat-mini .val { font-size: 18px; font-weight: 700; }
    
    .subjects-grades-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .subject-grade-card {
      background: var(--nb-surface);
      border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius-card);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s;
    }
    .subject-grade-card:hover {
      border-color: var(--nb-primary-300);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
    }
    .subject-grade-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .subject-name { font-weight: 700; color: var(--nb-text); font-size: 14px; }
    .grade-percent { font-size: 16px; font-weight: 800; }
    .grade-percent.excellent { color: var(--nb-success, #10b981); }
    .grade-percent.good { color: var(--nb-info, #007aff); }
    .grade-percent.warn { color: var(--nb-warning, #f59e0b); }
    
    .progress-bar-bg {
      height: 6px;
      background: var(--nb-surface-raised, #f1f5f9);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s ease-in-out;
    }
    .progress-bar-fill.excellent { background: var(--nb-success, #10b981); }
    .progress-bar-fill.good { background: var(--nb-info, #007aff); }
    .progress-bar-fill.warn { background: var(--nb-warning, #f59e0b); }
    
    .score-breakdown {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      color: var(--nb-text-muted);
    }
    .score-breakdown strong { color: var(--nb-text-secondary); }

    .exams-tbl {
      grid-template-columns: 2fr 1.5fr 1.2fr 1.2fr 1.5fr 1fr;
    }

    .grades-header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    
    /* أنماط الطباعة */
    .print-only-container { display: none; }
  `]
})
export class StudentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentsService = inject(StudentsService);
  private sfService = inject(StudentFinanceService);
  private clinicService = inject(ClinicService);
  private libraryService = inject(LibraryService);
  private examService = inject(ExaminationsService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private http = inject(HttpClient);

  private sanitizer = inject(DomSanitizer);

  student = this.studentsService.selectedStudent;
  readonly pageLoading = signal<boolean>(true);
  readonly financeLoading = signal<boolean>(true);
  timeline = signal<any[]>([]);

  deleteStudent(s: any): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'تأكيد حذف الطالب',
        message: `هل أنت متأكد من حذف الطالب «${s.profile.arabic_name}» نهائياً؟ سيتم نقل الملف إلى سلة المحذوفات.`,
        confirmText: 'حذف الطالب',
        color: 'warn',
      },
    });

    ref.afterClosed().subscribe((ok: boolean) => {
      if (!ok) return;
      this.studentsService.deleteStudent(s.id).subscribe({
        next: () => {
          this.snack.open('تم حذف الطالب بنجاح', 'إغلاق', { duration: 5000 });
          this.router.navigate(['/students/list']);
        },
        error: (err) => {
          this.snack.open(err?.error?.message || 'تعذّر حذف الطالب. حاول مجددًا.', 'إغلاق', { duration: 5000 });
        }
      });
    });
  }
  billingAccount = signal<any | null>(null);
  invoices = signal<any[]>([]);
  receipts = signal<any[]>([]);
  paymentMethods = signal<any[]>([]);
  doc = signal<SfDoc>(null);
  totalPaid = computed(() => this.invoices().reduce((s, i) => s + (Number(i.paid_amount) || 0), 0));
  totalCollected = computed(() => this.receipts().reduce((s, r) => s + (Number(r.amount) || 0), 0));

  studentVisits = signal<any[]>([]);
  studentBorrows = signal<any[]>([]);
  books = signal<any[]>([]);
  copies = signal<any[]>([]);

  openDoc(type: 'invoice' | 'receipt' | 'receivable', data: any) { this.doc.set({ type, data }); }

  // درجات المواد وجدول الامتحانات — تُملأ من نتائج الامتحانات الحقيقية للطالب.
  studentGrades = signal<any[]>([]);
  examSchedule = signal<any[]>([]);

  /** المعدل العام (%) من متوسط نتائج الطالب. */
  readonly avgScore = computed(() => {
    const g = this.studentGrades();
    if (!g.length) return 0;
    return g.reduce((s, x) => s + (Number(x.score) || 0), 0) / g.length;
  });
  /** تسمية التقدير من المعدل. */
  readonly avgGradeLabel = computed(() => {
    const v = this.avgScore();
    if (v >= 95) return 'ممتاز مرتفع (A+)';
    if (v >= 90) return 'ممتاز (A)';
    if (v >= 80) return 'جيد جداً (B)';
    if (v >= 70) return 'جيد (C)';
    if (v >= 60) return 'مقبول (D)';
    return 'راسب (F)';
  });
  readonly passedCount = computed(() => this.studentGrades().filter((g) => g.passed).length);

  readonly documents = computed(() => this.timeline().filter((e) => e.type === 'document_upload'));
  schoolInfo = signal<any>(null);
  readonly activatingStudent = signal(false);
  readonly activatingGuardianId = signal<string | null>(null);

  // إشارات الوثائق المرفوعة ومحرك الضغط الفائق
  attachments = signal<any[]>([]);
  readonly loadingAttachments = signal<boolean>(true);
  uploadDocType = 'national_id';
  uploadDocTitle = 'الرقم الوطني / الهوية السودانية';
  readonly selectedFile = signal<File | null>(null);
  readonly compressedFile = signal<File | null>(null);
  readonly compressionResult = signal<CompressionResult | null>(null);
  readonly uploadingAttachment = signal<boolean>(false);
  readonly showUploadModal = signal<boolean>(false);
  readonly previewDoc = signal<any | null>(null);
  readonly isDragging = signal<boolean>(false);

  // حالة قائمة العمليات العلوية المنسدلة
  readonly showActionsMenu = signal(false);

  toggleActionsMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showActionsMenu.update((v) => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showActionsMenu()) {
      this.showActionsMenu.set(false);
    }
  }

  /** تحديث جزئي لحظي (Ajax) لقسم الوثائق والخط الزمني فقط دون إعادة تحميل بقية أجزاء الصفحة */
  refreshAttachmentsAndTimeline(): void {
    this.loadingAttachments.set(true);
    this.studentsService.getStudentAttachments(this.id).subscribe({
      next: (res) => {
        const list = res?.data ?? res ?? [];
        this.attachments.set(Array.isArray(list) ? list : []);
        this.loadingAttachments.set(false);
      },
      error: () => this.loadingAttachments.set(false),
    });

    this.studentsService.getTimeline(this.id).subscribe((res) => {
      if (res && res.success) this.timeline.set(res.data || []);
    });
  }

  openUploadModal(): void {
    this.uploadDocType = 'national_id';
    this.uploadDocTitle = 'الرقم الوطني / الهوية السودانية';
    this.selectedFile.set(null);
    this.compressedFile.set(null);
    this.compressionResult.set(null);
    this.uploadingAttachment.set(false);
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    if (this.uploadingAttachment()) return;
    this.showUploadModal.set(false);
  }

  onDocTypeChange(val: string): void {
    this.uploadDocType = val;
    const titles: Record<string, string> = {
      national_id: 'الرقم الوطني / الهوية السودانية',
      birth_certificate: 'شهادة الميلاد الرسمية',
      passport: 'جواز السفر',
      medical_report: 'التقرير الطبي والفحوصات',
      academic_certificate: 'الشهادة الأكاديمية السابقة',
      transfer_certificate: 'شهادة انتقال',
      photo: 'الصورة الشخصية الرسمية',
      custom: 'وثيقة / مستند إضافي',
    };
    if (!this.uploadDocTitle || Object.values(titles).includes(this.uploadDocTitle)) {
      this.uploadDocTitle = titles[val] || 'وثيقة رسمية';
    }
  }

  async handleFile(file: File): Promise<void> {
    this.selectedFile.set(file);
    const result = await compressFile(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.78 });
    this.compressionResult.set(result);
    this.compressedFile.set(result.file);
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) this.handleFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  isSelectedFilePdf(): boolean {
    const f = this.selectedFile();
    return !!f && (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  }

  isDuplicateType(): boolean {
    if (this.uploadDocType === 'custom') return false;
    return this.attachments().some(a => a.attachment_type === this.uploadDocType && !a.deleted_at);
  }

  isDuplicateName(): boolean {
    const title = (this.uploadDocTitle || '').trim().toLowerCase();
    if (!title) return false;
    return this.attachments().some(a => (a.file_name || '').trim().toLowerCase() === title && !a.deleted_at);
  }

  getDocTypeDisplay(type: string): string {
    const map: Record<string, string> = {
      national_id: 'الرقم الوطني / الهوية السودانية',
      birth_certificate: 'شهادة الميلاد الرسمية',
      passport: 'جواز السفر',
      medical_report: 'التقرير الطبي والفحوصات',
      academic_certificate: 'الشهادة الأكاديمية السابقة',
      transfer_certificate: 'شهادة انتقال',
      photo: 'الصورة الشخصية الرسمية',
      custom: 'وثيقة / مستند إضافي',
    };
    return map[type] || 'وثيقة رسمية';
  }

  submitUpload(): void {
    if (this.isDuplicateType()) {
      this.snack.open(`توجد وثيقة مسجلة مسبقاً لهذا الطالب من نوع «${this.getDocTypeDisplay(this.uploadDocType)}». يرجى حذفها أولاً.`, 'إغلاق', { duration: 4500 });
      return;
    }
    if (this.isDuplicateName()) {
      this.snack.open('يوجد ملف مسجل مسبقاً للطالب بنفس المسمى. يرجى اختيار مسمى آخر.', 'إغلاق', { duration: 4500 });
      return;
    }

    const fileToUpload = this.compressedFile() || this.selectedFile();
    if (!fileToUpload) {
      this.snack.open('يرجى اختيار ملف الوثيقة أولاً', 'إغلاق', { duration: 3000 });
      return;
    }
    this.uploadingAttachment.set(true);
    const type = this.uploadDocType;
    const title = this.uploadDocTitle || fileToUpload.name;

    this.studentsService.uploadStudentAttachment(this.id, fileToUpload, type, title).subscribe({
      next: (res) => {
        this.uploadingAttachment.set(false);
        const successMsg = res?.message || 'تم رفع الوثيقة بنجاح وحفظها في السحابة';
        this.snack.open(successMsg, 'إغلاق', { duration: 4000 });
        this.showUploadModal.set(false);
        this.refreshAttachmentsAndTimeline();
      },
      error: (err) => {
        this.uploadingAttachment.set(false);
        const errorMsg = err?.error?.message || err?.error?.detail || (typeof err?.error === 'string' ? err.error : 'تعذر رفع الوثيقة. حاول مجدداً.');
        this.snack.open(errorMsg, 'إغلاق', { duration: 5000 });
      }
    });
  }

  viewDoc(doc: any): void {
    this.previewDoc.set(doc);
  }

  isPdf(url?: string): boolean {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf');
  }

  getSafeUrl(url?: string): SafeResourceUrl {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  formatSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  getFileExt(url?: string): string {
    if (!url) return 'FILE';
    const clean = url.split('?')[0];
    const parts = clean.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
  }

  getDocTypeIcon(type: string): string {
    switch (type) {
      case 'national_id': return '🪪';
      case 'birth_certificate': return '📜';
      case 'passport': return '🛂';
      case 'medical_report': return '🏥';
      case 'academic_certificate': return '🎓';
      case 'transfer_certificate': return '📑';
      case 'photo': return '🖼️';
      default: return '📁';
    }
  }

  getTimelineCategoryLabel(type: string): string {
    switch (type) {
      case 'enrollment': return 'تسكين أكاديمي';
      case 'status_change': return 'تعديل حالة';
      case 'promotion': return 'ترفيع أكاديمي';
      case 'document_upload': return 'وثيقة مرفوعة';
      default: return 'نشاط عام';
    }
  }

  getTimelineIcon(type: string): string {
    switch (type) {
      case 'enrollment': return '🏫';
      case 'status_change': return '🔄';
      case 'promotion': return '🎓';
      case 'document_upload': return '📄';
      default: return '📌';
    }
  }

  getTimelineColor(type: string): string {
    switch (type) {
      case 'enrollment': return '#2563eb';
      case 'status_change': return '#d97706';
      case 'promotion': return '#9333ea';
      case 'document_upload': return '#059669';
      default: return '#64748b';
    }
  }

  async confirmDeleteDoc(att: any): Promise<void> {
    const ok = await this.confirm({
      title: 'حذف الوثيقة',
      message: `هل أنت متأكد من حذف وثيقة «${att.file_name || att.attachment_type_display}»؟ سيتم إزالتها من ملف الطالب.`,
      color: 'warn',
    });
    if (ok) {
      this.studentsService.deleteStudentAttachment(this.id, att.id).subscribe({
        next: () => {
          this.snack.open('تم حذف الوثيقة بنجاح', 'إغلاق', { duration: 4000 });
          this.refreshAttachmentsAndTimeline();
        },
        error: (err) => {
          this.snack.open(err?.error?.message || 'تعذّر حذف الوثيقة. حاول مجدداً.', 'إغلاق', { duration: 4000 });
        }
      });
    }
  }

  private id = '';

  activateStudent(s: any): void {
    if (this.activatingStudent()) return;
    this.activatingStudent.set(true);
    this.dialog.open(AccountActionDialogComponent, {
      disableClose: true,
      data: {
        title: 'تفعيل حساب الطالب',
        targetName: s.profile.arabic_name || s.student_number,
        processingHint: 'جارٍ إنشاء حساب البوابة وإرسال بيانات الدخول عبر البريد وواتساب…',
        action$: this.studentsService.activateStudentPortal(s.id),
      },
    }).afterClosed().subscribe(() => this.activatingStudent.set(false));
  }

  activateGuardian(s: any, relationId: string): void {
    if (this.activatingGuardianId()) return;
    this.activatingGuardianId.set(relationId);
    const member = (s.family_relations || []).find((m: any) => m.id === relationId);
    this.dialog.open(AccountActionDialogComponent, {
      disableClose: true,
      data: {
        title: 'تفعيل حساب ولي الأمر',
        targetName: member?.full_name || '',
        processingHint: 'جارٍ إنشاء حساب البوابة وإرسال بيانات الدخول عبر البريد وواتساب…',
        action$: this.studentsService.activateGuardianPortal(s.id, relationId),
      },
    }).afterClosed().subscribe(() => this.activatingGuardianId.set(null));
  }

  resetGuardianPassword(s: any, relationId: string): void {
    if (this.activatingGuardianId()) return;
    this.activatingGuardianId.set(relationId);
    const member = (s.family_relations || []).find((m: any) => m.id === relationId);
    this.dialog.open(AccountActionDialogComponent, {
      disableClose: true,
      data: {
        title: 'إعادة تعيين كلمة المرور',
        targetName: member?.full_name || '',
        processingHint: 'جارٍ توليد كلمة مرور جديدة وإرسال بيانات الدخول عبر البريد وواتساب…',
        action$: this.studentsService.resetGuardianPassword(s.id, relationId),
      },
    }).afterClosed().subscribe(() => this.activatingGuardianId.set(null));
  }

  statusBadge(status: string): string {
    const map: Record<string, string> = {
      active: 'badge success', registered: 'badge info', suspended: 'badge danger',
      graduated: 'badge warning', withdrawn: 'badge info', archived: 'badge info',
    };
    return map[status] || 'badge info';
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      active: 'نشط', registered: 'مسجل', suspended: 'موقوف',
      graduated: 'متخرج', withdrawn: 'منسحب', archived: 'مؤرشف',
    };
    return map[status] || status || '—';
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.id = params['id'];
      if (this.id) this.reload();
    });
  }

  /** فتح لوح الحساب المالي الكامل (360°) في وحدة فوترة الطلاب. */
  openFinanceAccount(): void {
    const acc = this.billingAccount();
    const q = acc?.account_number || this.student()?.student_number || '';
    this.router.navigate(['/student-finance/accounts'], { queryParams: q ? { q } : {} });
  }

  private reload(): void {
    this.pageLoading.set(true);
    this.financeLoading.set(true);
    this.billingAccount.set(null);
    this.invoices.set([]);
    this.receipts.set([]);

    this.studentsService.getStudentById(this.id).subscribe({
      next: () => this.pageLoading.set(false),
      error: () => this.pageLoading.set(false),
    });

    this.studentsService.getTimeline(this.id).subscribe((res) => {
      if (res && res.success) this.timeline.set(res.data || []);
    });

    this.loadingAttachments.set(true);
    this.studentsService.getStudentAttachments(this.id).subscribe({
      next: (res) => {
        const list = res?.data ?? res ?? [];
        this.attachments.set(Array.isArray(list) ? list : []);
        this.loadingAttachments.set(false);
      },
      error: () => this.loadingAttachments.set(false),
    });

    this.studentsService.getBranding().subscribe({
      next: (res) => {
        if (res) this.schoolInfo.set(res);
      }
    });

    // الاستجابات مغلّفة بـ StandardResponse — نستخرج الصفوف قبل الترشيح
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));

    // زيارات العيادة الخاصة بهذا الطالب — يُطابَق نوع الشخص أيضاً لأن
    // المعرّفات قد تتشابه بين الطلاب والموظفين في جداول مختلفة
    this.clinicService.getVisits().subscribe((res) => {
      this.studentVisits.set(
        rows(res).filter((v: any) => v.patient_user_id === this.id && v.patient_type === 'student'),
      );
    });

    // كتب المكتبة واستعارات هذا الطالب
    this.libraryService.getBooks().subscribe((res) => this.books.set(rows(res)));
    this.libraryService.getCopies().subscribe((res) => this.copies.set(rows(res)));
    this.libraryService.getBorrows().subscribe((res) => {
      this.studentBorrows.set(
        rows(res).filter((b: any) => b.borrower_user_id === this.id && b.borrower_type === 'student'),
      );
    });
    
    // جلب الحساب المالي والفواتير الصادرة للطالب
    this.sfService.listBillingAccounts({ page_size: 500 }).subscribe({
      next: (res) => {
        const accounts = res?.data || [];
        const account = accounts.find((a: any) => a.student_id === this.id);
        if (account) {
          this.billingAccount.set(account);
          forkJoin({
            inv: this.sfService.invoicesForAccount(account.id),
            rcp: this.sfService.receiptsForAccount(account.id),
            pm: this.sfService.listPaymentMethods(),
          }).subscribe({
            next: ({ inv, rcp, pm }) => {
              this.invoices.set(inv?.data || []);
              this.receipts.set(rcp?.data || []);
              this.paymentMethods.set(pm?.data || []);
              this.financeLoading.set(false);
            },
            error: () => this.financeLoading.set(false),
          });
        } else {
          this.financeLoading.set(false);
        }
      },
      error: () => this.financeLoading.set(false),
    });
  }

  getBookTitle(copyId: string): string {
    const copy = this.copies().find(c => c.id === copyId);
    if (!copy) return 'نسخة غير معروفة';
    const book = this.books().find(b => b.id === copy.book);
    return book ? book.title_ar : 'كتاب غير معروف';
  }

  getBorrowStatusText(status: string): string {
    switch (status) {
      case 'borrowed': return 'قيد الاستعارة';
      case 'returned': return 'مسترجع';
      case 'overdue': return 'متأخر';
      case 'lost': return 'مفقود';
      default: return status;
    }
  }

  getVisitStatusText(status: string): string {
    switch (status) {
      case 'checked_in': return 'دخل العيادة';
      case 'diagnosed': return 'تم التشخيص';
      case 'discharged': return 'غادر العيادة';
      case 'referred': return 'تمت الإحالة';
      default: return status;
    }
  }

  onPhotoSelected(event: any, student: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.studentsService.uploadPhoto(file).subscribe({
      next: (res) => {
        if (res && res.success) {
          const photoUuid = res.data.file_asset_id;
          this.studentsService.patchStudent(student.id, {
            profile: {
              photo: photoUuid
            }
          }).subscribe({
            next: () => {
              this.reload();
            }
          });
        }
      }
    });
  }

  getAge(dob?: string): string {
    if (!dob) return '—';
    try {
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) return '—';
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} سنة`;
    } catch {
      return '—';
    }
  }

  today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** العام الدراسي التقريبي (يبدأ عادةً في سبتمبر). */
  academicYearLabel(): string {
    const enrYear = (this.student() as any)?.enrollments?.[0]?.academic_year_name;
    if (enrYear) return enrYear;
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise((resolve) =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => resolve(!!ok))
    );
  }

  async graduate(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'تخريج الطالب', message: `سيُنقل «${s.profile.arabic_name || s.id}» إلى سجل الخريجين بتاريخ اليوم.`, color: 'primary' });
    if (ok) this.studentsService.graduateStudent(this.id, { graduation_date: this.today() }).subscribe({ next: () => this.reload() });
  }

  async withdraw(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'تسجيل انسحاب', message: `سيتم تسجيل انسحاب «${s.profile.arabic_name || s.id}» بتاريخ اليوم.`, color: 'warn' });
    if (ok) this.studentsService.withdrawStudent(this.id, { withdrawal_date: this.today(), reason: 'انسحاب مسجّل من ملف الطالب' }).subscribe({ next: () => this.reload() });
  }

  async archive(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'أرشفة الطالب', message: `سيتم أرشفة ملف «${s.profile.arabic_name || s.id}». يمكن استعادته لاحقاً.`, color: 'warn' });
    if (ok) this.studentsService.archiveStudent(this.id, 'أرشفة يدوية من ملف الطالب').subscribe({ next: () => this.router.navigate(['/students/list']) });
  }

  printReportCard(): void {
    window.print();
  }

  back(): void {
    this.router.navigate(['/students/list']);
  }
}
