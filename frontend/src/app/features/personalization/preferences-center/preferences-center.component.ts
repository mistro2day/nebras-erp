import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * مركز تفضيلات وتخصيص واجهة المستخدم — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-preferences-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, MatSlideToggleModule, MatSliderModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="مركز تفضيلات وتخصيص واجهة المستخدم"
        subtitle="تعديل مظهر المنصة الشخصي، إعدادات اللغات، خيارات الوصول الميسر، وتفضيلات الإشعارات."
      >
        <button class="nb-btn-primary">حفظ التغييرات الشخصية</button>
      </nb-page-header>

      <div class="grid">
        <nb-panel title="مظهر الواجهة الفعلي">
          <div class="theme-preview">
            <div class="mark">🎨</div>
            <h3>ثيم نبراس الافتراضي</h3>
            <span>تحديث التباين والكثافة تلقائياً</span>
          </div>
          <div class="summary">
            <div class="sum-row"><span>حجم الخط</span><strong>{{ fontSize() }}%</strong></div>
            <div class="sum-row"><span>تباين عالي</span>
              @if (highContrast()) { <strong class="ok">نشط</strong> } @else { <strong class="off">غير نشط</strong> }
            </div>
          </div>
        </nb-panel>

        <nb-panel [flush]="true">
          <mat-tab-group class="nb-tabs">
            <mat-tab label="الوصول الميسر (Accessibility)">
              <div class="tab-body">
                <div class="setting">
                  <h3>مستوى التباين (Contrast Level)</h3>
                  <p>تفعيل التباين العالي للنصوص والحدود لتسهيل القراءة للرؤية الضعيفة.</p>
                  <mat-slide-toggle [checked]="highContrast()" (change)="toggleHighContrast()">تفعيل وضع التباين العالي</mat-slide-toggle>
                </div>
                <hr class="nb-divider" />
                <div class="setting">
                  <h3>حجم الخطوط (Font Scaling)</h3>
                  <p>تعديل حجم النصوص في كافة الشاشات والقوائم بالمنصة.</p>
                  <mat-slider min="100" max="200" step="10" showTickMarks discrete [displayWith]="formatLabel">
                    <input matSliderThumb [value]="fontSize()" (valueChange)="fontSize.set($event)">
                  </mat-slider>
                </div>
              </div>
            </mat-tab>

            <mat-tab label="سمات ومظهر المنصة">
              <div class="tab-body">
                <h3>اختر سمة مظهرك المفضلة</h3>
                <div class="themes">
                  <div class="theme-card active"><span class="ico">☀️</span><h4>الوضع المضيء (Light Mode)</h4></div>
                  <div class="theme-card"><span class="ico">🌙</span><h4>الوضع الداكن (Dark Mode)</h4></div>
                </div>
              </div>
            </mat-tab>

            <mat-tab label="التوطين والتوقيت">
              <div class="tab-body">
                <div class="setting"><h3>لغة العرض المفضلة</h3><p class="ok-text">العربية (RTL) - لغة النظام الافتراضية</p></div>
                <hr class="nb-divider" />
                <div class="setting"><h3>المنطقة الزمنية الافتراضية</h3><p>GMT+03:00 (توقيت مكة المكرمة)</p></div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .grid { display: grid; grid-template-columns: 1fr 2fr; gap: 16px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .theme-preview { text-align: center; padding: 24px; background: var(--nb-surface-raised); border-radius: var(--nb-radius); border: 1px solid var(--nb-border-soft); margin-bottom: 16px; }
    .theme-preview .mark { font-size: 40px; }
    .theme-preview h3 { font-weight: 700; color: var(--nb-text); margin: 8px 0 4px; font-size: 14px; }
    .theme-preview span { font-size: 12px; color: var(--nb-text-muted); }
    .summary { display: flex; flex-direction: column; gap: 10px; }
    .sum-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: var(--nb-text-secondary); padding-bottom: 8px; border-bottom: 1px solid var(--nb-border-soft); }
    .sum-row:last-child { border-bottom: none; }
    .sum-row strong { color: var(--nb-text); }
    .sum-row .ok { color: var(--nb-success); }
    .sum-row .off { color: var(--nb-danger); }
    .nb-tabs { padding: 4px 8px 8px; }
    .tab-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }
    .setting h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 8px; font-size: 14px; }
    .setting p { color: var(--nb-text-muted); font-size: 12px; margin: 0 0 14px; }
    .setting p.ok-text { color: var(--nb-success); font-weight: 600; }
    .nb-divider { border: 0; border-top: 1px solid var(--nb-border); margin: 0; }
    .themes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .theme-card { padding: 20px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); cursor: pointer; text-align: center; background: var(--nb-surface); }
    .theme-card.active { border: 2px solid var(--nb-primary-600); }
    .theme-card .ico { font-size: 24px; }
    .theme-card h4 { margin: 8px 0 0; font-weight: 600; font-size: 13px; color: var(--nb-text); }
  `]
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
