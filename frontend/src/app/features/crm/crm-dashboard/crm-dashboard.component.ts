import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-crm-dashboard',
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
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">لوحة تحكم إدارة علاقات العملاء (CRM)</h1>
          <p style="color: #64748b; margin-top: 4px;">متابعة طلبات الاستقطاب، حملات التسويق، رضا أولياء الأمور، وقضايا وشكاوى الدعم الفني.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">refresh</mat-icon>تحديث لوحة التحليلات
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #ec4899; margin-left: 12px;">group_add</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">العملاء المحتملين الجدد</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            148 عميل
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #10b981; margin-left: 12px;">trending_up</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">نسبة تحويل الطلاب</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            65.4%
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #3b82f6; margin-left: 12px;">contact_support</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">الحالات والشكاوى المفتوحة</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            12 حالة
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #f59e0b; margin-left: 12px;">star</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">مؤشر رضا أولياء الأمور</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            4.6 / 5
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Detail Tabs -->
      <mat-tabs style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <mat-tab label="متابعة قمع الاستقطاب (Lead Funnel)">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">آخر المتابعات والعملاء المحتملين</h3>
            <mat-list>
              @for (lead of leads(); track lead.name) {
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #ec4899; margin-left: 12px;">person_outline</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">{{ lead.name }}</span>
                  <span matListItemLine style="color: #64748b;">درجة الاهتمام: {{ lead.interest === 'high' ? 'عالية جداً' : 'متوسطة' }} | القناة: {{ lead.source }}</span>
                </mat-list-item>
                <mat-divider></mat-divider>
              }
            </mat-list>
          </div>
        </mat-tab>
        <mat-tab label="قضايا وشكاوى أولياء الأمور">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">آخر القضايا النشطة</h3>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #ef4444; margin-left: 12px;">warning</mat-icon>
                <span matListItemTitle style="font-weight: 500;">شكوى عدم وصول الحافلة المدرسية للابن</span>
                <span matListItemLine style="color: #64748b;">المشتكي: ولي الأمر خالد - الأهمية: عالية | الحالة: قيد المراجعة</span>
              </mat-list-item>
              <mat-divider></mat-divider>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #3b82f6; margin-left: 12px;">help</mat-icon>
                <span matListItemTitle style="font-weight: 500;">استفسار عن خطة الرسوم للفصل الثاني</span>
                <span matListItemLine style="color: #64748b;">المستعلم: ولي الأمر أحمد - الأهمية: عادية | الحالة: تم الحل</span>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-tab>
      </mat-tabs>
    </div>
  `
})
export class CrmDashboardComponent {
  leads = signal([
    { name: 'سالم العلي', interest: 'high', source: 'إعلان فيسبوك' },
    { name: 'فهد المطيري', interest: 'medium', source: 'زيارة مباشرة لمعرض القبول' },
    { name: 'نورة الدوسري', interest: 'high', source: 'الموقع الإلكتروني الرسمي' }
  ]);
}
