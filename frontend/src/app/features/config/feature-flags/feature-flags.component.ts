import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * منصة الإعدادات العامة وإدارة الميزات الفورية — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-feature-flags',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, MatSlideToggleModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة الإعدادات العامة وإدارة الميزات الفورية"
        subtitle="تعديل إعدادات النظام هرمياً، التحكم بتفعيل الميزات (Feature Flags)، وإدارة التراخيص والموديولات."
      >
        <button class="nb-btn-secondary">تحديث وتحميل الإعدادات (Hot Reload)</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="نسخة الترخيص" value="Enterprise Edition" valueKind="success"></nb-stat-card>
        <nb-stat-card label="الموديولات النشطة" value="32" suffix="موديول" valueKind="info"></nb-stat-card>
        <nb-stat-card label="الميزات التجريبية (Beta)" value="5" suffix="نشطة" valueKind="warning"></nb-stat-card>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="الميزات الفورية (Feature Flags)">
            <div class="flags-list">
              @for (flag of features(); track flag.code) {
                <div class="flag-item">
                  <div class="flag-info">
                    <h4>{{ flag.name }}</h4>
                    <span class="mono">{{ flag.code }}</span>
                  </div>
                  <mat-slide-toggle [checked]="flag.enabled" (change)="toggleFeature(flag)"></mat-slide-toggle>
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="سجل الموديولات (Module Registry)">
            <div class="modules">
              <h3>الموديولات الأساسية للمنصة</h3>
              <div class="mod-item">
                <span class="nb-dot success"></span>
                <div><strong>إدارة المستندات والأرشفة (DMS)</strong><span class="meta">الإصدار: v1.0.4 | الحالة: نشط وصحي</span></div>
              </div>
              <div class="mod-item">
                <span class="nb-dot success"></span>
                <div><strong>بوابة الدفع والتكامل المالي (Finance Gateway)</strong><span class="meta">الإصدار: v2.1.0 | الحالة: نشط وصحي</span></div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .nb-tabs { padding: 4px 8px 8px; }
    .flags-list { display: flex; flex-direction: column; gap: 10px; padding: 12px 8px; }
    .flag-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); background: var(--nb-surface-raised); }
    .flag-info h4 { margin: 0; font-weight: 600; color: var(--nb-text); font-size: 13px; }
    .mono { font-size: 12px; color: var(--nb-text-muted); font-family: monospace; }
    .modules { padding: 16px; }
    .modules h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 14px; font-size: 14px; }
    .mod-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .mod-item:last-child { border-bottom: none; }
    .mod-item .nb-dot { margin-top: 5px; }
    .mod-item strong { display: block; font-size: 13px; color: var(--nb-text); }
    .mod-item .meta { font-size: 11px; color: var(--nb-text-muted); }
  `]
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
