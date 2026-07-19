import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StudentsService } from '../students.service';
import { StudentFinanceService } from '../../student-finance/student-finance.service';
import { SfDocumentDrawerComponent, SfDoc } from '../../student-finance/shared/sf-document-drawer.component';
import { HttpClient } from '@angular/common/http';
import { ClinicService } from '../../clinic/clinic.service';
import { LibraryService } from '../../library/library.service';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  AccountActionDialogComponent,
} from '../../../shared/components/account-action-dialog/account-action-dialog.component';

import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-student-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CommonModule, RouterLink, MatTabsModule, MatDialogModule, NbLoadingComponent, SfDocumentDrawerComponent],
  template: `
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
            <button class="nb-btn-secondary" (click)="back()">عودة للقائمة</button>
            <button class="nb-btn-primary print-btn" (click)="printReportCard()" title="طباعة شهادة النتيجة على ورقة A4">
              <span class="pico" aria-hidden="true">🖨️</span> طباعة النتيجة (A4)
            </button>
            <div class="spacer"></div>
            <button class="nb-btn-secondary" [routerLink]="['/students/edit', s.id]">تعديل الملف</button>
            <button class="nb-btn-primary" (click)="activateStudent(s)" [disabled]="activatingStudent()" title="إنشاء حساب بوابة الطالب وإرسال بيانات الدخول عبر البريد وواتساب">
              {{ activatingStudent() ? 'جارٍ التفعيل…' : '🎓 تفعيل حساب الطالب' }}
            </button>
            <button class="nb-btn-secondary" (click)="graduate(s)" [disabled]="s.status === 'graduated'">تخريج</button>
            <button class="nb-btn-secondary" (click)="withdraw(s)" [disabled]="s.status === 'withdrawn'">تسجيل انسحاب</button>
            <button class="nb-btn-danger" (click)="archive(s)">أرشفة</button>
          </div>
        </div>

        <!-- تبويبات التفاصيل المتقدمة -->
        <div class="nb-card tabs-card">
          <mat-tab-group animationDuration="200ms">
            
            <!-- تبويب 1: نظرة عامة -->
            <mat-tab label="نظرة عامة">
              <div class="tab-content">
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
                <div class="finance-header-box" *ngIf="billingAccount(); else noFinance">
                  <div class="fin-stat-card">
                    <span class="fin-label">رقم الحساب المالي</span>
                    <span class="fin-value">{{ billingAccount().account_number }}</span>
                  </div>
                  <div class="fin-stat-card">
                    <span class="fin-label">الرصيد المستحق</span>
                    <span class="fin-value text-danger">{{ billingAccount().outstanding_balance | number:'1.2-2' }} ر.س</span>
                  </div>
                  <div class="fin-stat-card">
                    <span class="fin-label">إجمالي المُحصّل</span>
                    <span class="fin-value text-success">{{ totalCollected() | number:'1.2-2' }} ر.س</span>
                  </div>
                  <div class="fin-stat-card">
                    <span class="fin-label">الرصيد الدائن</span>
                    <span class="fin-value">{{ billingAccount().credit_balance | number:'1.2-2' }} ر.س</span>
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
                      <span>{{ inv.total_amount | number:'1.2-2' }} ر.س</span>
                      <span class="text-danger">{{ inv.outstanding_amount | number:'1.2-2' }} ر.س</span>
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
                <div *ngIf="billingAccount()">
                  <h3 style="margin-top: 24px;">السندات المالية (سندات القبض)</h3>
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
                        <span class="text-success">{{ r.amount | number:'1.2-2' }} ر.س</span>
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

                <ng-template #noFinance>
                  <div class="no-data-box">
                    <span class="icon">💳</span>
                    <h4>لا يوجد حساب مالي نشط</h4>
                    <p>هذا الطالب ليس لديه حساب مالي نشط في الوقت الحالي. يمكنك إنشاء حساب مالي من شؤون الطلاب المالية.</p>
                  </div>
                </ng-template>
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
                <h3>الوثائق المرفوعة</h3>
                <div class="tbl" style="margin-bottom: 20px;">
                  <div class="tbl-head doc"><span>الوثيقة</span><span>الملف</span><span>التاريخ</span></div>
                  @for (d of documents(); track $index) {
                    <div class="tbl-row doc">
                      <span class="strong">{{ d.title }}</span>
                      <span>{{ d.comments || '—' }}</span>
                      <span>{{ d.date | date:'yyyy-MM-dd' }}</span>
                    </div>
                  }
                  @if (documents().length === 0) {
                    <div class="tbl-empty">لا توجد وثائق مرفوعة.</div>
                  }
                </div>

                <hr class="nb-divider" />

                <h3>خط نشاط الطالب الزمني</h3>
                <div class="timeline">
                  @for (event of timeline(); track $index) {
                    <div class="timeline-event">
                      <div class="event-dot"></div>
                      <div class="event-details">
                        <div class="event-header">
                          <h4>{{ event.title }}</h4>
                          <span class="event-date">{{ event.date | date:'medium' }}</span>
                        </div>
                        <p class="event-comment">{{ event.comments }}</p>
                      </div>
                    </div>
                  }
                  @if (timeline().length === 0) {
                    <div class="no-data">لا يوجد سجل أنشطة للطالب حالياً.</div>
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

      </div>
    } @else {
      <div class="page" dir="rtl"><nb-loading message="جارٍ تحميل بيانات الطالب..."></nb-loading></div>
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
    .badge-row { display: flex; gap: 8px; align-items: center; }
    .num-badge { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 2px 8px; border-radius: var(--nb-radius-sm); font-size: 12px; color: var(--nb-text-secondary); }
    
    .quick-stats { display: flex; gap: 28px; }
    .stat-item { display: flex; flex-direction: column; align-items: flex-start; }
    .stat-item .label { font-size: 11px; color: var(--nb-text-muted); }
    .stat-item .val { font-size: 14.5px; font-weight: 600; color: var(--nb-text); margin-top: 2px; }
    
    .action-bar { display: flex; align-items: center; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--nb-border-soft); flex-wrap: wrap; }
    .action-bar .spacer { flex: 1; }
    .print-btn { display: inline-flex; align-items: center; gap: 6px; }
    .print-btn .pico { font-size: 14px; line-height: 1; }

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
    
    /* الخط الزمني */
    .timeline { display: flex; flex-direction: column; gap: 14px; position: relative; padding-right: 20px; }
    .timeline::before { content: ''; position: absolute; right: 5px; top: 4px; bottom: 4px; width: 2px; background: var(--nb-border); }
    .timeline-event { display: flex; gap: 16px; position: relative; }
    .event-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--nb-primary-600); position: absolute; right: -19px; top: 14px; border: 2px solid var(--nb-surface); }
    .event-details { flex: 1; background: var(--nb-surface-raised); padding: 12px 14px; border-radius: var(--nb-radius-card); border: 1px solid var(--nb-border-soft); }
    .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .event-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .event-date { font-size: 11px; color: var(--nb-text-muted); }
    .event-comment { margin: 0; color: var(--nb-text-secondary); font-size: 12px; }

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
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);

  student = this.studentsService.selectedStudent;
  timeline = signal<any[]>([]);
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

  studentGrades = signal<any[]>([
    { subject: 'اللغة العربية', score: 96, classwork: 28, finalExam: 68 },
    { subject: 'الرياضيات', score: 92, classwork: 26, finalExam: 66 },
    { subject: 'العلوم العامة', score: 94, classwork: 27, finalExam: 67 },
    { subject: 'التربية الإسلامية', score: 98, classwork: 29, finalExam: 69 },
    { subject: 'اللغة الإنجليزية', score: 88, classwork: 24, finalExam: 64 },
    { subject: 'الحاسب الآلي', score: 95, classwork: 28, finalExam: 67 }
  ]);

  examSchedule = signal<any[]>([
    { subject: 'الرياضيات', type: 'امتحان نهائي تحريري', date: '2026-07-12', time: '09:00 - 11:30', room: 'قاعة ابن رشد (C1)', status: 'upcoming' },
    { subject: 'اللغة العربية', type: 'امتحان نهائي تحريري', date: '2026-07-14', time: '09:00 - 11:00', room: 'قاعة ابن رشد (C1)', status: 'upcoming' },
    { subject: 'العلوم العامة', type: 'امتحان نهائي تحريري', date: '2026-07-16', time: '09:00 - 11:00', room: 'مختبر الفيزياء', status: 'upcoming' },
    { subject: 'التربية الإسلامية', type: 'امتحان شفهي وقرآن', date: '2026-07-08', time: '08:30 - 12:00', room: 'مصلى المدرسة', status: 'completed' }
  ]);

  readonly documents = computed(() => this.timeline().filter((e) => e.type === 'document_upload'));
  schoolInfo = signal<any>(null);
  readonly activatingStudent = signal(false);
  readonly activatingGuardianId = signal<string | null>(null);

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
    this.studentsService.getStudentById(this.id).subscribe();
    this.studentsService.getTimeline(this.id).subscribe((res) => {
      if (res && res.success) this.timeline.set(res.data || []);
    });

    this.studentsService.getBranding().subscribe({
      next: (res) => {
        if (res) this.schoolInfo.set(res);
      }
    });

    // جلب زيارات العيادة الخاصة بالطالب
    this.clinicService.getVisits().subscribe((visits) => {
      if (visits) {
        this.studentVisits.set(visits.filter((v: any) => v.patient_user_id === this.id));
      }
    });

    // جلب كتب واستعارات المكتبة الخاصة بالطالب
    this.libraryService.getBooks().subscribe(b => this.books.set(b || []));
    this.libraryService.getCopies().subscribe(c => this.copies.set(c || []));
    this.libraryService.getBorrowTransactions().subscribe((borrows) => {
      if (borrows) {
        this.studentBorrows.set(borrows.filter((b: any) => b.borrower_user_id === this.id));
      }
    });
    
    // جلب الحساب المالي والفواتير الصادرة للطالب (عبر خدمة فوترة الطلاب — المسار الصحيح مع المعترضات)
    this.billingAccount.set(null);
    this.invoices.set([]);
    this.receipts.set([]);
    this.sfService.listBillingAccounts({ page_size: 500 }).subscribe((res) => {
      const accounts = res?.data || [];
      // الربط عبر معرّف الطالب (student_id) في حساب الفوترة
      const account = accounts.find((a: any) => a.student_id === this.id);
      if (account) {
        this.billingAccount.set(account);
        this.sfService.invoicesForAccount(account.id).subscribe((invRes) => this.invoices.set(invRes?.data || []));
        this.sfService.receiptsForAccount(account.id).subscribe((rcpRes) => this.receipts.set(rcpRes?.data || []));
        this.sfService.listPaymentMethods().subscribe((pmRes) => this.paymentMethods.set(pmRes?.data || []));
      }
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
