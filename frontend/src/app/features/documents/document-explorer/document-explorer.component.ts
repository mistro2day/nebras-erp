import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-document-explorer',
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
          <h1 style="font-size: 2rem; font-weight: 700; color: #0f172a; margin: 0;">متصفح المستندات والأرشفة الرقمية (DMS)</h1>
          <p style="color: #64748b; margin-top: 4px;">إدارة المجلدات والوثائق المؤسسية، فحص وتدقيق الإصدارات، والأرشفة والتحكم بالأذونات.</p>
        </div>
        <button mat-flat-button color="primary" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 8px; padding: 0 20px;">
          <mat-icon style="margin-left: 8px;">upload_file</mat-icon>رفع مستند جديد
        </button>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #0284c7; margin-left: 12px;">folder</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">إجمالي المجلدات</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            24 مجلد
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #10b981; margin-left: 12px;">description</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">إجمالي المستندات</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            1,420 مستند
          </mat-card-content>
        </mat-card>

        <mat-card style="border-radius: 16px; border: 1px solid #e2e8f0;">
          <mat-card-header>
            <mat-icon style="color: #f59e0b; margin-left: 12px;">storage</mat-icon>
            <mat-card-title style="font-size: 1rem; color: #64748b;">المساحة المستخدمة</mat-card-title>
          </mat-card-header>
          <mat-card-content style="font-size: 2rem; font-weight: 700; color: #0f172a; margin-top: 8px;">
            4.2 جيجابايت
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Detail Tabs -->
      <mat-tab-group style="background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <mat-tab label="مستنداتي الأخيرة">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">المستندات المعدلة حديثاً</h3>
            <mat-list>
              @for (doc of documents(); track doc.title) {
                <mat-list-item>
                  <mat-icon matListItemIcon style="color: #0284c7; margin-left: 12px;">picture_as_pdf</mat-icon>
                  <span matListItemTitle style="font-weight: 500;">{{ doc.title }}</span>
                  <span matListItemLine style="color: #64748b;">الإصدار: {{ doc.version }} | الحجم: {{ doc.size }} | المالك: {{ doc.owner }}</span>
                </mat-list-item>
                <mat-divider></mat-divider>
              }
            </mat-list>
          </div>
        </mat-tab>
        <mat-tab label="شجرة المجلدات والمشاركة">
          <div style="padding: 20px;">
            <h3 style="font-weight: 600; color: #0f172a; margin-bottom: 16px;">أقسام المجلدات المؤسسية</h3>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #f59e0b; margin-left: 12px;">folder_shared</mat-icon>
                <span matListItemTitle style="font-weight: 500;">ملفات شؤون الموظفين (HR Files)</span>
                <span matListItemLine style="color: #64748b;">مشاركة مع قسم الموارد البشرية | الأذونات: قراءة/كتابة</span>
              </mat-list-item>
              <mat-divider></mat-divider>
              <mat-list-item>
                <mat-icon matListItemIcon style="color: #f59e0b; margin-left: 12px;">folder_shared</mat-icon>
                <span matListItemTitle style="font-weight: 500;">الملفات الطبية والسجلات الصحية</span>
                <span matListItemLine style="color: #ef4444;">مغلق/سري للغاية | الأذونات: قراءة فقط</span>
              </mat-list-item>
            </mat-list>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class DocumentExplorerComponent {
  documents = signal([
    { title: 'فاتورة المشتريات رقم 14', version: '1.0', size: '1.2 MB', owner: 'الشؤون المالية' },
    { title: 'عقد الموظف سالم العلي', version: '2.1', size: '4.8 MB', owner: 'الموارد البشرية' },
    { title: 'لائحة تنظيم النقل المدرسي', version: '1.2', size: '850 KB', owner: 'إدارة النقل' }
  ]);
}
