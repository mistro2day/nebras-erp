import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <div class="portal-container" dir="rtl" style="padding: 24px; font-family: 'Outfit', 'Inter', sans-serif; background: #f8fafc; min-height: 100vh;">
      <!-- Header -->
      <div class="portal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
        <div>
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">منصة مطور النماذج والاستمارات الذكية</h1>
          <p style="color: #64748b; margin-top: 4px;">تصميم وبناء النماذج الإلكترونية ديناميكياً وتحديد قواعد التحقق والموافقة بصرياً.</p>
        </div>
        <div style="display: flex; gap: 12px;">
          <button mat-stroked-button style="border-radius: 8px;">
            <mat-icon style="margin-left: 6px;">visibility</mat-icon>معاينة النموذج
          </button>
          <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 8px; padding: 0 20px;">
            <mat-icon style="margin-left: 6px;">save</mat-icon>حفظ المخطط (Schema)
          </button>
        </div>
      </div>

      <!-- Layout Grid -->
      <div style="display: grid; grid-template-columns: 280px 1fr 300px; gap: 24px;">
        <!-- Left Palette: Field Picker -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; height: fit-content;">
          <mat-card-header>
            <mat-card-title style="font-size: 1.1rem; font-weight: 600; color: #0f172a;">لوحة العناصر</mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding: 12px 0 0 0;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              @for (field of paletteFields(); track field.label) {
                <div style="display: flex; align-items: center; padding: 10px 14px; background: #f1f5f9; border-radius: 8px; cursor: pointer; border: 1px dashed #cbd5e1; font-weight: 500; color: #334155;">
                  <mat-icon style="margin-left: 10px; color: #64748b;">{{ field.icon }}</mat-icon>
                  {{ field.label }}
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Center: Form Canvas -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; min-height: 500px; background: #ffffff;">
          <mat-card-header>
            <mat-card-title style="font-size: 1.2rem; font-weight: 600; color: #0f172a;">مساحة التصميم (Canvas)</mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <div style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px; text-align: center; color: #94a3b8;" *ngIf="canvasFields().length === 0">
              <mat-icon style="font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; color: #cbd5e1;">drag_indicator</mat-icon>
              <p style="margin: 0; font-size: 1.1rem;">اسحب الحقول من لوحة العناصر وأفلتها هنا للبدء بالتصميم.</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 16px;" *ngIf="canvasFields().length > 0">
              @for (field of canvasFields(); track field.name) {
                <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; position: relative;">
                  <span style="font-weight: 600; color: #334155; display: block; margin-bottom: 8px;">{{ field.label }}</span>
                  <mat-form-field appearance="outline" style="width: 100%;">
                    <input matInput [placeholder]="field.placeholder" disabled>
                  </mat-form-field>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Right Properties: Inspector -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; height: fit-content;">
          <mat-card-header>
            <mat-card-title style="font-size: 1.1rem; font-weight: 600; color: #0f172a;">مفتش الخصائص</mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <p style="color: #64748b; font-size: 0.95rem;">اختر حقولاً من لوحة مساحة التصميم لتعديل خصائصها، شروط العرض، وقواعد التحقق.</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class FormBuilderComponent {
  paletteFields = signal([
    { label: 'حقل نصي قصير', icon: 'text_fields', type: 'text' },
    { label: 'حقل نصي طويل', icon: 'notes', type: 'textarea' },
    { label: 'حقل أرقام', icon: 'tag', type: 'number' },
    { label: 'تحديد تاريخ', icon: 'calendar_today', type: 'date' },
    { label: 'قائمة خيارات', icon: 'arrow_drop_down_circle', type: 'select' }
  ]);

  canvasFields = signal([
    { label: 'الاسم الكامل للطالب', name: 'student_name', placeholder: 'أدخل الاسم الثلاثي للطالب...', type: 'text' },
    { label: 'تاريخ الميلاد', name: 'birth_date', placeholder: '', type: 'date' }
  ]);
}
