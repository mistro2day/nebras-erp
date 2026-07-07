import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Kpi {
  label: string;
  value: string;
  suffix?: string;
  valueClass?: 'warning' | 'danger';
  trend: string;
  trendClass: 'up' | 'down' | 'info' | 'danger';
}

interface ChartMonth {
  label: string;
  revenue: number;
  expense: number;
  projected?: boolean;
}

interface ApprovalRow {
  title: string;
  meta: string;
  badge?: { label: string; kind: 'danger' | 'warning' };
  primaryAction: 'approve' | 'open';
}

interface FunnelStage {
  label: string;
  width: number;
  value: string;
  color: string;
  success?: boolean;
}

interface TicketRow {
  dot: 'danger' | 'warning' | 'success';
  title: string;
  age: string;
  badge: { label: string; kind: 'danger' | 'warning' | 'success' };
}

interface AiInsight {
  kind: 'warning' | 'default';
  label: string;
  labelClass: 'warning' | 'primary';
  html: string;
  link?: string;
}

/**
 * لوحة القيادة التنفيذية — نسخ حرفي لمحتوى الشاشة 1a من تصدير Nebras OS.html
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <!-- المحتوى -->
    <div class="content">
      <div class="greeting-row">
        <div class="greeting">صباح الخير، د. عبدالله</div>
        <div class="greeting-date">الأحد ٦ يوليو ٢٠٢٦ · الفصل الدراسي الثالث</div>
        <div class="spacer"></div>
        <button class="toolbar-btn">تصدير</button>
        <button class="toolbar-btn">تخصيص اللوحة</button>
      </div>

      <!-- صف المؤشرات -->
      <div class="kpi-grid">
        @for (kpi of kpis; track kpi.label) {
          <div class="kpi-card">
            <span class="kpi-label">{{ kpi.label }}</span>
            <span class="kpi-value" [class]="'kpi-value ' + (kpi.valueClass ?? '')">
              {{ kpi.value }}
              @if (kpi.suffix) {
                <span class="kpi-suffix">{{ kpi.suffix }}</span>
              }
            </span>
            <span class="kpi-trend" [class]="'kpi-trend ' + kpi.trendClass">{{ kpi.trend }}</span>
          </div>
        }
      </div>

      <!-- صف: المخطط + الموافقات -->
      <div class="row-chart-approvals">
        <div class="panel chart-panel">
          <div class="panel-head">
            <span class="panel-title">الإيرادات مقابل المصروفات</span>
            <span class="panel-sub">العام الدراسي ١٤٤٧هـ</span>
            <div class="spacer"></div>
            <span class="legend"><span class="swatch primary"></span>الإيرادات</span>
            <span class="legend"><span class="swatch light"></span>المصروفات</span>
          </div>
          <div class="chart">
            @for (m of chartMonths; track m.label) {
              <div class="chart-col">
                <div class="bars">
                  <div
                    class="bar revenue"
                    [style.height.%]="m.revenue"
                    [style.opacity]="m.projected ? 0.55 : null"
                  ></div>
                  <div
                    class="bar expense"
                    [style.height.%]="m.expense"
                    [style.opacity]="m.projected ? 0.55 : null"
                  ></div>
                </div>
                <span class="chart-label" [class.projected]="m.projected">{{ m.label }}</span>
              </div>
            }
          </div>
        </div>

        <div class="panel approvals-panel">
          <div class="panel-head inset">
            <span class="panel-title">موافقات بانتظارك</span>
            <span class="nb-count-danger">18</span>
            <div class="spacer"></div>
            <span class="link">عرض الكل</span>
          </div>
          <div class="approval-list">
            @for (row of approvals; track row.title) {
              <div class="approval-row">
                <div class="approval-text">
                  <span class="approval-title">{{ row.title }}</span>
                  <span class="approval-meta">{{ row.meta }}</span>
                </div>
                @if (row.badge) {
                  <span
                    [class]="row.badge.kind === 'danger' ? 'nb-badge-danger' : 'nb-badge-warning'"
                    >{{ row.badge.label }}</span
                  >
                }
                @if (row.primaryAction === 'approve') {
                  <button class="row-btn primary">اعتماد</button>
                  <button class="row-btn">رفض</button>
                } @else {
                  <button class="row-btn outline">فتح الطلب</button>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- صف: القبول + مكتب المساعدة -->
      <div class="row-admissions-helpdesk">
        <div class="panel funnel-panel">
          <div class="panel-head">
            <span class="panel-title">مسار القبول والتسجيل</span>
            <span class="panel-sub">العام القادم ١٤٤٨هـ</span>
            <div class="spacer"></div>
            <span class="link">فتح الوحدة</span>
          </div>
          <div class="funnel">
            @for (stage of funnel; track stage.label) {
              <div class="funnel-row">
                <span class="funnel-label">{{ stage.label }}</span>
                <div class="funnel-track">
                  <div
                    class="funnel-fill"
                    [class]="'funnel-fill ' + stage.color"
                    [style.width.%]="stage.width"
                  ></div>
                </div>
                <span class="funnel-value" [class.success]="stage.success">{{ stage.value }}</span>
              </div>
            }
          </div>
        </div>

        <div class="panel helpdesk-panel">
          <div class="panel-head inset">
            <span class="panel-title">مكتب المساعدة</span>
            <span class="panel-sub">التزام SLA ‏92%</span>
            <div class="spacer"></div>
            <span class="link">24 تذكرة مفتوحة</span>
          </div>
          @for (t of tickets; track t.title) {
            <div class="ticket-row">
              <span class="nb-dot" [class]="'nb-dot ' + t.dot"></span>
              <span class="ticket-title">{{ t.title }}</span>
              <span class="ticket-age">{{ t.age }}</span>
              <span
                [class]="
                  t.badge.kind === 'danger'
                    ? 'nb-badge-danger'
                    : t.badge.kind === 'warning'
                      ? 'nb-badge-warning'
                      : 'nb-badge-success'
                "
                >{{ t.badge.label }}</span
              >
            </div>
          }
        </div>
      </div>
    </div>

    <!-- لوحة مساعد نبراس (الحافة اليسرى في RTL) -->
    <aside class="ai-panel">
      <div class="ai-head">
        <span class="ai-mark">✦</span>
        <span class="ai-title">مساعد نبراس</span>
        <div class="spacer"></div>
        <span class="ai-live">مباشر</span>
      </div>
      <div class="ai-body">
        @for (card of aiInsights; track card.label) {
          <div class="ai-card" [class.warning]="card.kind === 'warning'">
            <span class="ai-card-label" [class]="'ai-card-label ' + card.labelClass">{{
              card.label
            }}</span>
            <span class="ai-card-text" [innerHTML]="card.html"></span>
            @if (card.link) {
              <span class="ai-card-link">{{ card.link }}</span>
            }
          </div>
        }
      </div>
      <div class="ai-foot">
        <input type="text" placeholder="اسأل عن أي بيانات في مؤسستك…" />
      </div>
    </aside>
  `,
  styles: [
    `
      :host {
        flex: 1;
        display: flex;
        min-width: 0;
        min-height: 0;
      }

      .spacer { flex: 1; }

      /* ---------- عمود المحتوى ---------- */
      .content {
        flex: 1;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
        overflow-y: auto;
      }

      .greeting-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .greeting {
        font-size: 18px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .greeting-date {
        font-size: 12px;
        color: var(--nb-text-muted);
      }

      .toolbar-btn {
        height: 30px;
        padding: 0 12px;
        border: 1px solid var(--nb-border);
        background: var(--nb-surface);
        border-radius: var(--nb-radius);
        display: flex;
        align-items: center;
        font-family: var(--nb-font-family);
        font-size: 12px;
        font-weight: 500;
        color: var(--nb-text-secondary);
        cursor: pointer;

        &:focus-visible {
          outline: none;
          box-shadow: var(--nb-focus-ring);
        }
      }

      /* ---------- المؤشرات ---------- */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px;
      }

      .kpi-card {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .kpi-label {
        font-size: 12px;
        color: var(--nb-text-muted);
      }

      .kpi-value {
        font-size: 20px;
        font-weight: 700;
        color: var(--nb-text);

        &.warning { color: var(--nb-warning); }
        &.danger { color: var(--nb-danger); }
      }

      .kpi-suffix {
        font-size: 12px;
        font-weight: 500;
        color: var(--nb-text-muted);
      }

      .kpi-trend {
        font-size: 11px;
        font-weight: 600;

        &.up { color: var(--nb-success); }
        &.down { color: var(--nb-success); }
        &.info { color: var(--nb-info); }
        &.danger { color: var(--nb-danger); }
      }

      /* ---------- الألواح المشتركة ---------- */
      .panel {
        background: var(--nb-surface);
        border: 1px solid var(--nb-border);
        border-radius: var(--nb-radius-card);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .panel-head {
        display: flex;
        align-items: center;
        gap: 12px;

        &.inset {
          gap: 8px;
          padding: 14px 16px 10px;
        }
      }

      .panel-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .panel-sub {
        font-size: 12px;
        color: var(--nb-text-muted);
      }

      .link {
        font-size: 12px;
        color: var(--nb-primary-600);
        font-weight: 600;
        cursor: pointer;
      }

      /* ---------- المخطط ---------- */
      .row-chart-approvals {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 16px;
        min-height: 0;
      }

      .chart-panel {
        padding: 16px;
        gap: 12px;
      }

      .legend {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        color: var(--nb-text-secondary);
      }

      .swatch {
        width: 8px;
        height: 8px;
        border-radius: var(--nb-radius-bar);

        &.primary { background: var(--nb-primary-600); }
        &.light { background: var(--nb-primary-200); }
      }

      .chart {
        flex: 1;
        display: flex;
        align-items: flex-end;
        gap: 14px;
        height: 180px;
        padding-top: 8px;
      }

      .chart-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: center;
      }

      .bars {
        display: flex;
        gap: 3px;
        align-items: flex-end;
        height: 150px;
      }

      .bar {
        width: 14px;
        border-radius: var(--nb-radius-bar) var(--nb-radius-bar) 0 0;
        align-self: flex-end;

        &.revenue { background: var(--nb-primary-600); }
        &.expense { background: var(--nb-primary-200); }
      }

      .chart-label {
        font-size: 11px;
        color: var(--nb-text-muted);

        &.projected { color: var(--nb-text-faint); }
      }

      /* ---------- الموافقات ---------- */
      .approval-list {
        display: flex;
        flex-direction: column;
      }

      .approval-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        border-top: 1px solid var(--nb-border-soft);

        &:hover { background: var(--nb-surface-raised); }
      }

      .approval-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .approval-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--nb-text);
      }

      .approval-meta {
        font-size: 11px;
        color: var(--nb-text-muted);
      }

      /* في صفوف القوائم تستخدم الشارات حشوًا أصغر (2px 8px) كما في التصدير */
      .approval-row,
      .ticket-row {
        [class^='nb-badge-'] { padding: 2px 8px; }
      }

      .row-btn {
        height: 26px;
        padding: 0 10px;
        border: 1px solid var(--nb-border);
        background: var(--nb-surface);
        color: var(--nb-text-secondary);
        border-radius: var(--nb-radius);
        display: inline-flex;
        align-items: center;
        font-family: var(--nb-font-family);
        font-size: 12px;
        cursor: pointer;

        &.primary {
          padding: 0 12px;
          background: var(--nb-primary-600);
          border-color: var(--nb-primary-600);
          color: var(--nb-on-primary);
          font-weight: 600;
        }

        &.outline {
          padding: 0 12px;
          border-color: var(--nb-primary-600);
          color: var(--nb-primary-600);
          font-weight: 600;
        }

        &:focus-visible {
          outline: none;
          box-shadow: var(--nb-focus-ring);
        }
      }

      /* ---------- مسار القبول ---------- */
      .row-admissions-helpdesk {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 16px;
      }

      .funnel-panel {
        padding: 16px;
        gap: 12px;
      }

      .funnel {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .funnel-row {
        display: grid;
        grid-template-columns: 110px 1fr 44px;
        align-items: center;
        gap: 10px;
      }

      .funnel-label {
        font-size: 12px;
        color: var(--nb-text-secondary);
      }

      .funnel-track {
        height: 18px;
        background: var(--nb-primary-50);
        border-radius: var(--nb-radius-sm);
        overflow: hidden;
      }

      .funnel-fill {
        height: 100%;

        &.p600 { background: var(--nb-primary-600); }
        &.p500 { background: var(--nb-primary-500); }
        &.p400 { background: var(--nb-primary-400); }
        &.p300 { background: var(--nb-primary-300); }
        &.success { background: var(--nb-success); }
      }

      .funnel-value {
        font-size: 12px;
        font-weight: 700;
        color: var(--nb-text);

        &.success { color: var(--nb-success); }
      }

      /* ---------- مكتب المساعدة ---------- */
      .ticket-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 9px 16px;
        border-top: 1px solid var(--nb-border-soft);
      }

      .ticket-title {
        flex: 1;
        font-size: 13px;
        color: var(--nb-text);
      }

      .ticket-age {
        font-size: 11px;
        color: var(--nb-text-muted);
      }

      /* ---------- لوحة مساعد نبراس ---------- */
      .ai-panel {
        width: var(--nb-ai-panel-width);
        flex-shrink: 0;
        background: var(--nb-surface);
        border-right: 1px solid var(--nb-border);
        display: flex;
        flex-direction: column;
      }

      .ai-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--nb-border-soft);
      }

      .ai-mark {
        width: 22px;
        height: 22px;
        background: var(--nb-primary-600);
        border-radius: var(--nb-radius);
        color: var(--nb-on-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .ai-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--nb-text);
      }

      .ai-live {
        font-size: 11px;
        color: var(--nb-text-muted);
      }

      .ai-body {
        flex: 1;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
      }

      .ai-card {
        border: 1px solid var(--nb-border);
        background: var(--nb-surface-raised);
        border-radius: var(--nb-radius-card);
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;

        &.warning {
          border-color: var(--nb-warning-border);
          background: var(--nb-warning-surface);
        }
      }

      .ai-card-label {
        font-size: 11px;
        font-weight: 700;

        &.warning { color: var(--nb-warning); }
        &.primary { color: var(--nb-primary-600); }
      }

      .ai-card-text {
        font-size: 12px;
        color: var(--nb-text);
        line-height: 1.6;
      }

      .ai-card-link {
        font-size: 12px;
        color: var(--nb-primary-600);
        font-weight: 600;
        cursor: pointer;
      }

      .ai-foot {
        padding: 12px;
        border-top: 1px solid var(--nb-border-soft);

        input {
          width: 100%;
          height: 34px;
          border: 1px solid var(--nb-border);
          border-radius: var(--nb-radius-card);
          padding: 0 12px;
          font-family: var(--nb-font-family);
          font-size: 12px;
          color: var(--nb-text);
          background: var(--nb-bg);
          outline: none;

          &::placeholder { color: var(--nb-text-faint); }

          &:focus-visible { box-shadow: var(--nb-focus-ring); }
        }
      }
    `,
  ],
})
export class DashboardComponent {
  /* بيانات الشاشة كما في تصدير 1a حرفيًا */

  readonly kpis: Kpi[] = [
    { label: 'إجمالي الطلاب', value: '12,840', trend: '▲ 3.2% عن العام السابق', trendClass: 'up' },
    { label: 'الحضور اليوم', value: '94.6%', trend: '▲ ضمن المستهدف 93%', trendClass: 'up' },
    { label: 'الإيرادات المحصلة', value: '8.24م', suffix: 'ر.س', trend: '▲ 6.1% هذا الشهر', trendClass: 'up' },
    { label: 'مستحقات متأخرة', value: '1.36م', suffix: 'ر.س', valueClass: 'warning', trend: '▼ 4.0% تحسّن التحصيل', trendClass: 'down' },
    { label: 'طلبات القبول', value: '342', trend: '96 مسجّل حتى الآن', trendClass: 'info' },
    { label: 'موافقات معلقة', value: '18', valueClass: 'danger', trend: '4 عاجلة تتجاوز SLA', trendClass: 'danger' },
  ];

  readonly chartMonths: ChartMonth[] = [
    { label: 'سبتمبر', revenue: 62, expense: 48 },
    { label: 'أكتوبر', revenue: 70, expense: 52 },
    { label: 'نوفمبر', revenue: 55, expense: 50 },
    { label: 'ديسمبر', revenue: 78, expense: 55 },
    { label: 'يناير', revenue: 60, expense: 49 },
    { label: 'فبراير', revenue: 84, expense: 58 },
    { label: 'مارس', revenue: 66, expense: 54 },
    { label: 'أبريل', revenue: 72, expense: 51 },
    { label: 'مايو', revenue: 88, expense: 60 },
    { label: 'يونيو*', revenue: 58, expense: 42, projected: true },
  ];

  readonly approvals: ApprovalRow[] = [
    {
      title: 'أمر شراء PO-4821 · أجهزة مختبر الثانوية',
      meta: 'المشتريات · م. خالد العتيبي · 186,500 ر.س',
      badge: { label: 'عاجل', kind: 'danger' },
      primaryAction: 'approve',
    },
    {
      title: 'إجازة اضطرارية · أ. نورة الشمري',
      meta: 'الموارد البشرية · 3 أيام · بديل مؤكد',
      primaryAction: 'approve',
    },
    {
      title: 'تعديل ميزانية · النقل المدرسي',
      meta: 'المالية · +120,000 ر.س · يتطلب مبررات',
      badge: { label: 'مراجعة', kind: 'warning' },
      primaryAction: 'open',
    },
    {
      title: 'صرف مستحقات · شركة المدار للتقنية',
      meta: 'المالية · 98,750 ر.س · فاتورة INV-2210',
      primaryAction: 'approve',
    },
  ];

  readonly funnel: FunnelStage[] = [
    { label: 'طلبات جديدة', width: 100, value: '342', color: 'p600' },
    { label: 'اكتمال الملف', width: 78, value: '268', color: 'p500' },
    { label: 'المقابلات', width: 55, value: '190', color: 'p400' },
    { label: 'عروض القبول', width: 41, value: '141', color: 'p300' },
    { label: 'تم التسجيل', width: 28, value: '96', color: 'success', success: true },
  ];

  readonly tickets: TicketRow[] = [
    { dot: 'danger', title: 'انقطاع الشبكة · مبنى الابتدائية', age: 'منذ 25 د', badge: { label: 'حرجة', kind: 'danger' } },
    { dot: 'warning', title: 'تعطل جهاز عرض · قاعة 204', age: 'منذ ساعتين', badge: { label: 'متوسطة', kind: 'warning' } },
    { dot: 'warning', title: 'مشكلة بوابة أولياء الأمور', age: 'منذ 3 س', badge: { label: 'متوسطة', kind: 'warning' } },
    { dot: 'success', title: 'طلب صلاحية نظام الرواتب', age: 'منذ 5 س', badge: { label: 'منخفضة', kind: 'success' } },
  ];

  readonly aiInsights: AiInsight[] = [
    {
      kind: 'warning',
      label: 'تنبيه مالي',
      labelClass: 'warning',
      html: 'مصروفات النقل المدرسي تجاوزت الميزانية بنسبة 8% هذا الفصل، مرتبطة بعقد الصيانة الجديد.',
      link: 'عرض التحليل ←',
    },
    {
      kind: 'default',
      label: 'توقع',
      labelClass: 'primary',
      html: 'نسبة تحصيل الرسوم المتوقعة بنهاية الشهر: <b>96%</b> — أعلى من متوسط الأعوام الثلاثة الماضية.',
    },
    {
      kind: 'default',
      label: 'موارد بشرية',
      labelClass: 'primary',
      html: '3 معلمين في قسم الرياضيات نصابهم أعلى من المتوسط بـ 30%. اقتراح: إعادة توزيع الجداول.',
      link: 'تطبيق الاقتراح ←',
    },
  ];
}
