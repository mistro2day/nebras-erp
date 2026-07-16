import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../shared/nebras/nb-panel.component';
import { NbBadgeComponent } from '../../shared/nebras/nb-badge.component';
import { NbDrawerComponent } from '../../shared/nebras/nb-drawer.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

import { NbModalComponent } from '../../shared/nebras/nb-modal.component';

@Component({
  selector: 'app-attendance-check-in-methods',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NbPageHeaderComponent,
    NbPanelComponent,
    NbModalComponent
  ],
  template: `
    <div class="page" dir="rtl">
      <!-- رأس الصفحة -->
      <nb-page-header
        title="طرق تسجيل البصمة والتحقق الجغرافي"
        subtitle="تحديد وضبط إعدادات النطاق الجغرافي (Geofencing) للتحقق من تواجد الموظفين داخل الفروع أثناء التبصيم"
      >
        <div class="header-nav">
          <a routerLink="/attendance/dashboard" class="nav-btn">نظرة عامة</a>
          <a routerLink="/attendance/shifts" class="nav-btn">الدوامات وجدولة العمل</a>
          <a routerLink="/attendance/corrections" class="nav-btn">طلبات التصحيح</a>
          <a routerLink="/attendance/policies" class="nav-btn">سياسات الحضور</a>
          <a routerLink="/attendance/check-in-methods" class="nav-btn active">طرق تسجيل البصمة والتحقق</a>
        </div>
      </nb-page-header>

      <!-- ضبط إعدادات النطاق الجغرافي للفرع -->
      <div class="container-grid">
        <div class="setup-card">
          <nb-panel title="آلية تسجيل الحضور الخاصة بـ حي السلامة" [flush]="true">
            <div class="p-20">
              <div class="step-num">
                <span class="badge-num">1</span>
                <h3>استخدام طريقة التسجيل</h3>
              </div>

              <!-- خيارات طريقة التبصيم -->
              <div class="options-group">
                <label class="option-box active">
                  <div class="opt-head">
                    <input type="radio" name="check_in_mode" checked />
                    <span class="label-txt">نطاق جغرافي (مفعّل)</span>
                  </div>
                  <p class="opt-desc">حدد نطاقاً جغرافياً يُمكّن الموظفين المتواجدين فيه تسجيل دخولهم وخروجهم من الدوام عن طريق تطبيق الجوال.</p>
                </label>

                <label class="option-box">
                  <div class="opt-head">
                    <input type="radio" name="check_in_mode" />
                    <span class="label-txt">أجهزة البصمة المعتمدة</span>
                  </div>
                  <p class="opt-desc">استخدم كلاً من النطاق الجغرافي وأجهزة البصمة المعتمدة لتسجيل الحضور والانصراف.</p>
                </label>
              </div>

              <div class="step-num mt-30">
                <span class="badge-num">2</span>
                <h3>تعريف النطاق الجغرافي للفرع</h3>
              </div>

              <div class="map-container">
                <div class="map-controls">
                  <input type="text" class="form-control" placeholder="ابحث عن موقع الفرع..." value="جدة - حي السلامة" />
                  <button class="btn-primary">تحديث الإحداثيات</button>
                </div>

                <!-- خريطة تفاعلية مجانية بالكامل من OpenStreetMap ونطاق البصمة الجغرافي -->
                <div class="mock-map" style="position: relative; overflow: hidden; border-radius: 8px;">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    style="border:0; min-height: 320px;" 
                    src="https://www.openstreetmap.org/export/embed.html?bbox=39.1400,21.5700,39.1600,21.5900&layer=mapnik&marker=21.5796,39.1492" 
                    allowfullscreen>
                  </iframe>
                  <div class="geofence-circle" style="position: absolute; pointer-events: none; z-index: 15; top: calc(50% - 70px); left: calc(50% - 70px);">
                    <span class="center-pin">📍</span>
                    <div class="radius-overlay"></div>
                  </div>
                  <div class="map-overlay-info" style="z-index: 20;">
                    <strong>الفرع المحدد:</strong> جدة - حي السلامة | <strong>نطاق السماح:</strong> 150 متر
                  </div>
                </div>
              </div>

              <div class="actions-footer mt-20">
                <button class="btn-primary" (click)="saveGeofence()">حفظ إعدادات النطاق الجغرافي</button>
              </div>
            </div>
          </nb-panel>
        </div>

        <!-- معلومات الدليل الجغرافي والتحقق -->
        <div class="sidebar-guide">
          <nb-panel title="شرح آلية الاحتساب والتحقق">
            <div class="guide-content">
              <h4>آلية التحقق الجغرافي:</h4>
              <ol class="guide-list">
                <li><strong>الربط بقاعدة البيانات:</strong> يتم تحديد إحداثيات خطوط الطول والعرض للفرع تلقائياً.</li>
                <li><strong>التحقق الذاتي:</strong> عند استخدام الموظف لتطبيق الجوال لتسجيل حضوره، يقوم النظام بحساب المسافة بين موقعه وموقع الفرع.</li>
                <li><strong>التحقق الزمني والجغرافي:</strong> إذا تجاوز الموظف مسافة الـ 150 متراً المسموحة، سيتم رفض بصمته تلقائياً ولن يتم قبولها.</li>
              </ol>
            </div>
          </nb-panel>
      </div>

      <!-- نافذة نجاح الحفظ المنبثقة بنمط نبراس -->
      <nb-modal [open]="isModalOpen()" title="حفظ إعدادات التحقق" subtitle="إجراءات الحفظ بقاعدة البيانات" (closed)="closeModal()">
        <div class="modal-body-content">
          <p>🎉 تم حفظ إعدادات النطاق الجغرافي (Geofencing) للفرع بنجاح في قاعدة البيانات.</p>
          <p>تم تطبيق شروط التحقق التلقائي للموقع عند تبصيم الموظفين عبر تطبيق الجوال.</p>
        </div>
        <div modal-actions>
          <button class="btn-primary" (click)="closeModal()">حسناً</button>
        </div>
      </nb-modal>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; background: #F8F9FC; }
    .header-nav { display: flex; gap: 8px; margin-top: 12px; align-items: center; width: 100%; border-bottom: 1px solid var(--nb-border-soft); padding-bottom: 8px; }
    .nav-btn { text-decoration: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--nb-text-secondary); border-radius: 6px; transition: all 0.2s; }
    .nav-btn:hover { background: var(--nb-surface-raised); color: var(--nb-text); }
    .nav-btn.active { background: #101828; color: #fff; }

    .container-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-top: 20px; }
    .p-20 { padding: 20px; }

    .step-num { display: flex; align-items: center; gap: 10px; }
    .badge-num { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #E0E7FF; color: #4F46E5; font-weight: 700; border-radius: 50%; font-size: 13px; }
    .step-num h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    
    .options-group { display: flex; gap: 16px; margin-top: 16px; }
    .option-box { flex: 1; border: 1px solid var(--nb-border); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; background: #fff; }
    .option-box.active { border-color: #4F46E5; background: #EEF2F6; box-shadow: 0 0 0 2px rgba(79,70,229,0.1); }
    .opt-head { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--nb-text); font-size: 13.5px; }
    .opt-desc { margin: 8px 0 0 0; font-size: 11px; color: var(--nb-text-muted); line-height: 1.45; }

    .mt-30 { margin-top: 30px; }
    .mt-20 { margin-top: 20px; }

    .map-container { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .map-controls { display: flex; gap: 10px; }
    .form-control { flex: 1; height: 40px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 12px; font-size: 13px; outline: none; background: #fff; }
    
    /* الخريطة التفاعلية المحاكاة */
    .mock-map {
      height: 320px;
      background: #E5E7EB url('https://maps.googleapis.com/maps/api/staticmap?center=24.7136,46.6753&zoom=15&size=600x300&sensor=false') no-repeat center/cover;
      border: 1px solid var(--nb-border);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .geofence-circle {
      width: 140px;
      height: 140px;
      border: 2px dashed #4F46E5;
      border-radius: 50%;
      background: rgba(79,70,229,0.15);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse-geofence 2s infinite ease-in-out;
    }
    .center-pin { font-size: 24px; z-index: 10; }
    
    .map-overlay-info {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(16,24,40,0.85);
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      backdrop-filter: blur(4px);
    }

    @keyframes pulse-geofence {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.05); opacity: 1; }
    }

    .guide-content h4 { margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .guide-list { padding-inline-start: 20px; margin: 0; font-size: 12.5px; color: var(--nb-text-secondary); line-height: 1.6; }
    .guide-list li { margin-bottom: 8px; }

    .btn-primary { background: #101828; color: #fff; border: none; padding: 10px 18px; border-radius: var(--nb-radius); font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-primary:hover { background: #1f2d3d; }
  `]
})
export class AttendanceCheckInMethodsComponent implements OnInit {
  isLoading = signal(false);
  isModalOpen = signal(false);

  ngOnInit() {
    this.isLoading.set(false);
  }

  saveGeofence() {
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }
}
