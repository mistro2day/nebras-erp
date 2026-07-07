import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';
import { NbStatCardComponent } from '../../../shared/nebras/nb-stat-card.component';

/**
 * بوابة الطلاب — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, NbPageHeaderComponent, NbPanelComponent, NbStatCardComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بوابة الطلاب"
        subtitle="مرحباً بك مجدداً يا خالد! راجع جدولك الدراسي وحصصك اليومية ودرجاتك."
      >
        <button class="nb-btn-secondary">تحديث لوحة التحكم</button>
      </nb-page-header>

      <div class="stats-grid">
        <nb-stat-card label="نسبة الحضور التراكمية" value="98.2" suffix="%" valueKind="success"></nb-stat-card>
        <nb-stat-card label="المواد الدراسية" value="8" suffix="مواد" valueKind="info"></nb-stat-card>
        <nb-stat-card label="الكتب المستعارة" value="كتاب واحد"></nb-stat-card>
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="جدول الحصص اليومي">
            <div class="list">
              <h3>حصص اليوم</h3>
              @for (cls of todayClasses(); track cls.subject) {
                <div class="row"><span class="ico">🕐</span><div><strong>{{ cls.subject }}</strong><span class="meta">الوقت: {{ cls.time }} | القاعة: {{ cls.room }}</span></div></div>
              }
            </div>
          </mat-tab>
          <mat-tab label="الامتحانات والنتائج">
            <div class="list">
              <h3>الامتحانات النهائية القادمة</h3>
              <div class="row"><span class="ico">📝</span><div><strong>فيزياء نهائي</strong><span class="meta">التاريخ: 2026-07-15 | نوع الامتحان: كتابي</span></div></div>
              <div class="row"><span class="ico">📝</span><div><strong>كيمياء عملي</strong><span class="meta">التاريخ: 2026-07-18 | نوع الامتحان: معملي</span></div></div>
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
    .row .ico { font-size: 16px; }
    .row strong { display: block; font-size: 13px; color: var(--nb-text); }
    .row .meta { font-size: 11px; color: var(--nb-text-muted); }
  `]
})
export class StudentDashboardComponent {
  todayClasses = signal([
    { subject: 'اللغة العربية آداب', time: '08:00 - 08:45', room: 'قاعة أ3' },
    { subject: 'الرياضيات الحديثة', time: '08:45 - 09:30', room: 'معمل الحاسوب 1' },
    { subject: 'الفيزياء التجريبية', time: '09:45 - 10:30', room: 'المختبر الرئيسي' },
    { subject: 'التربية الإسلامية والسلوك', time: '10:30 - 11:15', room: 'قاعة أ3' }
  ]);
}
