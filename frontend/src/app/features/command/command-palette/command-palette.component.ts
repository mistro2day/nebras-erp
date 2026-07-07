import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * لوحة التحكم والقيادة المركزية (Command Palette) — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة التحكم والقيادة المركزية (Command Palette)"
        subtitle="الوصول الفوري والسريع لكافة موديولات المنصة وشاشاتها عن طريق لوحة المفاتيح والبحث الموحد."
      ></nb-page-header>

      <div class="cmd-search">
        <span class="ico">🔍</span>
        <input placeholder="ابحث عن شاشة، إجراء سريع، تقرير، أو مستند… (Ctrl + K)" />
        <kbd>Ctrl+K</kbd>
      </div>

      <div class="grid">
        <nb-panel title="إجراءات ومقترحات سريعة">
          <div class="actions">
            @for (action of quickActions(); track action.name) {
              <div class="action-card">
                <span class="a-name">{{ action.name }}</span>
                <span class="chev">‹</span>
              </div>
            }
          </div>
        </nb-panel>

        <div class="side">
          <nb-panel title="الأوامر المثبتة (Pinned)">
            <div class="row"><span class="pin">📌</span><div><strong>إنشاء فاتورة طلابية جديدة</strong><span class="meta">توجيه مباشر | الشؤون المالية</span></div></div>
            <div class="row"><span class="pin">📌</span><div><strong>تسجيل حضور حصة جديدة</strong><span class="meta">توجيه مباشر | الجدولة والحضور</span></div></div>
          </nb-panel>
          <nb-panel title="آخر عمليات التشغيل">
            <div class="row"><span class="pin">🕘</span><div><strong>توليد تقرير الحضور الشهري</strong><span class="meta">منذ 10 دقائق</span></div></div>
          </nb-panel>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .cmd-search {
      display: flex; align-items: center; gap: 12px;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      padding: 0 16px; height: 48px; border-radius: var(--nb-radius-card); margin-bottom: 16px;
    }
    .cmd-search .ico { font-size: 18px; }
    .cmd-search input { border: none; background: transparent; outline: none; font-size: 15px; width: 100%; font-family: var(--nb-font-family); color: var(--nb-text); }
    .cmd-search input::placeholder { color: var(--nb-text-faint); }
    .cmd-search kbd { font-size: 11px; background: var(--nb-surface-raised); border: 1px solid var(--nb-border); padding: 3px 8px; border-radius: var(--nb-radius-sm); color: var(--nb-text-secondary); font-weight: 600; font-family: monospace; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .action-card { display: flex; align-items: center; justify-content: space-between; padding: 14px; border: 1px solid var(--nb-border-soft); border-radius: var(--nb-radius); background: var(--nb-surface-raised); cursor: pointer; }
    .action-card:hover { border-color: var(--nb-primary-300); }
    .a-name { font-weight: 600; color: var(--nb-text); font-size: 13px; }
    .chev { color: var(--nb-text-faint); font-size: 18px; }
    .side { display: flex; flex-direction: column; gap: 16px; }
    .row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .row:last-child { border-bottom: none; }
    .row strong { display: block; font-size: 13px; color: var(--nb-text); }
    .row .meta { font-size: 11px; color: var(--nb-text-muted); }
  `]
})
export class CommandPaletteComponent {
  quickActions = signal([
    { name: 'إنشاء ملف طالب جديد', icon: 'person_add' },
    { name: 'تسجيل موظف جديد', icon: 'badge' },
    { name: 'رفع وثيقة جديدة للـ DMS', icon: 'upload_file' },
    { name: 'بناء استمارة رقمية', icon: 'dynamic_feed' }
  ]);
}
