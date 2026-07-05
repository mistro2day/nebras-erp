import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-student-dashboard',
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
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">بوابة الطلاب</h1>
          <p style="color: #64748b; margin-top: 4px;">مرحباً بك مجدداً يا خالد! راجع جدولك الدراسي وحصصك اليومية ودرجاتك.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">refresh</mat-icon>تحديث لوحة التحكم
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #10b981; margin-left: 12px;">done_all</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">نسبة الحضور التراكمية</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            98.2%
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #3b82f6; margin-left: 12px;">menu_book</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">المواد الدراسية</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            8 مواد
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #f59e0b; margin-left: 12px;">bookmark</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">الكتب المستعارة</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            كتاب واحد
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Detail Tabs -->
      <mat-tab-group style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <mat-tab label="جدول الحصص اليومي">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">حصص اليوم</h3>
            <mat-list>
              @for (cls of todayClasses(); track cls.subject) {
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #3b82f6; margin-left: 12px;">schedule</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">{{ cls.subject }}</span>
                  <span matListItemLine style="color: #64748b;">الوقت: {{ cls.time }} | القاعة: {{ cls.room }}</span>
                </mat-list-item>
                <mat-divider></mat-divider>
              }
            </mat-list>
          </div>
        </mat-tab>
        <mat-tab label="الامتحانات والنتائج">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">الامتحانات النهائية القادمة</h3>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #ef4444; margin-left: 12px;">event_note</mat-icon>
                <span matListItemTitle style="font-weight: 500;">فيزياء نهائي</span>
                <span matListItemLine style="color: #64748b;">التاريخ: 2026-07-15 | نوع الامتحان: كتابي</span>
              </mat-list-item>
              <mat-divider></mat-divider>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #ef4444; margin-left: 12px;">event_note</mat-icon>
                <span matListItemTitle style="font-weight: 500;">كيمياء عملي</span>
                <span matListItemLine style="color: #64748b;">التاريخ: 2026-07-18 | نوع الامتحان: معملي</span>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class StudentDashboardComponent {
  todayClasses = signal([
    { subject: 'اللغة العربية آداب', time: '08:00 - 08:45', room: 'قاعة أ3' },
    { subject: 'الرياضيات الحديثة', time: '08:45 - 09:30', room: 'معمل الحاسوب 1' },
    { subject: 'الفيزياء التجريبية', time: '09:45 - 10:30', room: 'المختبر الرئيسي' },
    { subject: 'التربية الإسلامية والسلوك', time: '10:30 - 11:15', room: 'قاعة أ3' }
  ]);
}
