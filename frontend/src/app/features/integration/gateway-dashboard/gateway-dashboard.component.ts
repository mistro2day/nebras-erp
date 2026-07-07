import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * بوابة الربط والتكامل المؤسسي — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-gateway-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بوابة الربط والتكامل المؤسسي"
        subtitle="مراقبة استدعاءات الـ APIs، والـ Webhooks، وحالة الأنظمة الخارجية المتصلة عبر بوابة الـ Gateway."
      >
        <button class="nb-btn-secondary">تحديث لوحة المراقبة</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="إجمالي النداءات اليوم" value="145,280" suffix="طلب" valueKind="info"></nb-stat-card>
        <nb-stat-card label="متوسط زمن الاستجابة" value="42" suffix="مللي ثانية" valueKind="success"></nb-stat-card>
        <nb-stat-card label="نسبة الأخطاء اليوم" value="0.04" suffix="%" valueKind="danger"></nb-stat-card>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="الربط مع الأنظمة الخارجية">
            <div class="list">
              <h3>حالة مزودي الخدمة والمتصلين</h3>
              @for (provider of providers(); track provider.name) {
                <div class="row">
                  <span class="nb-dot" [class.success]="provider.status === 'connected'" [class.danger]="provider.status !== 'connected'"></span>
                  <div><strong>{{ provider.name }}</strong><span class="meta">الحالة: {{ provider.status === 'connected' ? 'متصل ومفعّل' : 'فشل الاتصال' }} | آخر مزامنة: {{ provider.last_sync }}</span></div>
                </div>
              }
            </div>
          </mat-tab>
          <mat-tab label="سجل توصيل الويب هوكس (Webhooks)">
            <div class="list">
              <h3>سجل التوصيل الأخير</h3>
              <div class="row">
                <span class="nb-dot success"></span>
                <div><strong>مزامنة درجات الطلاب - Moodle</strong><span class="meta">توصيل ناجح (رمز 200) - 2026-07-04 10:10 ص</span></div>
              </div>
              <div class="row">
                <span class="nb-dot warning"></span>
                <div><strong>إرسال تبليغ الرسوم - WhatsApp Gateway</strong><span class="meta danger">جاري إعادة المحاولة (محاولة 2) - 2026-07-04 10:11 ص</span></div>
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
    .list { padding: 16px; }
    .list h3 { font-weight: 700; color: var(--nb-text); margin: 0 0 14px; font-size: 14px; }
    .row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .row:last-child { border-bottom: none; }
    .row .nb-dot { margin-top: 5px; }
    .row strong { display: block; font-size: 13px; color: var(--nb-text); }
    .row .meta { font-size: 11px; color: var(--nb-text-muted); }
    .row .meta.danger { color: var(--nb-danger); }
  `]
})
export class GatewayDashboardComponent {
  providers = signal([
    { name: 'بوابة التعليم الإلكتروني Moodle', status: 'connected', last_sync: 'منذ 5 دقائق' },
    { name: 'هوية مايكروسوفت النشطة Azure AD', status: 'connected', last_sync: 'منذ ساعة' },
    { name: 'بوابة الدفع الإلكتروني (Payfort/Stripe)', status: 'connected', last_sync: 'منذ دقيقة' },
    { name: 'خدمة إشعارات الهواتف Firebase Cloud Messaging', status: 'connected', last_sync: 'نشط ومستمر' }
  ]);
}
