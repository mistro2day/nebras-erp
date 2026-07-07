import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbPanelComponent } from '../../../shared/nebras/nb-panel.component';

/**
 * بوابة أولياء الأمور — لغة تصميم Nebras OS.
 * المنطق كما هو — استُبدلت طبقة العرض فقط.
 */
@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTabsModule, NbPageHeaderComponent, NbPanelComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="بوابة أولياء الأمور"
        subtitle="مرحباً بك، أحمد! تابع أداء أبنائك الدراسي والمالي والصحي بكل سهولة."
      >
        <button class="nb-btn-secondary">تحديث البيانات</button>
      </nb-page-header>

      <h2 class="section-title">الأبناء المكفولين</h2>
      <div class="children-grid">
        @for (child of children(); track child.student_id) {
          <div class="nb-card child-card">
            <div class="child-head">
              <div class="avatar">{{ child.name.charAt(0) }}</div>
              <div><strong>{{ child.name }}</strong><span class="sub">طالب - الصف العاشر</span></div>
            </div>
            <div class="child-stats">
              <div class="cs"><span class="cs-label">نسبة الحضور</span><span class="cs-val ok">{{ child.attendance_rate }}%</span></div>
              <div class="cs"><span class="cs-label">الرسوم المتبقية</span><span class="cs-val" [class.bad]="child.outstanding_fees > 0">{{ child.outstanding_fees }} ر.س</span></div>
            </div>
            <div class="child-meta">
              <p>📅 الاختبار القادم: {{ child.next_exam }}</p>
              <p>🚌 حالة النقل: {{ child.transport_status }}</p>
            </div>
          </div>
        }
      </div>

      <nb-panel [flush]="true">
        <mat-tab-group class="nb-tabs">
          <mat-tab label="الفواتير والمدفوعات">
            <div class="list">
              <h3>الملخص المالي</h3>
              <div class="row"><span class="nb-dot success"></span><div><strong>تم سداد دفعة الفصل الدراسي الأول</strong><span class="meta">المبلغ: 3,750 ر.س - 2026-06-15</span></div></div>
              <div class="row"><span class="nb-dot warning"></span><div><strong>فاتورة مستحقة - رسوم حافلة النقل</strong><span class="meta danger">المبلغ: 1,250 ر.س - يستحق في 2026-07-20</span></div></div>
            </div>
          </mat-tab>
          <mat-tab label="الإعلانات والرسائل">
            <div class="list">
              <h3>آخر الإعلانات</h3>
              @for (ann of announcements(); track ann.id) {
                <div class="row"><span class="ico">📣</span><div><strong>{{ ann.title }}</strong><span class="meta">{{ ann.content }}</span></div></div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </nb-panel>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 20px; overflow-y: auto; min-width: 0; }
    .section-title { font-size: 14px; font-weight: 700; color: var(--nb-text); margin: 0 0 12px; }
    .children-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .child-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--nb-primary-50); color: var(--nb-primary-600); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; }
    .child-head strong { display: block; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .child-head .sub { font-size: 12px; color: var(--nb-text-muted); }
    .child-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .cs { background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft); padding: 10px 12px; border-radius: var(--nb-radius); }
    .cs-label { font-size: 11px; color: var(--nb-text-muted); display: block; }
    .cs-val { font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .cs-val.ok { color: var(--nb-success); }
    .cs-val.bad { color: var(--nb-danger); }
    .child-meta { margin-top: 14px; font-size: 12px; color: var(--nb-text-secondary); }
    .child-meta p { margin: 4px 0; }
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
export class ParentDashboardComponent {
  children = signal([
    {
      student_id: '1',
      name: 'خالد أحمد الجميل',
      attendance_rate: 98.4,
      outstanding_fees: 1250,
      next_exam: 'رياضيات نهائي (2026-07-12)',
      transport_status: 'مسار حافلة 14 - جاري التوصيل'
    },
    {
      student_id: '2',
      name: 'سارة أحمد الجميل',
      attendance_rate: 95.1,
      outstanding_fees: 0,
      next_exam: 'علوم نهائي (2026-07-14)',
      transport_status: 'مسار حافلة 08 - واصل للمدرسة'
    }
  ]);

  announcements = signal([
    { id: 1, title: 'بدء التسجيل للنقل المدرسي للفصل القادم', content: 'نرجو من السادة أولياء الأمور المسارعة بتسجيل أبنائهم في خدمة الحافلات قبل انتهاء الموعد.' },
    { id: 2, title: 'جدول امتحانات الفصل الدراسي الثاني الموحد', content: 'تم نشر جدول الامتحانات النهائية بمركز التحميل، يرجى الاطلاع والمتابعة.' }
  ]);
}
