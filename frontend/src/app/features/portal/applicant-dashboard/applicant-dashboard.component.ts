import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <div class="portal-container" dir="rtl" style="padding: 24px; font-family: 'Outfit', 'Inter', sans-serif; background: #f8fafc; min-height: 100vh;">
      <!-- Header -->
      <div class="portal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
        <div>
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">بوابة المتقدمين الجدد</h1>
          <p style="color: #64748b; margin-top: 4px;">مرحباً بك يا سعيد! تابع هنا حالة طلب الانضمام والخطوات القادمة للقبول.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">refresh</mat-icon>تحديث الطلب
        </button>
      </div>

      <!-- Application Status -->
      <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 32px; background: #eef2ff;">
        <mat-card-header>
          <mat-icon style="color: #4f46e5; margin-left: 12px; font-size: 28px; width: 28px; height: 28px;">info</mat-icon>
          <mat-card-title style="color: #4f46e5; font-weight: 600;">حالة طلب التقديم الحالي</mat-card-title>
          <mat-card-subtitle style="color: #6366f1;">المرحلة الحالية: تحت المراجعة والدراسة الأكاديمية</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content style="margin-top: 16px; color: #3730a3;">
          لقد استلمنا مستنداتك المرفوعة بنجاح. الخطوة التالية هي حضور اختبار القبول والمفاضلة المحدد أدناه.
        </mat-card-content>
      </mat-card>

      <!-- Grid for Schedule and Required Documents -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        <!-- Schedule card -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; padding: 16px;">
          <h3 style="font-weight: 600; color: #0f172a; display: flex; align-items: center; margin-bottom: 16px;">
            <mat-icon style="color: #f59e0b; margin-left: 8px;">event</mat-icon>جدول اختبار القبول
          </h3>
          <p style="margin: 8px 0; color: #334155;"><strong>المادة:</strong> اختبار الذكاء والقدرات الرياضية واللغوية</p>
          <p style="margin: 8px 0; color: #334155;"><strong>التاريخ:</strong> 2026-07-08 09:00 ص</p>
          <p style="margin: 8px 0; color: #334155;"><strong>الموقع:</strong> قاعة المدرسة الكبرى - المبنى الرئيسي</p>
        </mat-card>

        <!-- Document status card -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; padding: 16px;">
          <h3 style="font-weight: 600; color: #0f172a; display: flex; align-items: center; margin-bottom: 16px;">
            <mat-icon style="color: #10b981; margin-left: 8px;">upload_file</mat-icon>الوثائق والمستندات المطلوبة
          </h3>
          <mat-list>
            <mat-list-item>
              <mat-icon matListItemIcon style="color: #10b981; margin-left: 8px;">check_circle</mat-icon>
              <span matListItemTitle style="color: #0f172a;">صورة الهوية الوطنية / الإقامة لولي الأمر</span>
            </mat-list-item>
            <mat-divider></mat-divider>
            <mat-list-item>
              <mat-icon matListItemIcon style="color: #10b981; margin-left: 8px;">check_circle</mat-icon>
              <span matListItemTitle style="color: #0f172a;">شهادة ميلاد الطالب</span>
            </mat-list-item>
            <mat-divider></mat-divider>
            <mat-list-item>
              <mat-icon matListItemIcon style="color: #ef4444; margin-left: 8px;">pending</mat-icon>
              <span matListItemTitle style="color: #ef4444;">سجل التطعيمات وتقرير اللياقة الطبية (مطلوب)</span>
            </mat-list-item>
          </mat-list>
        </mat-card>
      </div>
    </div>
  `
})
export class ApplicantDashboardComponent {
  // Logic here
}
