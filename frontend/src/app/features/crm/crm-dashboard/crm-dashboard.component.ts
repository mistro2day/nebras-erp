import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * لوحة تحكم إدارة علاقات العملاء (CRM) — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="لوحة تحكم إدارة علاقات العملاء (CRM)"
        subtitle="متابعة طلبات الاستقطاب، حملات التسويق، رضا أولياء الأمور، وقضايا وشكاوى الدعم الفني."
      >
        <button class="nb-btn-secondary">تحديث لوحة التحليلات</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="العملاء المحتملين الجدد" value="148" suffix="عميل" valueKind="info"></nb-stat-card>
        <nb-stat-card label="نسبة تحويل الطلاب" value="65.4" suffix="%" valueKind="success"></nb-stat-card>
        <nb-stat-card label="الحالات والشكاوى المفتوحة" value="12" suffix="حالة" valueKind="warning"></nb-stat-card>
        <nb-stat-card label="مؤشر رضا أولياء الأمور" value="4.6 / 5"></nb-stat-card>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="متابعة قمع الاستقطاب (Lead Funnel)">
            <div class="list">
              <h3>آخر المتابعات والعملاء المحتملين</h3>
              @for (lead of leads(); track lead.name) {
                <div class="row">
                  <div><strong>{{ lead.name }}</strong><span class="meta">درجة الاهتمام: {{ lead.interest === 'high' ? 'عالية جداً' : 'متوسطة' }} | القناة: {{ lead.source }}</span></div>
                  <span [class]="lead.interest === 'high' ? 'nb-badge-success' : 'nb-badge-warning'">{{ lead.interest === 'high' ? 'عالية' : 'متوسطة' }}</span>
                </div>
              }
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
    .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--nb-border-soft); }
    .row:last-child { border-bottom: none; }
    .row strong { display: block; font-size: 13px; color: var(--nb-text); }
    .row .meta { font-size: 11px; color: var(--nb-text-muted); }
  `]
})
export class CrmDashboardComponent {
  leads = signal([
    { name: 'سالم العلي', interest: 'high', source: 'إعلان فيسبوك' },
    { name: 'فهد المطيري', interest: 'medium', source: 'زيارة مباشرة لمعرض القبول' },
    { name: 'نورة الدوسري', interest: 'high', source: 'الموقع الإلكتروني الرسمي' }
  ]);
}
