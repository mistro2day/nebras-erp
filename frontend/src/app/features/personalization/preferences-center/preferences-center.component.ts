import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-preferences-center',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatSliderModule
  ],
  template: `
    <div class="portal-container" dir="rtl" style="padding: 24px; font-family: 'Outfit', 'Inter', sans-serif; background: #f8fafc; min-height: 100vh;">
      <!-- Header -->
      <div class="portal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
        <div>
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">مركز تفضيلات وتخصيص واجهة المستخدم</h1>
          <p style="color: #64748b; margin-top: 4px;">تعديل مظهر المنصة الشخصي، إعدادات اللغات، خيارات الوصول الميسر، وتفضيلات الإشعارات.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">check</mat-icon>حفظ التغييرات الشخصية
        </button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
        <!-- Left: Quick Settings Summary -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; height: fit-content;">
          <mat-card-header>
            <mat-card-title style="font-size: 1.15rem; font-weight: 600; color: #0f172a;">مظهر الواجهة الفعلي</mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <div style="text-align: center; padding: 24px; background: #f1f5f9; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 20px;">
              <mat-icon style="font-size: 48px; width: 48px; height: 48px; color: #0284c7;">palette</mat-icon>
              <h3 style="font-weight: 700; color: #1e293b; margin: 8px 0 4px 0;">ثيم نيبرس الافتراضي</h3>
              <span style="font-size: 0.9rem; color: #64748b;">تحديث التباين والكثافة تلقائياً</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #475569; font-weight: 500;">حجم الخط</span>
                <span style="font-weight: 700; color: #0f172a;">{{ fontSize() }}%</span>
              </div>
              <mat-divider></mat-divider>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #475569; font-weight: 500;">تباين عالي</span>
                <span style="font-weight: 700; color: #ef4444;" *ngIf="!highContrast()">غير نشط</span>
                <span style="font-weight: 700; color: #10b981;" *ngIf="highContrast()">نشط</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Right: Tabbed Configuration Panels -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-content style="padding: 12px 0 0 0;">
            <mat-tabs>
              <!-- Accessibility Tab -->
              <mat-tab label="الوصول الميسر (Accessibility)">
                <div style="padding: 24px; display: flex; flex-direction: column; gap: 24px;">
                  <div>
                    <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">مستوى التباين (Contrast Level)</h3>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 16px;">تفعيل التباين العالي للنصوص والحدود لتسهيل القراءة للرؤية الضعيفة.</p>
                    <mat-slide-toggle [checked]="highContrast()" (change)="toggleHighContrast()">تفعيل وضع التباين العالي</mat-slide-toggle>
                  </div>
                  
                  <mat-divider></mat-divider>
                  
                  <div>
                    <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">حجم الخطوط (Font Scaling)</h3>
                    <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 16px;">تعديل حجم النصوص في كافة الشاشات والقوائم بالمنصة.</p>
                    <mat-slider min="100" max="200" step="10" showTickMarks discrete [displayWith]="formatLabel">
                      <input matSliderThumb [value]="fontSize()" (valueChange)="fontSize.set($event)">
                    </mat-slider>
                  </div>
                </div>
              </mat-tab>

              <!-- Branding & Themes Tab -->
              <mat-tab label="سمات ومظهر المنصة">
                <div style="padding: 24px;">
                  <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">اختر سمة مظهرك المفضلة</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="padding: 20px; border: 2px solid #0284c7; border-radius: 12px; cursor: pointer; text-align: center; background: #ffffff;">
                      <mat-icon style="color: #0284c7;">wb_sunny</mat-icon>
                      <h4 style="margin: 8px 0 0 0; font-weight: 600;">الوضع المضيء (Light Mode)</h4>
                    </div>
                    <div style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; cursor: pointer; text-align: center; background: #ffffff;">
                      <mat-icon style="color: #64748b;">nights_stay</mat-icon>
                      <h4 style="margin: 8px 0 0 0; font-weight: 600; color: #64748b;">الوضع الداكن (Dark Mode)</h4>
                    </div>
                  </div>
                </div>
              </mat-tab>

              <!-- Regional & Localization Tab -->
              <mat-tab label="التوطين والتوقيت">
                <div style="padding: 24px; display: flex; flex-direction: column; gap: 20px;">
                  <div>
                    <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">لغة العرض المفضلة</h3>
                    <p style="color: #10b981; font-weight: 600;">العربية (RTL) - لغة النظام الافتراضية</p>
                  </div>
                  <mat-divider></mat-divider>
                  <div>
                    <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 8px;">المنطقة الزمنية الافتراضية</h3>
                    <p style="color: #64748b;">GMT+03:00 (توقيت مكة المكرمة)</p>
                  </div>
                </div>
              </mat-tab>
            </mat-tabs>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class PreferencesCenterComponent {
  fontSize = signal(100);
  highContrast = signal(false);

  toggleHighContrast() {
    this.highContrast.set(!this.highContrast());
  }

  formatLabel(value: number): string {
    return `${value}%`;
  }
}
