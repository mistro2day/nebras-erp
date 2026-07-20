import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TenantService } from '../../core/services/tenant.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';

type RuleFilter = 'all' | 'published' | 'draft';

/**
 * منصة ومحرّك قواعد الأعمال الموحّد — لغة تصميم نبراس.
 *
 * التوقيع البصري: «بطاقة القاعدة بصيغة إذا / عندئذٍ» — تُقرأ كل قاعدة كجملة
 * شرطية مقروءة (الشرط ← النتيجة) بدل صفّ جدول صامت، فيفهم المستخدم غير التقني
 * ما تفعله القاعدة دون فتحها. تعلوها بطاقات المؤشرات وشريط تصفية الحالة.
 */
@Component({
  selector: 'app-rules-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة ومحرّك قواعد الأعمال الموحّد"
        [subtitle]="'قواعد الحضور والرواتب والقبول والخصومات لـ ' + tenantName()">
        <button class="btn ghost" (click)="loadRules()">تحديث</button>
        <button class="btn primary">قاعدة جديدة</button>
      </nb-page-header>

      <!-- مؤشرات المحرّك -->
      <section class="stats">
        <article class="stat">
          <span class="stat-lbl">إجمالي القواعد</span>
          <span class="stat-val">{{ rules().length }}</span>
        </article>
        <article class="stat">
          <span class="stat-lbl">القواعد النشطة</span>
          <span class="stat-val ok">{{ activeCount() }}</span>
          <span class="stat-foot">{{ activeShare() }}% من إجمالي القواعد</span>
        </article>
        <article class="stat">
          <span class="stat-lbl">مرّات التنفيذ اليوم</span>
          <span class="stat-val info">{{ executionCount() }}</span>
        </article>
        <article class="stat">
          <span class="stat-lbl">حالات الفشل</span>
          <span class="stat-val" [class.bad]="failureCount() > 0">{{ failureCount() }}</span>
          <span class="stat-foot">{{ failureCount() === 0 ? 'المحرّك يعمل دون أخطاء' : 'تحتاج مراجعة' }}</span>
        </article>
      </section>

      <!-- شريط التصفية -->
      <nav class="filters" role="tablist" aria-label="تصفية القواعد">
        @for (f of filters; track f.key) {
          <button class="filter" role="tab" [class.on]="filter() === f.key"
                  [attr.aria-selected]="filter() === f.key" (click)="filter.set(f.key)">
            {{ f.label }}
            <span class="filter-count">{{ filterCount(f.key) }}</span>
          </button>
        }
      </nav>

      <!-- التوقيع البصري: بطاقات «إذا / عندئذٍ» -->
      <section class="rules">
        @for (r of visibleRules(); track r.id) {
          <article class="rule" [class.draft]="r.status !== 'published'">
            <header class="rule-head">
              <span class="rule-code">{{ r.code }}</span>
              <span class="rule-name">{{ r.name }}</span>
              <span class="spacer"></span>
              <span class="prio" [attr.title]="'الأولوية ' + r.priority">أولوية {{ r.priority }}</span>
              <span class="state" [attr.data-s]="r.status === 'published' ? 'on' : 'draft'">
                {{ r.status === 'published' ? 'نشطة' : 'مسودّة' }}
              </span>
            </header>

            <div class="logic">
              <div class="clause when">
                <span class="clause-kw">إذا</span>
                <span class="clause-body">{{ conditionText(r) }}</span>
              </div>
              <span class="arrow" aria-hidden="true">↓</span>
              <div class="clause then">
                <span class="clause-kw">عندئذٍ</span>
                <span class="clause-body">{{ actionText(r) }}</span>
              </div>
            </div>

            @if (r.description) { <p class="rule-desc">{{ r.description }}</p> }
          </article>
        }

        @if (visibleRules().length === 0) {
          <div class="empty">
            @if (rules().length === 0) {
              <strong>لا توجد قواعد مسجّلة بعد</strong>
              <p>ابدأ بتعريف أول قاعدة أعمال لتُطبَّق تلقائياً على عمليات النظام.</p>
              <button class="btn primary">إنشاء قاعدة</button>
            } @else {
              <strong>لا توجد قواعد ضمن هذه التصفية</strong>
              <button class="link-btn" (click)="filter.set('all')">عرض كل القواعد</button>
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
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.ghost:hover { border-color: var(--nb-primary-400); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover { filter: brightness(1.08); }
    .link-btn { background: none; border: none; font-family: inherit; font-size: 12.5px; font-weight: 600;
      color: var(--nb-primary-600); cursor: pointer; }

    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .stat { display: flex; flex-direction: column; gap: 3px; padding: 14px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .stat-lbl { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); }
    .stat-val { font-size: 26px; font-weight: 800; color: var(--nb-text); line-height: 1.15;
      font-variant-numeric: tabular-nums; }
    .stat-val.ok { color: var(--nb-success, #15803d); }
    .stat-val.info { color: var(--nb-info, #0284c7); }
    .stat-val.bad { color: var(--nb-danger, #dc2626); }
    .stat-foot { font-size: 11px; color: var(--nb-text-muted); }

    .filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .filter { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 13px;
      font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: 999px; color: var(--nb-text-secondary); transition: all .15s ease; }
    .filter:hover { border-color: var(--nb-primary-400); }
    .filter.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }
    .filter-count { font-size: 11px; font-weight: 700; padding: 0 6px; border-radius: 999px;
      background: var(--nb-border-soft); color: var(--nb-text-muted); }
    .filter.on .filter-count { background: rgba(255,255,255,.22); color: #fff; }

    /* بطاقة القاعدة */
    .rules { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
    .rule { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 14px 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); transition: border-color .15s ease, box-shadow .15s ease; }
    .rule::before { content: ''; position: absolute; inset-inline-start: 0; inset-block: 14px;
      width: 3px; border-radius: 3px; background: var(--nb-success, #16a34a); }
    .rule.draft::before { background: var(--nb-warning, #f59e0b); }
    .rule:hover { border-color: var(--nb-primary-400); box-shadow: 0 6px 18px rgba(48,63,159,.08); }

    .rule-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .rule-code { font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700;
      padding: 2px 7px; border-radius: var(--nb-radius-sm);
      background: var(--nb-surface-raised); color: var(--nb-text-secondary); }
    .rule-name { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
    .spacer { flex: 1; }
    .prio { font-size: 11px; font-weight: 600; color: var(--nb-text-muted); }
    .state { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .state[data-s='on'] { background: #dcfce7; color: #15803d; }
    .state[data-s='draft'] { background: #fef3c7; color: #b45309; }

    .logic { display: flex; flex-direction: column; gap: 4px; padding: 11px 12px;
      background: var(--nb-surface-raised); border: 1px solid var(--nb-border-soft);
      border-radius: var(--nb-radius); }
    .clause { display: flex; gap: 8px; align-items: baseline; }
    .clause-kw { flex-shrink: 0; font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 999px; }
    .when .clause-kw { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .then .clause-kw { background: #dcfce7; color: #15803d; }
    .clause-body { font-size: 12.5px; line-height: 1.6; color: var(--nb-text); }
    .arrow { font-size: 12px; color: var(--nb-text-muted); padding-inline-start: 18px; }

    .rule-desc { margin: 0; font-size: 12px; line-height: 1.65; color: var(--nb-text-muted); }

    .empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 52px 20px; text-align: center;
      background: var(--nb-surface); border: 1px dashed var(--nb-border); border-radius: var(--nb-radius-card); }
    .empty strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .empty p { margin: 0; font-size: 12.5px; color: var(--nb-text-muted); }

    @media (max-width: 700px) { .page { padding: 14px; } .rules { grid-template-columns: 1fr; } }
  `],
})
export class RulesDashboardComponent implements OnInit {
  private tenantService = inject(TenantService);
  private http = inject(HttpClient);

  readonly filters: { key: RuleFilter; label: string }[] = [
    { key: 'all', label: 'كل القواعد' },
    { key: 'published', label: 'النشطة' },
    { key: 'draft', label: 'المسودّات' },
  ];

  rules = signal<any[]>([]);
  executionCount = signal(0);
  failureCount = signal(0);
  filter = signal<RuleFilter>('all');

  tenantName = computed(
    () => (this.tenantService as any).currentTenant()?.nameAr || 'نبراس ERP',
  );

  activeCount = computed(() => this.rules().filter((r) => r.status === 'published').length);

  activeShare = computed(() => {
    const total = this.rules().length;
    return total ? Math.round((this.activeCount() / total) * 100) : 0;
  });

  visibleRules = computed(() => {
    const f = this.filter();
    if (f === 'all') return this.rules();
    if (f === 'published') return this.rules().filter((r) => r.status === 'published');
    return this.rules().filter((r) => r.status !== 'published');
  });

  ngOnInit(): void {
    this.loadRules();
  }

  loadRules(): void {
    this.http.get<any>('/api/v1/rules/rules/').subscribe({
      next: (res) => res?.success && this.rules.set(res.data ?? []),
    });

    this.http.get<any>('/api/v1/rules/executions/').subscribe({
      next: (res) => {
        const list: any[] = res?.success ? res.data ?? [] : [];
        this.executionCount.set(list.length);
        this.failureCount.set(list.filter((e) => e.status === 'failed' || e.success === false).length);
      },
    });
  }

  filterCount(key: RuleFilter): number {
    if (key === 'all') return this.rules().length;
    if (key === 'published') return this.activeCount();
    return this.rules().length - this.activeCount();
  }

  /** يحوّل شرط القاعدة إلى جملة عربية مقروءة، مع تعبير خام كبديل. */
  conditionText(r: any): string {
    return r?.condition_text || r?.condition_expression || r?.condition
      || 'لم يُحدَّد شرط — تُطبَّق القاعدة على كل الحالات.';
  }

  actionText(r: any): string {
    return r?.action_text || r?.action_expression || r?.action
      || 'لم يُحدَّد إجراء لهذه القاعدة بعد.';
  }
}
