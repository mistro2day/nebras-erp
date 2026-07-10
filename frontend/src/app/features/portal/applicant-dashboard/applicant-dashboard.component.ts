import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * بوابة المتقدمين الجدد — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بوابة المتقدمين الجدد"
        subtitle="مرحباً بك يا سعيد! تابع هنا حالة طلب الانضمام والخطوات القادمة للقبول."
      >
        <button class="nb-btn-secondary">تحديث الطلب</button>
      </nb-page-header>

      <div class="status-banner">
        <span class="mark">✦</span>
        <div>
          <strong>حالة طلب التقديم الحالي — المرحلة الحالية: تحت المراجعة والدراسة الأكاديمية</strong>
          <p>لقد استلمنا مستنداتك المرفوعة بنجاح. الخطوة التالية هي حضور اختبار القبول والمفاضلة المحدد أدناه.</p>
        </div>
      </div>

      <div class="grid">
        <nb-panel title="جدول اختبار القبول">
          <p class="info"><strong>المادة:</strong> اختبار الذكاء والقدرات الرياضية واللغوية</p>
          <p class="info"><strong>التاريخ:</strong> 2026-07-08 09:00 ص</p>
          <p class="info"><strong>الموقع:</strong> قاعة المدرسة الكبرى - المبنى الرئيسي</p>
        </nb-panel>

        <nb-panel title="الوثائق والمستندات المطلوبة">
  <div class="doc"><span class="nb-dot success"></span><span>صورة الرقم الوطني / الجواز لولي الأمر</span></div>
          <div class="doc"><span class="nb-dot success"></span><span>شهادة ميلاد الطالب</span></div>
          <div class="doc"><span class="nb-dot danger"></span><span class="req">سجل التطعيمات وتقرير اللياقة الطبية (مطلوب)</span></div>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .status-banner {
      display: flex; gap: 12px; align-items: flex-start;
      background: var(--nb-primary-50); border: 1px solid var(--nb-primary-200);
      border-radius: var(--nb-radius-card); padding: 16px; margin-bottom: 16px;
    }
    .status-banner .mark { width: 24px; height: 24px; background: var(--nb-primary-600); color: var(--nb-on-primary); border-radius: var(--nb-radius-compact); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
    .status-banner strong { display: block; color: var(--nb-primary-700, var(--nb-primary-600)); font-size: 13px; }
    .status-banner p { margin: 6px 0 0; font-size: 12px; color: var(--nb-text-secondary); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .info { margin: 8px 0; color: var(--nb-text-secondary); font-size: 13px; }
    .info strong { color: var(--nb-text); }
    .doc { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); font-size: 13px; color: var(--nb-text); }
    .doc:last-child { border-bottom: none; }
    .doc .req { color: var(--nb-danger); }
  `]
})
export class ApplicantDashboardComponent {
  // Logic here
}
