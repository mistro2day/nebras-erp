import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <div class="portal-container" dir="rtl" style="padding: 24px; font-family: 'Outfit', 'Inter', sans-serif; background: #f8fafc; min-height: 100vh;">
      <!-- Header -->
      <div class="portal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
        <div>
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">بوابة أولياء الأمور</h1>
          <p style="color: #64748b; margin-top: 4px;">مرحباً بك، أحمد! تابع أداء أبنائك الدراسي والمالي والصحي بكل سهولة.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">refresh</mat-icon>تحديث البيانات
        </button>
      </div>

      <!-- Children Grid -->
      <h2 style="font-size: 1.25rem; font-weight: 600; color: #334155; margin-bottom: 16px;">الأبناء المكفولين</h2>
      <div class="children-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 32px;">
        @for (child of children(); track child.student_id) {
          <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
            <mat-card-header style="margin-bottom: 16px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; margin-left: 16px;">
                <mat-icon style="color: #3b82f6;">face</mat-icon>
              </div>
              <mat-card-title style="font-weight: 600; color: #0f172a;">{{ child.name }}</mat-card-title>
              <mat-card-subtitle style="color: #64748b;">طالب - الصف العاشر</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px;">
                  <span style="font-size: 0.85rem; color: #64748b; display: block;">نسبة الحضور</span>
                  <span style="font-size: 1.1rem; font-weight: 700; color: #10b981;">{{ child.attendance_rate }}%</span>
                </div>
                <div style="background: #f1f5f9; padding: 12px; border-radius: 8px;">
                  <span style="font-size: 0.85rem; color: #64748b; display: block;">الرسوم المتبقية</span>
                  <span style="font-size: 1.1rem; font-weight: 700; color: #ef4444;">{{ child.outstanding_fees }} ر.س</span>
                </div>
              </div>
              <div style="margin-top: 16px; font-size: 0.9rem; color: #475569;">
                <p style="margin: 4px 0;"><mat-icon style="font-size: 16px; vertical-align: middle; margin-left: 8px; color: #3b82f6;">event</mat-icon>الاختبار القادم: {{ child.next_exam }}</p>
                <p style="margin: 4px 0;"><mat-icon style="font-size: 16px; vertical-align: middle; margin-left: 8px; color: #10b981;">directions_bus</mat-icon>حالة النقل: {{ child.transport_status }}</p>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Tabs for Details -->
      <mat-tab-group style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <mat-tab label="الفواتير والمدفوعات">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a;">الملخص المالي</h3>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #10b981; margin-left: 12px;">check_circle</mat-icon>
                <span matListItemTitle style="font-weight: 500;">تم سداد دفعة الفصل الدراسي الأول</span>
                <span matListItemLine style="color: #64748b;">المبلغ: 3,750 ر.س - 2026-06-15</span>
              </mat-list-item>
              <mat-divider></mat-divider>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #f59e0b; margin-left: 12px;">error</mat-icon>
                <span matListItemTitle style="font-weight: 500;">فاتورة مستحقة - رسوم حافلة النقل</span>
                <span matListItemLine style="color: #ef4444;">المبلغ: 1,250 ر.س - يستحق في 2026-07-20</span>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-tab>
        <mat-tab label="الإعلانات والرسائل">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a;">آخر الإعلانات</h3>
            <mat-list>
              @for (ann of announcements(); track ann.id) {
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #3b82f6; margin-left: 12px;">campaign</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">{{ ann.title }}</span>
                  <span matListItemLine style="color: #64748b;">{{ ann.content }}</span>
                </mat-list-item>
                <mat-divider></mat-divider>
              }
            </mat-list>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class ParentDashboardComponent {
  children = signal([
    {
      student_id: '1',
      name: 'خالد أحمد الجميل',
      attendance_rate: 98.4,
      outstanding_fees: 1250,
      next_exam: 'رياضيات نهائي (2026-07-12)',
      transport_status: 'مسار حافلة 14 - جاري التوصيل'
    },
    {
      student_id: '2',
      name: 'سارة أحمد الجميل',
      attendance_rate: 95.1,
      outstanding_fees: 0,
      next_exam: 'علوم نهائي (2026-07-14)',
      transport_status: 'مسار حافلة 08 - واصل للمدرسة'
    }
  ]);

  announcements = signal([
    { id: 1, title: 'بدء التسجيل للنقل المدرسي للفصل القادم', content: 'نرجو من السادة أولياء الأمور المسارعة بتسجيل أبنائهم في خدمة الحافلات قبل انتهاء الموعد.' },
    { id: 2, title: 'جدول امتحانات الفصل الدراسي الثاني الموحد', content: 'تم نشر جدول الامتحانات النهائية بمركز التحميل، يرجى الاطلاع والمتابعة.' }
  ]);
}
