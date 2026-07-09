import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StudentsService } from '../students.service';
import { HttpClient } from '@angular/common/http';
import {
  ConfirmDialogComponent, ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';

import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

@Component({
  selector: 'app-student-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CommonModule, RouterLink, MatTabsModule, MatDialogModule, NbLoadingComponent],
  template: `
    @if (student(); as s) {
      <div class="page" dir="rtl">
        
        <!-- الهيدر والملخص العلوي الفاخر -->
        <div class="nb-card summary-card">
          <div class="summary-content">
            <div class="avatar-section">
              <div class="avatar-wrapper" (click)="photoInput.click()" title="انقر لتحديث الصورة الشخصية">
                <img *ngIf="$any(s.profile)?.photo_url" [src]="$any(s.profile)?.photo_url" class="student-photo" alt="صورة الطالب" />
                <div *ngIf="!$any(s.profile)?.photo_url" class="avatar-placeholder">{{ (s.profile?.arabic_name || '؟').charAt(0) }}</div>
                <div class="avatar-overlay">
                  <span>تغيير 📷</span>
                </div>
              </div>
              <input type="file" #photoInput (change)="onPhotoSelected($event, s)" style="display: none;" accept="image/*" />

              <div class="basic-info">
                <h2>{{ s.profile?.arabic_name || 'ملف طالب' }}</h2>
                <p class="eng-name">{{ s.profile?.english_name }}</p>
                <div class="badge-row">
                  <span [class]="statusBadge(s.status)">{{ statusText(s.status) }}</span>
                  <span class="num-badge">رقم الطالب: {{ s.student_number }}</span>
                </div>
              </div>
            </div>
            
            <div class="quick-stats">
              <div class="stat-item"><span class="label">الجنسية</span><span class="val">{{ s.profile?.nationality || '—' }}</span></div>
              <div class="stat-item"><span class="label">الجنس</span><span class="val">{{ s.profile?.gender === 'male' ? 'ذكر' : s.profile?.gender === 'female' ? 'أنثى' : '—' }}</span></div>
              <div class="stat-item"><span class="label">تاريخ الميلاد</span><span class="val">{{ s.profile?.date_of_birth || '—' }}</span></div>
              <div class="stat-item"><span class="label">العمر</span><span class="val font-semibold">{{ getAge(s.profile?.date_of_birth) }}</span></div>
            </div>
          </div>

          <div class="action-bar">
            <button class="nb-btn-secondary" (click)="back()">عودة للقائمة</button>
            <div class="spacer"></div>
            <button class="nb-btn-secondary" [routerLink]="['/students/edit', s.id]">تعديل الملف</button>
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
                  <div class="info-item"><strong>الاسم الكامل (عربي)</strong>{{ s.profile?.arabic_name }}</div>
                  <div class="info-item"><strong>الاسم الكامل (إنجليزي)</strong>{{ s.profile?.english_name || '—' }}</div>
                  <div class="info-item"><strong>رقم الهوية الوطنية / الإقامة</strong>{{ s.profile?.national_id || '—' }}</div>
                  <div class="info-item"><strong>رقم جواز السفر</strong>{{ s.profile?.passport || '—' }}</div>
                  <div class="info-item"><strong>الجنسية</strong>{{ s.profile?.nationality }}</div>
                  <div class="info-item"><strong>تاريخ الميلاد</strong>{{ s.profile?.date_of_birth }}</div>
                  <div class="info-item"><strong>الديانة</strong>{{ s.profile?.religion || '—' }}</div>
                  <div class="info-item"><strong>فصيلة الدم</strong><span class="blood-group">{{ s.profile?.blood_group || '—' }}</span></div>
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
                      <p><strong>الهوية الوطنية:</strong> {{ member.national_id || 'غير متوفر' }}</p>
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
                    <span class="fin-label">إجمالي المدفوعات</span>
                    <span class="fin-value text-success">{{ billingAccount().total_paid | number:'1.2-2' }} ر.س</span>
                  </div>
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
                    <div class="tbl-row finance-tbl">
                      <span class="strong">{{ inv.invoice_number }}</span>
                      <span>{{ inv.total_amount | number:'1.2-2' }} ر.س</span>
                      <span class="text-danger">{{ inv.outstanding_amount | number:'1.2-2' }} ر.س</span>
                      <span>
                        <span class="badge" [class.success]="inv.status === 'paid'" [class.warning]="inv.status === 'partially_paid'" [class.danger]="inv.status === 'unpaid'">
                          {{ inv.status === 'paid' ? 'مدفوعة' : inv.status === 'partially_paid' ? 'مدفوعة جزئياً' : 'غير مدفوعة' }}
                        </span>
                      </span>
                      <span>{{ inv.due_date }}</span>
                    </div>
                  }
                </div>

                <ng-template #noInvoices>
                  <div class="tbl-empty">لا توجد فواتير صادرة لهذا الطالب حالياً.</div>
                </ng-template>

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
                  <div class="tbl-row library-tbl">
                    <span class="strong">مبادئ الرياضيات الحديثة</span>
                    <span>2026-06-01</span>
                    <span>2026-06-15</span>
                    <span><span class="badge success">مسترجع</span></span>
                  </div>
                  <div class="tbl-row library-tbl">
                    <span class="strong">تاريخ الأدب العربي</span>
                    <span>2026-07-02</span>
                    <span>2026-07-20</span>
                    <span><span class="badge warning">قيد الاستعارة</span></span>
                  </div>
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
                      @for (allergy of s.medical_profile?.allergies || []; track allergy) {
                        <span class="tag danger">{{ allergy }}</span>
                      }
                      @if (!(s.medical_profile?.allergies?.length)) {
                        <span>لا توجد حساسية مسجلة.</span>
                      }
                    </div>
                  </div>
                  <div class="info-item">
                    <strong>الأمراض المزمنة</strong>
                    <div class="tag-list">
                      @for (disease of s.medical_profile?.chronic_diseases || []; track disease) {
                        <span class="tag warning">{{ disease }}</span>
                      }
                      @if (!(s.medical_profile?.chronic_diseases?.length)) {
                        <span>سليم.</span>
                      }
                    </div>
                  </div>
                  <div class="info-item">
                    <strong>الأدوية المنتظمة</strong>
                    <div class="tag-list">
                      @for (med of s.medical_profile?.medication || []; track med) {
                        <span class="tag info">{{ med }}</span>
                      }
                      @if (!(s.medical_profile?.medication?.length)) {
                        <span>لا يوجد.</span>
                      }
                    </div>
                  </div>
                  <div class="info-item"><strong>طبيب العائلة المفضل</strong>{{ s.medical_profile?.doctor || '—' }}</div>
                </div>

                <hr class="nb-divider" />

                <h3>سجل زيارات العيادة المدرسية</h3>
                <div class="tbl">
                  <div class="tbl-head clinic-tbl">
                    <span>التاريخ والوقت</span>
                    <span>السبب / الشكوى</span>
                    <span>الإجراء المتخذ</span>
                    <span>الممرض المناوب</span>
                  </div>
                  <div class="tbl-row clinic-tbl">
                    <span>2026-06-12 10:15 ص</span>
                    <span class="strong">صداع خفيف وارتفاع طفيف بالحرارة</span>
                    <span>إعطاء مسكن الباراسيتامول مع الراحة بالعيادة</span>
                    <span>م. سارة علي</span>
                  </div>
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

          </mat-tab-group>
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
  `]
})
export class StudentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentsService = inject(StudentsService);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);

  student = this.studentsService.selectedStudent;
  timeline = signal<any[]>([]);
  billingAccount = signal<any | null>(null);
  invoices = signal<any[]>([]);

  readonly documents = computed(() => this.timeline().filter((e) => e.type === 'document_upload'));

  private id = '';

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

  private reload(): void {
    this.studentsService.getStudentById(this.id).subscribe();
    this.studentsService.getTimeline(this.id).subscribe((res) => {
      if (res && res.success) this.timeline.set(res.data || []);
    });
    
    // جلب الحساب المالي والفواتير الصادرة للطالب (حقيقي)
    this.http.get<any>('/api/v1/student-finance/billing-accounts/').subscribe((res) => {
      if (res && res.success) {
        const accounts = res.data?.results || res.data || [];
        // البحث عن الحساب المرتبط بالطالب
        const account = accounts.find((a: any) => a.student === this.id);
        if (account) {
          this.billingAccount.set(account);
          // جلب الفواتير المرتبطة بهذا الحساب
          this.http.get<any>(`/api/v1/student-finance/invoices/?billing_account=${account.id}`).subscribe((invRes) => {
            if (invRes && invRes.success) {
              this.invoices.set(invRes.data?.results || invRes.data || []);
            }
          });
        }
      }
    });
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

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    return new Promise((resolve) =>
      this.dialog.open(ConfirmDialogComponent, { data }).afterClosed().subscribe((ok) => resolve(!!ok))
    );
  }

  async graduate(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'تخريج الطالب', message: `سيُنقل «${s.profile?.arabic_name || s.id}» إلى سجل الخريجين بتاريخ اليوم.`, color: 'primary' });
    if (ok) this.studentsService.graduateStudent(this.id, { graduation_date: this.today() }).subscribe({ next: () => this.reload() });
  }

  async withdraw(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'تسجيل انسحاب', message: `سيتم تسجيل انسحاب «${s.profile?.arabic_name || s.id}» بتاريخ اليوم.`, color: 'warn' });
    if (ok) this.studentsService.withdrawStudent(this.id, { withdrawal_date: this.today(), reason: 'انسحاب مسجّل من ملف الطالب' }).subscribe({ next: () => this.reload() });
  }

  async archive(s: any): Promise<void> {
    const ok = await this.confirm({ title: 'أرشفة الطالب', message: `سيتم أرشفة ملف «${s.profile?.arabic_name || s.id}». يمكن استعادته لاحقاً.`, color: 'warn' });
    if (ok) this.studentsService.archiveStudent(this.id, 'أرشفة يدوية من ملف الطالب').subscribe({ next: () => this.router.navigate(['/students/list']) });
  }

  back(): void {
    this.router.navigate(['/students/list']);
  }
}
