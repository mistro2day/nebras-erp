import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-gateway-dashboard',
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
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">بوابة الربط والتكامل المؤسسي</h1>
          <p style="color: #64748b; margin-top: 4px;">شاشة مراقبة استدعاءات الـ APIs، والـ Webhooks، وحالة الأنظمة الخارجية المتصلة عبر بوابة الـ Gateway.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">refresh</mat-icon>تحديث لوحة المراقبة
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #4f46e5; margin-left: 12px;">speed</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">إجمالي النداءات اليوم</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            145,280 طلب
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #10b981; margin-left: 12px;">bolt</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">متوسط زمن الاستجابة</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            42 مللي ثانية
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #ef4444; margin-left: 12px;">error_outline</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">نسبة الأخطاء اليوم</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #ef4444; margin-top: 8px;">
            0.04%
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Detail Tabs -->
      <mat-tab-group style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <mat-tab label="الربط مع الأنظمة الخارجية">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">حالة مزودي الخدمة والمتصلين</h3>
            <mat-list>
              @for (provider of providers(); track provider.name) {
                <mat-list-item>
                  <mat-icon matListItemIcon [style.color]="provider.status === 'connected' ? '#10b981' : '#ef4444'" style="margin-left: 12px;">cloud_queue</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">{{ provider.name }}</span>
                  <span matListItemLine style="color: #64748b;">الحالة: {{ provider.status === 'connected' ? 'متصل ومفعّل' : 'فشل الاتصال' }} | آخر مزامنة: {{ provider.last_sync }}</span>
                </mat-list-item>
                <mat-divider></mat-divider>
              }
            </mat-list>
          </div>
        </mat-tab>
        <mat-tab label="سجل توصيل الويب هوكس (Webhooks)">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">سجل التوصيل الأخير</h3>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #10b981; margin-left: 12px;">check_circle</mat-icon>
                <span matListItemTitle style="font-weight: 500;">مزامنة درجات الطلاب - Moodle</span>
                <span matListItemLine style="color: #64748b;">توصيل ناجح (رمز 200) - 2026-07-04 10:10 ص</span>
              </mat-list-item>
              <mat-divider></mat-divider>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #f59e0b; margin-left: 12px;">replay</mat-icon>
                <span matListItemTitle style="font-weight: 500;">إرسال تبليغ الرسوم - WhatsApp Gateway</span>
                <span matListItemLine style="color: #ef4444;">جاري إعادة المحاولة (محاولة 2) - 2026-07-04 10:11 ص</span>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class GatewayDashboardComponent {
  providers = signal([
    { name: 'بوابة التعليم الإلكتروني Moodle', status: 'connected', last_sync: 'منذ 5 دقائق' },
    { name: 'هوية مايكروسوفت النشطة Azure AD', status: 'connected', last_sync: 'منذ ساعة' },
    { name: 'بوابة الدفع الإلكتروني (Payfort/Stripe)', status: 'connected', last_sync: 'منذ دقيقة' },
    { name: 'خدمة إشعارات الهواتف Firebase Cloud Messaging', status: 'connected', last_sync: 'نشط ومستمر' }
  ]);
}
