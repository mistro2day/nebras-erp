import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportingService } from './reporting.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';

type TabKey = 'reports' | 'dashboards' | 'sources';

/**
 * منصة ذكاء الأعمال والتقارير والتحليلات — لغة تصميم نبراس.
 *
 * التوقيع البصري: «شريط نبراس الذكي» (NLQ) في صدر الصفحة، يليه صفّ مؤشرات
 * بأعمدة تقدّم نحو المستهدف — تُقرأ الفجوة بين المحقّق والمستهدف بصرياً
 * قبل قراءة الرقم. لا اعتماد على Angular Material (تفادياً لأخطاء البناء).
 */
@Component({
  selector: 'app-reporting-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة ذكاء الأعمال والتقارير والتحليلات"
        subtitle="توليد تقارير الموديولات، تتبّع مؤشرات الأداء، والتحليل الذكي باللغة الطبيعية.">
        <button class="btn ghost" (click)="loadData()">تحديث</button>
      </nb-page-header>

      <!-- التوقيع البصري: شريط نبراس الذكي (NLQ) -->
      <section class="ai-bar" [class.busy]="aiLoading()">
        <span class="ai-mark" aria-hidden="true">✦</span>
        <input
          class="ai-input"
          type="text"
          name="nlq"
          [(ngModel)]="aiQuestion"
          [disabled]="aiLoading()"
          aria-label="اسأل نبراس عن التقارير والمؤشرات"
          placeholder="اسأل نبراس… مثال: ما نسبة حضور الطلاب هذا الشهر؟"
          (keyup.enter)="askAI()" />
        <button class="btn primary" [disabled]="aiLoading() || !aiQuestion.trim()" (click)="askAI()">
          {{ aiLoading() ? 'جارٍ التحليل…' : 'اسأل نبراس' }}
        </button>
      </section>

      @if (aiSuggestions().length && !aiResponse()) {
        <div class="ai-chips">
          <span class="chips-label">جرّب:</span>
          @for (s of aiSuggestions(); track s) {
            <button class="chip" (click)="askSuggestion(s)">{{ s }}</button>
          }
        </div>
      }

      @if (aiResponse(); as ans) {
        <section class="ai-answer" [class.unanswered]="!ans.answered">
          <div class="aa-head">
            <strong>{{ ans.answered ? 'إجابة نبراس' : 'تعذّرت الإجابة' }}</strong>
            <button class="link-btn" (click)="clearAI()">إغلاق</button>
          </div>

          @if (ans.answered) {
            <div class="aa-value">
              <span class="aa-num">{{ ans.value | number: '1.0-2' }}</span>
              <span class="aa-unit">{{ ans.unit }}</span>
            </div>
            <p class="aa-metric">{{ ans.metric_title }}</p>

            @if (ans.facts?.length) {
              <ul class="aa-facts">
                @for (f of ans.facts; track f.label) {
                  <li><span>{{ f.label }}</span><b>{{ f.value }}</b></li>
                }
              </ul>
            }

            <p class="aa-source">
              الأرقام محسوبة مباشرة من قاعدة بيانات مؤسستك، لا من النموذج اللغوي.
            </p>
          } @else {
            <p class="aa-summary">{{ ans.answer }}</p>
            @if (ans.available?.length) {
              <div class="aa-avail">
                <span class="aa-avail-label">المقاييس المتاحة حالياً:</span>
                @for (m of ans.available; track m.key) {
                  <span class="chip static">{{ m.title }}</span>
                }
              </div>
            }
          }
        </section>
      }

      <!-- مؤشرات الأداء مع تقدّم نحو المستهدف -->
      <section class="kpis">
        @for (k of kpis(); track k.id || k.name) {
          <article class="kpi">
            <header class="kpi-head">
              <span class="kpi-label">{{ k.name }}</span>
              <span class="trend" [attr.data-t]="k.trend || 'stable'">
                {{ trendGlyph(k.trend) }} {{ trendText(k.trend) }}
              </span>
            </header>
            <span class="kpi-value">{{ k.current_value | number: '1.0-1' }}<em>%</em></span>
            <div class="meter" role="img"
                 [attr.aria-label]="'المحقق ' + k.current_value + ' من مستهدف ' + k.target_value">
              <span class="meter-fill" [style.width.%]="pct(k)"></span>
              <span class="meter-target" [style.inset-inline-start.%]="targetPct(k)"></span>
            </div>
            <span class="kpi-foot">المستهدف {{ k.target_value | number: '1.0-1' }}%</span>
          </article>
        }
        @if (kpis().length === 0) {
          <div class="kpi placeholder">لا توجد مؤشرات أداء معرّفة بعد.</div>
        }
      </section>

      <!-- تبويبات محلية (بدون Material) -->
      <section class="card">
        <nav class="tabs" role="tablist">
          @for (t of tabs; track t.key) {
            <button class="tab" role="tab" [class.on]="tab() === t.key"
                    [attr.aria-selected]="tab() === t.key" (click)="tab.set(t.key)">
              {{ t.label }}
              <span class="tab-count">{{ tabCount(t.key) }}</span>
            </button>
          }
        </nav>

        @if (tab() === 'reports') {
          <div class="list">
            <div class="row head">
              <span>رمز التقرير</span><span>اسم التقرير</span><span>التصنيف</span><span class="ta-end">إجراءات</span>
            </div>
            @for (r of reports(); track r.id) {
              <div class="row">
                <span class="mono">{{ r.code || '—' }}</span>
                <span class="strong">{{ r.name }}</span>
                <span class="muted">{{ r.category_name || 'غير مصنّف' }}</span>
                <span class="ta-end acts">
                  <button class="btn sm primary" [disabled]="running() === r.id" (click)="runReport(r.id)">
                    {{ running() === r.id ? 'جارٍ…' : 'تشغيل' }}
                  </button>
                  <button class="btn sm ghost" (click)="exportReport(r.id)">تصدير CSV</button>
                </span>
              </div>
            }
            @if (reports().length === 0) {
              <div class="empty">لا توجد تقارير معرّفة في النظام بعد.</div>
            }
          </div>
        }

        @if (tab() === 'dashboards') {
          <div class="tiles">
            @for (d of dashboards(); track d.id) {
              <article class="tile">
                <span class="tile-ic" aria-hidden="true">▦</span>
                <strong>{{ d.name }}</strong>
                <p>{{ d.description || 'لوحة تفاعلية للمستويات التنفيذية والأقسام.' }}</p>
                <span class="tile-meta">{{ d.widget_count || 0 }} عنصر عرض</span>
              </article>
            }
            @if (dashboards().length === 0) {
              <div class="empty">لا توجد لوحات قيادة منشورة بعد.</div>
            }
          </div>
        }

        @if (tab() === 'sources') {
          <div class="list">
            <div class="row head src">
              <span>المصدر</span><span>النوع</span><span>الموديول</span>
            </div>
            @for (s of sources(); track s.id) {
              <div class="row src">
                <span class="strong">{{ s.name }}</span>
                <span class="mono">{{ s.source_type || 'model' }}</span>
                <span class="muted">{{ s.module || '—' }}</span>
              </div>
            }
            @if (sources().length === 0) {
              <div class="empty">لا توجد مصادر بيانات مسجّلة.</div>
            }
          </div>
        }
      </section>

      <!-- عارض نتائج التقرير -->
      @if (executedData().length > 0) {
        <section class="card">
          <div class="card-head">
            <h3>نتائج التقرير — {{ executedData().length }} سجل</h3>
            <button class="link-btn" (click)="executedData.set([])">إخفاء</button>
          </div>
          <div class="scroll-x">
            <table class="data">
              <thead>
                <tr>@for (c of dataColumns(); track c) { <th>{{ c }}</th> }</tr>
              </thead>
              <tbody>
                @for (row of executedData(); track $index) {
                  <tr>@for (c of dataColumns(); track c) { <td>{{ row[c] }}</td> }</tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; min-width: 0;
      background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; transition: filter .15s ease, background .15s ease; }
    .btn.sm { height: 28px; padding: 0 10px; font-size: 12px; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.ghost:hover { border-color: var(--nb-primary-400); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover:not(:disabled) { filter: brightness(1.08); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .link-btn { background: none; border: none; font-family: inherit; font-size: 12px; font-weight: 600;
      color: var(--nb-primary-600); cursor: pointer; padding: 0; }

    /* شريط نبراس الذكي — التوقيع البصري */
    .ai-bar { display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 8px;
      background: linear-gradient(180deg, var(--nb-primary-50) 0%, var(--nb-surface) 140%);
      border: 1px solid var(--nb-primary-200); border-radius: var(--nb-radius-card); margin-bottom: 10px;
      transition: border-color .2s ease, box-shadow .2s ease; }
    .ai-bar:focus-within { border-color: var(--nb-primary-400); box-shadow: 0 0 0 3px rgba(48,63,159,.10); }
    .ai-bar.busy { opacity: .85; }
    .ai-mark { width: 26px; height: 26px; flex-shrink: 0; border-radius: var(--nb-radius-compact);
      background: var(--nb-primary-600); color: var(--nb-on-primary, #fff);
      display: flex; align-items: center; justify-content: center; font-size: 13px; }
    .ai-bar.busy .ai-mark { animation: pulse 1.1s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: .45; } }
    @media (prefers-reduced-motion: reduce) { .ai-bar.busy .ai-mark { animation: none; } }
    .ai-input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; height: 26px;
      font-family: inherit; font-size: 13px; color: var(--nb-text); }
    .ai-input::placeholder { color: var(--nb-primary-400); }

    .ai-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 14px; }
    .chips-label { font-size: 11.5px; color: var(--nb-text-muted); font-weight: 600; }
    .chip { height: 26px; padding: 0 10px; font-family: inherit; font-size: 11.5px; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: 999px; color: var(--nb-text-secondary); }
    .chip:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-600); }

    .ai-answer { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-inline-start: 3px solid var(--nb-primary-500);
      border-radius: var(--nb-radius-card); padding: 14px 16px; margin-bottom: 16px; }
    .aa-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .aa-head strong { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .aa-summary { margin: 0 0 10px; font-size: 13px; line-height: 1.7; color: var(--nb-text-secondary); }
    .ai-answer.unanswered { border-inline-start-color: var(--nb-warning, #f59e0b); }
    .aa-value { display: flex; align-items: baseline; gap: 6px; }
    .aa-num { font-size: 30px; font-weight: 800; color: var(--nb-text); line-height: 1;
      font-variant-numeric: tabular-nums; }
    .aa-unit { font-size: 13px; font-weight: 600; color: var(--nb-text-muted); }
    .aa-metric { margin: 4px 0 10px; font-size: 12.5px; font-weight: 600; color: var(--nb-text-secondary); }
    .aa-facts { list-style: none; margin: 0 0 10px; padding: 0; display: flex;
      flex-direction: column; gap: 4px; }
    .aa-facts li { display: flex; justify-content: space-between; gap: 12px;
      font-size: 12.5px; padding: 5px 0; border-bottom: 1px solid var(--nb-border-row); }
    .aa-facts li:last-child { border-bottom: none; }
    .aa-facts span { color: var(--nb-text-muted); }
    .aa-facts b { color: var(--nb-text); font-weight: 700; font-variant-numeric: tabular-nums; }
    .aa-source { margin: 0; font-size: 11px; color: var(--nb-text-muted); }
    .aa-avail { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
    .aa-avail-label { font-size: 11.5px; font-weight: 600; color: var(--nb-text-muted); }
    .chip.static { cursor: default; }
    .chip.static:hover { border-color: var(--nb-border); color: var(--nb-text-secondary); }

    /* مؤشرات الأداء */
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .kpi { display: flex; flex-direction: column; gap: 6px; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px; }
    .kpi.placeholder { grid-column: 1 / -1; align-items: center; color: var(--nb-text-muted); font-size: 13px; padding: 24px; }
    .kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .kpi-label { font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }
    .trend { font-size: 11px; font-weight: 700; white-space: nowrap; }
    .trend[data-t='up'] { color: var(--nb-success); }
    .trend[data-t='down'] { color: var(--nb-danger); }
    .trend[data-t='stable'] { color: var(--nb-text-muted); }
    .kpi-value { font-size: 26px; font-weight: 800; color: var(--nb-text); line-height: 1;
      font-variant-numeric: tabular-nums; }
    .kpi-value em { font-size: 14px; font-weight: 600; font-style: normal; color: var(--nb-text-muted); }
    .meter { position: relative; height: 6px; border-radius: 999px; background: var(--nb-border-soft); overflow: hidden; }
    .meter-fill { position: absolute; inset-block: 0; inset-inline-start: 0;
      background: var(--nb-primary-500); border-radius: 999px; transition: width .35s ease; }
    .meter-target { position: absolute; inset-block: -2px; width: 2px; background: var(--nb-text); opacity: .55; }
    .kpi-foot { font-size: 11px; color: var(--nb-text-faint, var(--nb-text-muted)); }

    /* البطاقات والتبويبات */
    .card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 16px; }
    .card-head { display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid var(--nb-border-soft); }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-text); }

    .tabs { display: flex; gap: 2px; padding: 0 8px; border-bottom: 1px solid var(--nb-border-soft);
      background: var(--nb-surface-raised); overflow-x: auto; }
    .tab { position: relative; height: 40px; padding: 0 14px; background: none; border: none; cursor: pointer;
      font-family: inherit; font-size: 13px; font-weight: 600; color: var(--nb-text-muted); white-space: nowrap;
      display: inline-flex; align-items: center; gap: 6px; }
    .tab:hover { color: var(--nb-text); }
    .tab.on { color: var(--nb-primary-600); }
    .tab.on::after { content: ''; position: absolute; inset-inline: 8px; bottom: -1px; height: 2px;
      background: var(--nb-primary-600); border-radius: 2px 2px 0 0; }
    .tab-count { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 999px;
      background: var(--nb-border-soft); color: var(--nb-text-muted); }
    .tab.on .tab-count { background: var(--nb-primary-50); color: var(--nb-primary-600); }

    .list { display: flex; flex-direction: column; }
    .row { display: grid; grid-template-columns: 1fr 2.2fr 1.2fr 1.6fr; gap: 10px;
      align-items: center; padding: 10px 16px; font-size: 13px; border-bottom: 1px solid var(--nb-border-row); }
    .row.src { grid-template-columns: 2fr 1fr 1fr; }
    .row:last-child { border-bottom: none; }
    .row.head { background: var(--nb-surface-raised); font-size: 11px; font-weight: 700;
      color: var(--nb-text-muted); padding: 8px 16px; }
    .row:not(.head):hover { background: var(--nb-surface-raised); }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--nb-text-secondary); }
    .strong { font-weight: 600; color: var(--nb-text); }
    .muted { color: var(--nb-text-muted); font-size: 12px; }
    .ta-end { text-align: end; }
    .acts { display: flex; gap: 6px; justify-content: flex-end; }
    .empty { padding: 32px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }

    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; padding: 16px; }
    .tile { display: flex; flex-direction: column; gap: 6px; padding: 16px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      transition: border-color .15s ease, transform .15s ease; }
    .tile:hover { border-color: var(--nb-primary-400); transform: translateY(-2px); }
    .tile-ic { font-size: 20px; color: var(--nb-primary-600); }
    .tile strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tile p { margin: 0; font-size: 12px; line-height: 1.6; color: var(--nb-text-muted); }
    .tile-meta { font-size: 11px; font-weight: 600; color: var(--nb-primary-600); }

    .scroll-x { overflow-x: auto; }
    table.data { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    table.data th { position: sticky; top: 0; text-align: start; padding: 8px 12px; white-space: nowrap;
      background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted);
      border-bottom: 1px solid var(--nb-border-soft); }
    table.data td { padding: 8px 12px; white-space: nowrap; color: var(--nb-text);
      border-bottom: 1px solid var(--nb-border-row); font-variant-numeric: tabular-nums; }

    @media (max-width: 900px) {
      .page { padding: 14px; }
      .row, .row.src { grid-template-columns: 1fr 1fr; row-gap: 4px; }
      .ta-end, .acts { justify-content: flex-start; text-align: start; }
    }
  `]
})
export class ReportingDashboardComponent implements OnInit {
  private repService = inject(ReportingService);

  readonly tabs: { key: TabKey; label: string }[] = [
    { key: 'reports', label: 'التقارير المتوفرة' },
    { key: 'dashboards', label: 'لوحات القيادة' },
    { key: 'sources', label: 'مصادر البيانات' },
  ];

  readonly aiSuggestions = signal<string[]>([
    'ما نسبة حضور الطلاب هذا الشهر؟',
    'أعلى ٥ صفوف في التحصيل الدراسي',
    'إجمالي المتأخرات المالية حسب الصف',
  ]);

  tab = signal<TabKey>('reports');
  aiQuestion = '';
  aiLoading = signal(false);
  aiResponse = signal<any>(null);
  running = signal<string | null>(null);

  kpis = signal<any[]>([]);
  reports = signal<any[]>([]);
  dashboards = signal<any[]>([]);
  sources = signal<any[]>([]);
  executedData = signal<any[]>([]);
  dataColumns = signal<string[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.repService.getKPIs().subscribe({ next: (r) => r?.success && this.kpis.set(r.data ?? []) });
    this.repService.getReports().subscribe({ next: (r) => r?.success && this.reports.set(r.data ?? []) });
    this.repService.getDashboards().subscribe({ next: (r) => r?.success && this.dashboards.set(r.data ?? []) });
    this.repService.getDataSources().subscribe({ next: (r) => r?.success && this.sources.set(r.data ?? []) });
  }

  tabCount(key: TabKey): number {
    return key === 'reports' ? this.reports().length
      : key === 'dashboards' ? this.dashboards().length
      : this.sources().length;
  }

  /** نسبة تعبئة العمود — تُقاس على مقياس موحّد يستوعب تجاوز المستهدف. */
  pct(k: any): number {
    const scale = Math.max(Number(k?.target_value) || 100, Number(k?.current_value) || 0);
    return scale ? Math.min(100, ((Number(k?.current_value) || 0) / scale) * 100) : 0;
  }

  targetPct(k: any): number {
    const scale = Math.max(Number(k?.target_value) || 100, Number(k?.current_value) || 0);
    return scale ? Math.min(100, ((Number(k?.target_value) || 0) / scale) * 100) : 0;
  }

  trendGlyph(t?: string): string {
    return t === 'up' ? '▲' : t === 'down' ? '▼' : '▬';
  }

  trendText(t?: string): string {
    return t === 'up' ? 'صاعد' : t === 'down' ? 'هابط' : 'مستقر';
  }

  askSuggestion(q: string): void {
    this.aiQuestion = q;
    this.askAI();
  }

  askAI(): void {
    const q = this.aiQuestion.trim();
    if (!q || this.aiLoading()) return;
    this.aiLoading.set(true);
    this.repService.askAI(q).subscribe({
      next: (res) => {
        this.aiResponse.set(
          res?.success && res.data
            ? res.data
            : { answered: false, answer: res?.message || 'تعذّر تفسير السؤال. حاول صياغته بشكل أوضح.' },
        );
        this.aiLoading.set(false);
      },
      error: (err) => {
        // 503 يعني أن المزوّد غير مهيّأ — نعرض رسالة الخادم كما هي لأنها تشخيصية.
        this.aiResponse.set({
          answered: false,
          answer: err?.error?.message || 'تعذّر الوصول إلى خدمة التحليل الذكي حالياً.',
        });
        this.aiLoading.set(false);
      },
    });
  }

  clearAI(): void {
    this.aiResponse.set(null);
    this.aiQuestion = '';
  }

  runReport(id: string): void {
    this.running.set(id);
    this.repService.executeReport(id, {}).subscribe({
      next: (res) => {
        const list = res?.data?.data ?? [];
        this.executedData.set(list);
        this.dataColumns.set(list.length ? Object.keys(list[0]) : []);
        this.running.set(null);
      },
      error: () => this.running.set(null),
    });
  }

  exportReport(id: string): void {
    this.repService.exportReportCsv(id, {}).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
    });
  }
}
