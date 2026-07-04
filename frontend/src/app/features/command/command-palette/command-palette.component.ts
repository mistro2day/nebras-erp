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
  selector: 'app-command-palette',
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
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">لوحة التحكم والقيادة المركزية (Command Palette)</h1>
          <p style="color: #64748b; margin-top: 4px;">الوصول الفوري والسريع لكافة موديولات المنصة وشاشاتها عن طريق لوحة المفاتيح والبحث الموحد.</p>
        </div>
      </div>

      <!-- Command Search Box -->
      <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 32px; background: #ffffff;">
        <mat-card-content style="padding: 20px;">
          <div style="display: flex; align-items: center; gap: 16px; background: #f1f5f9; padding: 12px 20px; border-radius: 12px; border: 1px solid #cbd5e1;">
            <mat-icon style="color: #0284c7; font-size: 28px; width: 28px; height: 28px;">search</mat-icon>
            <input placeholder="ابحث عن شاشة، إجراء سريع، تقرير، أو مستند... (Ctrl + K)" style="border: none; background: transparent; outline: none; font-size: 1.2rem; width: 100%; font-family: inherit; color: #1e293b;">
            <span style="font-size: 0.85rem; background: #cbd5e1; padding: 4px 8px; border-radius: 6px; color: #475569; font-weight: 600; font-family: monospace;">Ctrl+K</span>
          </div>
        </mat-card-content>
      </mat-card>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
        <!-- Left: Quick Actions & Navigation Suggestions -->
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-card-title style="font-size: 1.2rem; font-weight: 600; color: #0f172a;">إجراءات ومقترحات سريعة</mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              @for (action of quickActions(); track action.name) {
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; cursor: pointer; transition: all 0.2s;" class="action-card">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <mat-icon style="color: #0284c7;">{{ action.icon }}</mat-icon>
                    <span style="font-weight: 600; color: #334155;">{{ action.name }}</span>
                  </div>
                  <mat-icon style="color: #94a3b8;">chevron_left</mat-icon>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Right: Recent & Pinned Commands -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
            <mat-card-header>
              <mat-card-title style="font-size: 1.1rem; font-weight: 600; color: #0f172a;">الأوامر المثبتة (Pinned)</mat-card-title>
            </mat-card-header>
            <mat-card-content style="padding-top: 16px;">
              <mat-list>
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #e11d48; margin-left: 12px;">push_pin</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">إنشاء فاتورة طلابية جديدة</span>
                  <span matListItemLine style="color: #64748b;">توجيه مباشر | الشؤون المالية</span>
                </mat-list-item>
                <mat-divider></mat-divider>
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #e11d48; margin-left: 12px;">push_pin</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">تسجيل حضور حصة جديدة</span>
                  <span matListItemLine style="color: #64748b;">توجيه مباشر | الجدولة والحضور</span>
                </mat-list-item>
              </mat-list>
            </mat-card-content>
          </mat-card>

          <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
            <mat-card-header>
              <mat-card-title style="font-size: 1.1rem; font-weight: 600; color: #0f172a;">آخر عمليات التشغيل</mat-card-title>
            </mat-card-header>
            <mat-card-content style="padding-top: 16px;">
              <mat-list>
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #64748b; margin-left: 12px;">history</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">توليد تقرير الحضور الشهري</span>
                  <span matListItemLine style="color: #64748b;">منذ 10 دقائق</span>
                </mat-list-item>
              </mat-list>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `
})
export class CommandPaletteComponent {
  quickActions = signal([
    { name: 'إنشاء ملف طالب جديد', icon: 'person_add' },
    { name: 'تسجيل موظف جديد', icon: 'badge' },
    { name: 'رفع وثيقة جديدة للـ DMS', icon: 'upload_file' },
    { name: 'بناء استمارة رقمية', icon: 'dynamic_feed' }
  ]);
}
