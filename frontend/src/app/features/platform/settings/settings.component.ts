import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PlatformService } from '../platform.service';
import { FormsModule } from '@angular/forms';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * إعدادات النظام والـ Feature Flags — لغة تصميم Nebras OS.
 * المنطق والخدمات كما هي — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-platform-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatSlideToggleModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إعدادات النظام والـ Feature Flags"
        subtitle="تعديل الإعدادات والتحكم بالميزات المفعلة للمستأجرين وتغيير بارامترات النظام"
      ></nb-page-header>

      <div class="settings-grid">
        <nb-panel title="إعدادات النظام الأساسية">
          <div class="form-container">
            <div class="field">
              <label>اسم المنصة الرئيسي</label>
              <input [(ngModel)]="platformName" />
            </div>
            <div class="field">
              <label>حجم الملف الأقصى المسموح برَفعه (MB)</label>
              <input type="number" [(ngModel)]="maxFileSize" />
            </div>
            <button class="nb-btn-primary" (click)="saveSettings()">حفظ الإعدادات</button>
          </div>
        </nb-panel>

        <nb-panel title="إدارة الـ Feature Flags">
          <div class="flags-list">
            @for (flag of flags(); track $index) {
              <div class="flag-item">
                <div class="flag-info">
                  <strong>{{ flag.flag_name }}</strong>
                  <span class="flag-rollout">التوزيع: {{ flag.rollout_percentage }}%</span>
                </div>
                <mat-slide-toggle [checked]="flag.is_enabled" color="primary"></mat-slide-toggle>
              </div>
            }
            @if (flags().length === 0) { <div class="no-data">لا يوجد Feature Flags مسجلة في هذا القسم.</div> }
          </div>
        </nb-panel>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .settings-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }
    .form-container { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
    .field { display: flex; flex-direction: column; gap: 5px; width: 100%; max-width: 360px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--nb-text); }
    .field input {
      height: 34px;
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius);
      padding: 0 10px;
      font-family: var(--nb-font-family);
      font-size: 13px;
      color: var(--nb-text);
      background: var(--nb-surface);
      outline: none;
    }
    .flags-list { display: flex; flex-direction: column; gap: 10px; }
    .flag-item { display: flex; justify-content: space-between; align-items: center; background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 12px 14px; border-radius: var(--nb-radius); }
    .flag-info { display: flex; flex-direction: column; gap: 3px; font-size: 13px; color: var(--nb-text); }
    .flag-rollout { font-size: 11px; color: var(--nb-text-muted); }
    .no-data { text-align: center; padding: 20px; color: var(--nb-text-muted); font-size: 13px; }
  `]
})
export class PlatformSettingsComponent implements OnInit {
  private platformService = inject(PlatformService);

  flags = this.platformService.featureFlags;
  platformName = 'Nebras School Portal';
  maxFileSize = 10;

  ngOnInit() {
    this.platformService.getFeatureFlags().subscribe();
    this.platformService.getConfigurations().subscribe(res => {
      // إسناد القيم المحفوظة تلقائياً
    });
  }

  saveSettings() {
    this.platformService.setConfiguration('platform_name', this.platformName).subscribe();
    this.platformService.setConfiguration('max_file_size', this.maxFileSize).subscribe();
  }
}