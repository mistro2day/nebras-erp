import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="portal-container" dir="rtl" style="padding: 24px; font-family: 'Outfit', 'Inter', sans-serif; background: #f8fafc; min-height: 100vh;">
      <!-- Header -->
      <div class="portal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
        <div>
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">منصة الإعدادات العامة وإدارة الميزات الفورية</h1>
          <p style="color: #64748b; margin-top: 4px;">تعديل وتحديث إعدادات النظام هرمياً، التحكم بتفعيل الميزات (Feature Flags)، وإدارة التراخيص والموديولات.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">sync</mat-icon>تحديث وتحميل الإعدادات (Hot Reload)
        </button>
      </div>

      <!-- Quick Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #10b981; margin-left: 12px;">verified</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">نسخة الترخيص</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 1.8rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            Enterprise Edition
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #0284c7; margin-left: 12px;">view_module</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">الموديولات النشطة</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            32 موديول
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #f59e0b; margin-left: 12px;">toggle_on</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">الميزات التجريبية (Beta)</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            5 ميزات نشطة
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Tabs Config -->
      <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
        <mat-card-content style="padding: 12px 0 0 0;">
          <mat-tab-group>
            <!-- Feature Flags Tab -->
            <mat-tab label="الميزات الفورية (Feature Flags)">
              <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                @for (flag of features(); track flag.code) {
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                    <div>
                      <h4 style="margin: 0; font-weight: 600; color: #1e293b;">{{ flag.name }}</h4>
                      <span style="font-size: 0.85rem; color: #64748b; font-family: monospace;">{{ flag.code }}</span>
                    </div>
                    <mat-slide-toggle [checked]="flag.enabled" (change)="toggleFeature(flag)"></mat-slide-toggle>
                  </div>
                }
              </div>
            </mat-tab>

            <!-- Module Registry Tab -->
            <mat-tab label="سجل الموديولات (Module Registry)">
              <div style="padding: 24px;">
                <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">الموديولات الأساسية للمنصة</h3>
                <mat-list>
                  <mat-list-item>
                    <mat-icon matListItemIcon style="color: #10b981; margin-left: 12px;">check_circle</mat-icon>
                    <span matListItemTitle style="font-weight: 500;">إدارة المستندات والأرشفة (DMS)</span>
                    <span matListItemLine style="color: #64748b;">الإصدار: v1.0.4 | الحالة: نشط وصحي</span>
                  </mat-list-item>
                  <mat-divider></mat-divider>
                  <mat-list-item>
                    <mat-icon matListItemIcon style="color: #10b981; margin-left: 12px;">check_circle</mat-icon>
                    <span matListItemTitle style="font-weight: 500;">بوابة الدفع والتكامل المالي (Finance Gateway)</span>
                    <span matListItemLine style="color: #64748b;">الإصدار: v2.1.0 | الحالة: نشط وصحي</span>
                  </mat-list-item>
                </mat-list>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class FeatureFlagsComponent {
  features = signal([
    { name: 'تحليلات الذكاء الاصطناعي للفصول الدراسية', code: 'ai-classroom-analytics', enabled: true },
    { name: 'الربط التلقائي ببوابة الحكومة الرقمية', code: 'gov-api-integration', enabled: false },
    { name: 'مستعرض الملفات الثلاثي الأبعاد في المكتبة', code: 'library-3d-viewer', enabled: true }
  ]);

  toggleFeature(flag: any) {
    flag.enabled = !flag.enabled;
  }
}
