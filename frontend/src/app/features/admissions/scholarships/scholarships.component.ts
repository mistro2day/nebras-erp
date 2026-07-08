import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { ADM_PAGE_STYLES } from '../shared/admissions.shared';

/**
 * المنح والإعفاءات الدراسية — شاشة القبول.
 *
 * TODO(backend): لا يوجد نموذج/نقطة نهاية للمنح في خادم القبول حالياً.
 * هذه الشاشة عرض Nebras نظيف بحالة فارغة صادقة (بدون بيانات وهمية)،
 * جاهزة للربط عند إضافة نموذج المنح (مثال: admissions/scholarships).
 */
@Component({
  selector: 'app-admissions-scholarships',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="المنح والإعفاءات الدراسية"
        subtitle="إدارة المنح والإعفاءات المالية للمتقدمين المقبولين وربطها بحساباتهم."
      ></nb-page-header>

      <nb-panel>
        <div class="empty">
          <div class="mark">✦</div>
          <h3>وحدة المنح قيد التجهيز</h3>
          <p>
            سيتم تفعيل إدارة المنح والإعفاءات فور توفّر نموذج المنح في الخادم.
            الواجهة مبنية بلغة تصميم Nebras OS وجاهزة للربط دون بيانات وهمية.
          </p>
        </div>
      </nb-panel>
    </div>
  `,
  styles: [
    ADM_PAGE_STYLES,
    `
      .empty { text-align: center; padding: 40px 20px; }
      .mark {
        width: 44px; height: 44px; margin: 0 auto 14px;
        background: var(--nb-primary-50); color: var(--nb-primary-600);
        border-radius: var(--nb-radius); display: flex; align-items: center; justify-content: center;
        font-size: 20px;
      }
      .empty h3 { font-size: 15px; font-weight: 700; color: var(--nb-text); margin: 0 0 8px; }
      .empty p { font-size: 13px; color: var(--nb-text-muted); margin: 0 auto; max-width: 460px; line-height: 1.7; }
    `,
  ],
})
export class AdmissionsScholarshipsComponent {}
