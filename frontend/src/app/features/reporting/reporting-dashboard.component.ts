import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportingService } from './reporting.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { TenantService } from '../../core/services/tenant.service';

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
          <div class="rep-workspace">
            <!-- القائمة الجانبية: فئات وتقارير -->
            <aside class="rep-sidebar">
              <div class="rep-search">
                <span class="rs-ic">🔍</span>
                <input type="search" [ngModel]="reportSearch()" (ngModelChange)="reportSearch.set($event)"
                       placeholder="ابحث في التقارير…" aria-label="بحث التقارير" />
              </div>
              <div class="rep-groups">
                @for (g of groupedReports(); track g.category) {
                  <div class="rep-group">
                    <div class="rg-head">
                      <span class="rg-ic">{{ catIcon(g.category) }}</span>
                      <span class="rg-name">{{ g.category }}</span>
                      <span class="rg-count">{{ g.reports.length }}</span>
                    </div>
                    @for (r of g.reports; track r.id) {
                      <button class="rep-item" [class.active]="currentReport()?.id === r.id"
                              (click)="runReport(r.id)">
                        <span class="ri-name">{{ r.name }}</span>
                        @if (running() === r.id) { <span class="ri-spin">⏳</span> }
                      </button>
                    }
                  </div>
                }
                @if (groupedReports().length === 0) {
                  <div class="empty">لا نتائج تطابق البحث.</div>
                }
              </div>
            </aside>

            <!-- المعاينة -->
            <main class="rep-main">
              @if (!currentReport()) {
                <div class="rep-placeholder">
                  <span class="rp-ic">📊</span>
                  <h3>اختر تقريراً لعرضه</h3>
                  <p>اختر تقريراً من القائمة على اليمين لتشغيله ومعاينته هنا، ثم صدّره PDF أو Excel أو اطبعه.</p>
                </div>
              } @else {
                <div class="viewer-toolbar no-print">
                  <span class="vt-title">{{ currentReport().name }}</span>
                  <div class="vt-actions">
                    <button class="btn ghost sm" (click)="printReport()">🖨️ طباعة</button>
                    <button class="btn ghost sm" [disabled]="exporting()" (click)="exportPdf(currentReport().id)">
                      {{ exporting() === 'pdf' ? '⏳' : '📄' }} PDF
                    </button>
                    <button class="btn ghost sm" [disabled]="exporting()" (click)="exportExcel(currentReport().id)">
                      {{ exporting() === 'excel' ? '⏳' : '📊' }} Excel
                    </button>
                    <button class="btn ghost sm" [disabled]="exporting()" (click)="exportReport(currentReport().id)">
                      {{ exporting() === 'csv' ? '⏳' : '⬇️' }} CSV
                    </button>
                  </div>
                </div>
                <div class="report-sheet" id="report-sheet">
                  <header class="rs-head">
                    <div class="rs-brand">
                      <span class="rs-mark">🏫</span>
                      <div class="rs-org-block">
                        <span class="rs-org">{{ schoolName() }}</span>
                        <span class="rs-org-sub">إدارة التعليم — نظام نبراس</span>
                      </div>
                    </div>
                    <h2 class="rs-title">{{ currentReport().name }}</h2>
                    @if (currentReport().description) {
                      <p class="rs-desc">{{ currentReport().description }}</p>
                    }
                    <div class="rs-meta">
                      <span>تاريخ التوليد: {{ executedAt() }}</span>
                      <span>إجمالي السجلات: {{ executedData().length }}</span>
                    </div>
                  </header>

                  @if (executedData().length === 0) {
                    <div class="empty">لا توجد بيانات لعرضها في هذا التقرير.</div>
                  } @else {
                    <div class="scroll-x">
                      <table class="data report-table">
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
                  }
                  <footer class="rs-foot">
                    <span>{{ schoolName() }} · Nebras ERP — نظام إدارة المؤسسات التعليمية</span>
                  </footer>
                </div>
              }
            </main>
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

    /* ==== مساحة عمل التقارير: قائمة جانبية + معاينة ==== */
    .rep-workspace { display: grid; grid-template-columns: 300px 1fr; min-height: 520px; }
    .rep-sidebar { border-inline-start: 1px solid var(--nb-border); background: var(--nb-bg);
      display: flex; flex-direction: column; max-height: 640px; }
    .rep-search { position: relative; padding: 12px; border-bottom: 1px solid var(--nb-border); }
    .rep-search .rs-ic { position: absolute; inset-inline-start: 22px; top: 50%; transform: translateY(-50%);
      font-size: 12px; opacity: .5; pointer-events: none; }
    .rep-search input { width: 100%; height: 36px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius);
      background: var(--nb-surface); color: var(--nb-text); font-family: inherit; font-size: 13px; padding: 0 34px; outline: none; }
    .rep-search input:focus { border-color: var(--nb-primary-500); }
    .rep-groups { overflow-y: auto; padding: 8px; flex: 1; }
    .rep-group { margin-bottom: 6px; }
    .rg-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; }
    .rg-ic { font-size: 15px; }
    .rg-name { font-size: 12.5px; font-weight: 700; color: var(--nb-text-muted); flex: 1; }
    .rg-count { font-size: 11px; font-weight: 700; color: var(--nb-text-faint);
      background: var(--nb-surface-raised); border-radius: 99px; padding: 1px 8px; }
    .rep-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: start;
      border: none; background: transparent; cursor: pointer; padding: 8px 12px 8px 24px; border-radius: var(--nb-radius);
      font-family: inherit; font-size: 13px; color: var(--nb-text); transition: background .12s; }
    .rep-item:hover { background: var(--nb-surface-raised); }
    .rep-item.active { background: color-mix(in srgb, var(--nb-primary-600) 12%, transparent);
      color: var(--nb-primary-700); font-weight: 700; }
    .ri-name { flex: 1; }

    .rep-main { padding: 0; min-width: 0; display: flex; flex-direction: column; }
    .rep-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 60px 24px; color: var(--nb-text-muted); }
    .rp-ic { font-size: 46px; opacity: .35; margin-bottom: 12px; }
    .rep-placeholder h3 { margin: 0 0 8px; font-size: 16px; color: var(--nb-text); }
    .rep-placeholder p { margin: 0; font-size: 13px; max-width: 380px; line-height: 1.7; }
    .rs-org-block { display: flex; flex-direction: column; gap: 1px; }
    .rs-org-sub { font-size: 11px; color: var(--nb-text-faint); }

    @media (max-width: 820px) {
      .rep-workspace { grid-template-columns: 1fr; }
      .rep-sidebar { max-height: 280px; border-inline-start: none; border-bottom: 1px solid var(--nb-border); }
    }

    /* ==== عارض التقرير والورقة ==== */
    .viewer { padding: 0; overflow: hidden; }
    .viewer-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 16px; background: var(--nb-surface-raised); border-bottom: 1px solid var(--nb-border); flex-wrap: wrap; }
    .vt-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .vt-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    .report-sheet { padding: 28px 30px; background: var(--nb-surface); }
    .rs-head { border-bottom: 2px solid var(--nb-primary-600); padding-bottom: 16px; margin-bottom: 18px; }
    .rs-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .rs-mark { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--nb-primary-600) 12%, transparent); font-size: 17px; }
    .rs-org { font-size: 13px; font-weight: 700; color: var(--nb-text-muted); }
    .rs-title { margin: 0; font-size: 22px; font-weight: 800; color: var(--nb-primary-700); }
    .rs-desc { margin: 6px 0 0; font-size: 13px; color: var(--nb-text-muted); line-height: 1.6; }
    .rs-meta { display: flex; gap: 20px; margin-top: 12px; font-size: 12.5px; color: var(--nb-text-muted); font-weight: 600; flex-wrap: wrap; }
    .rs-meta span { font-variant-numeric: tabular-nums; }

    /* جدول التقرير المصمّم */
    table.report-table { border: 1px solid var(--nb-border); border-radius: var(--nb-radius); overflow: hidden; }
    table.report-table th { position: static; background: var(--nb-primary-600); color: #fff; text-align: center;
      font-size: 12px; font-weight: 700; padding: 11px 12px; border-bottom: none; white-space: nowrap; }
    table.report-table td { text-align: center; padding: 10px 12px; border-bottom: 1px solid var(--nb-border-soft); }
    table.report-table tbody tr:nth-child(even) { background: color-mix(in srgb, var(--nb-primary-600) 4%, transparent); }
    table.report-table tbody tr:last-child td { border-bottom: none; }

    .rs-foot { margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--nb-border-soft);
      text-align: center; font-size: 11px; color: var(--nb-text-faint); }

    /* ==== الطباعة: تُظهر الورقة فقط ==== */
    @media print {
      @page { size: A4; margin: 14mm; }
      body * { visibility: hidden; }
      #report-sheet, #report-sheet * { visibility: visible; }
      #report-sheet { position: absolute; inset-inline: 0; top: 0; width: 100%; padding: 0; }
      .no-print { display: none !important; }
      table.report-table th { background: var(--nb-primary-600) !important; color: #fff !important;
        -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table.report-table tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `]
})
export class ReportingDashboardComponent implements OnInit {
  private repService = inject(ReportingService);
  private tenantService = inject(TenantService);

  /** اسم المدرسة من المستأجر — للترويسة الرسمية والطباعة. */
  readonly schoolName = computed(() => {
    const t = this.tenantService.currentTenant();
    return t?.nameAr || t?.name || 'المؤسسة التعليمية';
  });

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
  // التقرير المعروض حالياً في العارض
  currentReport = signal<any | null>(null);
  executedAt = signal<string>('');
  exporting = signal<string | null>(null);   // 'pdf' | 'excel' | 'csv'

  // مساحة عمل التقارير: بحث + تجميع حسب الفئة
  reportSearch = signal('');
  readonly groupedReports = computed(() => {
    const q = this.reportSearch().trim().toLowerCase();
    const filtered = this.reports().filter(r => !q
      || (r.name || '').toLowerCase().includes(q)
      || (r.category_name || '').toLowerCase().includes(q)
      || (r.description || '').toLowerCase().includes(q));
    const groups = new Map<string, any[]>();
    for (const r of filtered) {
      const key = r.category_name || 'أخرى';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries()).map(([category, reports]) => ({ category, reports }));
  });

  /** أيقونة الفئة من اسمها (رموز موحّدة). */
  catIcon(name: string): string {
    const n = name || '';
    if (n.includes('امتحان') || n.includes('درجات')) return '📝';
    if (n.includes('هيئة') || n.includes('معلم')) return '👥';
    if (n.includes('قبول')) return '📋';
    if (n.includes('طلاب') || n.includes('طالب')) return '🎓';
    if (n.includes('حضور')) return '🕐';
    if (n.includes('مالي')) return '💰';
    if (n.includes('رواتب')) return '🧾';
    if (n.includes('عيادة')) return '🩺';
    if (n.includes('مكتبة')) return '📖';
    if (n.includes('أكاديم')) return '📚';
    return '📊';
  }

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
    const report = this.reports().find(r => r.id === id) || null;
    this.repService.executeReport(id, {}).subscribe({
      next: (res) => {
        const list = res?.data?.data ?? [];
        this.executedData.set(list);
        this.dataColumns.set(list.length ? Object.keys(list[0]) : []);
        this.currentReport.set(report);
        this.executedAt.set(new Date().toLocaleString('ar'));
        this.running.set(null);
      },
      error: () => this.running.set(null),
    });
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private safeName(): string {
    return (this.currentReport()?.name || 'report').replace(/[\\/:*?"<>|]/g, '_');
  }

  exportPdf(id: string): void {
    this.exporting.set('pdf');
    this.repService.exportReportPdf(id, {}).subscribe({
      next: (blob) => { this.saveBlob(blob, `${this.safeName()}.pdf`); this.exporting.set(null); },
      error: () => this.exporting.set(null),
    });
  }

  exportExcel(id: string): void {
    this.exporting.set('excel');
    this.repService.exportReportExcel(id, {}).subscribe({
      next: (blob) => { this.saveBlob(blob, `${this.safeName()}.xlsx`); this.exporting.set(null); },
      error: () => this.exporting.set(null),
    });
  }

  exportReport(id: string): void {
    this.exporting.set('csv');
    this.repService.exportReportCsv(id, {}).subscribe({
      next: (blob: any) => { this.saveBlob(blob, `${this.safeName()}.csv`); this.exporting.set(null); },
      error: () => this.exporting.set(null),
    });
  }

  printReport(): void {
    window.print();
  }
}
