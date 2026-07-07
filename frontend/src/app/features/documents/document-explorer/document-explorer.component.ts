import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * متصفح المستندات والأرشفة الرقمية (DMS) — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-document-explorer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="متصفح المستندات والأرشفة الرقمية (DMS)"
        subtitle="إدارة المجلدات والوثائق المؤسسية، فحص وتدقيق الإصدارات، والأرشفة والتحكم بالأذونات."
      >
        <button class="nb-btn-primary">رفع مستند جديد</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي المجلدات" value="24" suffix="مجلد" valueKind="info"></nb-stat-card>
        <nb-stat-card label="إجمالي المستندات" value="1,420" suffix="مستند" valueKind="success"></nb-stat-card>
        <nb-stat-card label="المساحة المستخدمة" value="4.2" suffix="جيجابايت" valueKind="warning"></nb-stat-card>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="مستنداتي الأخيرة">
            <div class="list">
              <h3>المستندات المعدلة حديثاً</h3>
              @for (doc of documents(); track doc.title) {
                <div class="row">
                  <span class="ico">📄</span>
                  <div><strong>{{ doc.title }}</strong><span class="meta">الإصدار: {{ doc.version }} | الحجم: {{ doc.size }} | المالك: {{ doc.owner }}</span></div>
                </div>
              }
            </div>
          </mat-tab>
          <mat-tab label="شجرة المجلدات والمشاركة">
            <div class="list">
              <h3>أقسام المجلدات المؤسسية</h3>
              <div class="row">
                <span class="ico">📁</span>
                <div><strong>ملفات شؤون الموظفين (HR Files)</strong><span class="meta">مشاركة مع قسم الموارد البشرية | الأذونات: قراءة/كتابة</span></div>
              </div>
              <div class="row">
                <span class="ico">📁</span>
                <div><strong>الملفات الطبية والسجلات الصحية</strong><span class="meta danger">مغلق/سري للغاية | الأذونات: قراءة فقط</span></div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .nb-tabs { padding: 4px 8px 8px; }
    .list { padding: 16px; }
    .list h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 14px; font-size: 14px; }
    .row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .row:last-child { border-bottom: none; }
    .row .ico { font-size: 18px; }
    .row strong { display: block; font-size: 13px; color: var(--nb-text); }
    .row .meta { font-size: 11px; color: var(--nb-text-muted); }
    .row .meta.danger { color: var(--nb-danger); }
  `]
})
export class DocumentExplorerComponent {
  documents = signal([
    { title: 'فاتورة المشتريات رقم 14', version: '1.0', size: '1.2 MB', owner: 'الشؤون المالية' },
    { title: 'عقد الموظف سالم العلي', version: '2.1', size: '4.8 MB', owner: 'الموارد البشرية' },
    { title: 'لائحة تنظيم النقل المدرسي', version: '1.2', size: '850 KB', owner: 'إدارة النقل' }
  ]);
}
