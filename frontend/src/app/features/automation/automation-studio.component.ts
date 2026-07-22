import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AutomationService } from './automation.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';

interface EngineCard {
  route: string;
  glyph: string;
  title: string;
  desc: string;
  countKey?: string;
}

interface Lane {
  key: string;
  label: string;
  hint: string;
  cards: EngineCard[];
}

@Component({
  selector: 'app-automation-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="استوديو الأتمتة المؤسسية — Automation Studio"
        subtitle="محرك مسارات العمل المباشرة · مصمم جداول القرار · منصة الكيانات منخفضة الشيفرة · مركز المراقبة الحية والذكاء الاصطناعي.">
        <button class="btn ghost" (click)="loadCounts()">تحديث الإحصائيات</button>
        <button class="btn ai-btn" (click)="openAiModal()">
          <span class="ai-sparkle">✨</span> بناء أتمتة بالذكاء الاصطناعي
        </button>
      </nb-page-header>

      <!-- عدّادات المنصة المباشرة من الباك إند -->
      <section class="stats">
        @for (s of statsConfig; track s.key) {
          <article class="stat-card">
            <span class="stat-ic" [attr.data-t]="s.tone">{{ s.glyph }}</span>
            <div class="stat-body">
              <span class="stat-val">{{ counts()[s.key] ?? 0 }}</span>
              <span class="stat-lbl">{{ s.label }}</span>
            </div>
          </article>
        }
      </section>

      <!-- التوقيع البصري: مسارات الأتمتة التتابعـية (صمّم ← نفّذ ← شغّل) -->
      @for (lane of lanes; track lane.key) {
        <section class="lane-section">
          <header class="lane-header">
            <span class="lane-badge">{{ $index + 1 }}</span>
            <div class="lane-titles">
              <h2>{{ lane.label }}</h2>
              <p>{{ lane.hint }}</p>
            </div>
          </header>
          <div class="cards-grid">
            @for (c of lane.cards; track c.route) {
              <a class="engine-card" [routerLink]="c.route">
                <div class="card-head">
                  <span class="card-glyph">{{ c.glyph }}</span>
                  @if (c.countKey && counts()[c.countKey] !== undefined) {
                    <span class="card-badge">{{ counts()[c.countKey] }} عنصر</span>
                  }
                </div>
                <h3 class="card-title">{{ c.title }}</h3>
                <p class="card-desc">{{ c.desc }}</p>
                <span class="card-arrow">←</span>
              </a>
            }
          </div>
        </section>
      }

      <!-- Nebras OS Custom Modal: AI Automation Assist -->
      @if (showAiModal()) {
        <div class="modal-backdrop" (click)="closeAiModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>✨ مساعد الذكاء الاصطناعي لصياغة الأتمتة (AI Assist)</h3>
              <button class="close-btn" (click)="closeAiModal()">✕</button>
            </div>
            <div class="modal-body">
              <label class="form-group">
                <span>نوع البناء المطلوب</span>
                <select class="input" [(ngModel)]="aiKind">
                  <option value="workflow">مسار عمل آلي (Workflow Diagram)</option>
                  <option value="rule">جدول قرار وقاعدة عمل (Decision Table / Rule)</option>
                  <option value="flow">تدفق أتمتة أحداث (Automation Flow)</option>
                  <option value="form">نموذج تفاعلي منخفض الشيفرة (Low-Code Form)</option>
                </select>
              </label>

              <label class="form-group">
                <span>صف الأتمتة المطلوبة بأسلوبك الطبيعي *</span>
                <textarea class="textarea" rows="4" [(ngModel)]="aiPrompt"
                          placeholder="مثال: أنشئ مسار موافقة على طلبات الشراء التي تتجاوز 10,000 ريال، تبدأ بفحص الميزانية ثم توجيه الطلب للمدير المالي..."></textarea>
              </label>

              @if (aiResult()) {
                <div class="ai-result-box">
                  <h4>💡 المخرجات المباشرة من محرك الذكاء الاصطناعي:</h4>
                  <pre class="json-code">{{ aiResult() | json }}</pre>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn ghost" (click)="closeAiModal()">إغلاق</button>
              <button class="btn primary" [disabled]="aiLoading() || !aiPrompt.trim()" (click)="submitAiAssist()">
                {{ aiLoading() ? 'جاري البناء بالذكاء الاصطناعي…' : 'توليد ومحاكاة الأتمتة' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; min-width: 0; box-sizing: border-box;
      background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.ghost:hover { border-color: var(--nb-primary-400); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.primary:hover { filter: brightness(1.08); }
    .btn.ai-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-weight: 700; }
    .btn.ai-btn:hover { filter: brightness(1.1); box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35); }

    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .stat-card { display: flex; align-items: center; gap: 14px; padding: 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .stat-ic { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .stat-ic[data-t='indigo'] { background: #e0e7ff; color: #4338ca; }
    .stat-ic[data-t='blue'] { background: #e0f2fe; color: #0369a1; }
    .stat-ic[data-t='emerald'] { background: #d1fae5; color: #047857; }
    .stat-ic[data-t='amber'] { background: #fef3c7; color: #b45309; }
    .stat-body { display: flex; flex-direction: column; }
    .stat-val { font-size: 24px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .stat-lbl { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); }

    /* المسارات البصرية الثلاثة */
    .lane-section { margin-bottom: 28px; }
    .lane-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .lane-badge { width: 30px; height: 30px; border-radius: 50%; background: var(--nb-primary-600);
      color: #fff; font-size: 14px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .lane-titles h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--nb-text); }
    .lane-titles p { margin: 2px 0 0; font-size: 12px; color: var(--nb-text-muted); }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .engine-card { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 18px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card);
      text-decoration: none; color: inherit; transition: all .2s ease; }
    .engine-card:hover { transform: translateY(-3px); border-color: var(--nb-primary-400); box-shadow: 0 8px 24px rgba(48,63,159,.12); }
    .card-head { display: flex; align-items: center; justify-content: space-between; }
    .card-glyph { width: 36px; height: 36px; border-radius: 10px; background: var(--nb-primary-50);
      color: var(--nb-primary-600); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .card-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .card-title { margin: 4px 0 0; font-size: 14.5px; font-weight: 700; color: var(--nb-text); }
    .card-desc { margin: 0; font-size: 12px; line-height: 1.6; color: var(--nb-text-muted); }
    .card-arrow { position: absolute; top: 18px; inset-inline-end: 18px; font-size: 16px; color: var(--nb-text-muted); opacity: 0; transition: opacity .15s ease; }
    .engine-card:hover .card-arrow { opacity: 1; color: var(--nb-primary-600); }

    /* Nebras Custom Modal UI */
    .modal-backdrop { position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-card { width: 100%; max-width: 540px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); box-shadow: 0 16px 40px rgba(0,0,0,0.22); display: flex; flex-direction: column; }
    .modal-header { padding: 16px 20px; border-bottom: 1px solid var(--nb-border-soft); display: flex; align-items: center; justify-content: space-between; }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .close-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: var(--nb-text-muted); }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; max-height: 70vh; overflow-y: auto; }
    .modal-footer { padding: 14px 20px; border-top: 1px solid var(--nb-border-soft); display: flex; justify-content: flex-end; gap: 10px; background: var(--nb-surface-raised); }
    .form-group { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--nb-text); }
    .input, .textarea { padding: 10px 12px; font-family: inherit; font-size: 13px; color: var(--nb-text);
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); outline: none; }
    .input:focus, .textarea:focus { border-color: var(--nb-primary-400); }
    .ai-result-box { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 14px; margin-top: 8px; }
    .ai-result-box h4 { margin: 0 0 8px; font-size: 12.5px; font-weight: 700; color: var(--nb-primary-600); }
    .json-code { margin: 0; font-family: monospace; font-size: 11.5px; max-height: 160px; overflow: auto; background: var(--nb-bg); padding: 10px; border-radius: 6px; }
  `]
})
export class AutomationStudioComponent implements OnInit {
  private api = inject(AutomationService);

  counts = signal<{ [key: string]: number }>({});
  showAiModal = signal<boolean>(false);
  aiKind = 'workflow';
  aiPrompt = '';
  aiLoading = signal<boolean>(false);
  aiResult = signal<any>(null);

  readonly statsConfig = [
    { key: 'workflow-diagrams', label: 'مخططات مسارات العمل', glyph: '▦', tone: 'indigo' },
    { key: 'flows', label: 'تدفقات الأتمتة النشطة', glyph: '⚡', tone: 'blue' },
    { key: 'decision-tables', label: 'جداول القرار المعتمدة', glyph: '▤', tone: 'emerald' },
    { key: 'plugin-installations', label: 'الإضافات المثبّتة', glyph: '◈', tone: 'amber' },
  ];

  readonly lanes: Lane[] = [
    {
      key: 'design',
      label: '1. مسار التصميم والبناء (Design & Authoring)',
      hint: 'بناء مخططات مسارات العمل المرئية، جداول القرار والقواعد، والكيانات منخفضة الشيفرة.',
      cards: [
        { route: '/automation/workflow-designer', glyph: '▦', title: 'مصمّم مسارات العمل البصري', desc: 'لوحة رسم مرئية (SVG Canvas) لسحب وإسقاط العُقد والموافقات والترجمة المباشرة المحركات.', countKey: 'workflow-diagrams' },
        { route: '/automation/rule-designer', glyph: '▤', title: 'مصمّم القواعد وجداول القرار', desc: 'جداول وتفرعات القرار مع سياسات الإصابة المختلفة والترجمة التلقائية لمحرك القواعد.', countKey: 'decision-tables' },
        { route: '/automation/lowcode', glyph: '❖', title: 'الاستوديو منخفض الشيفرة Low-Code', desc: 'بناء الكيانات والحقول واستخراج الشيفرة الهيكلية المعمارية (DDD Scaffolds).', countKey: 'entities' },
      ]
    },
    {
      key: 'execute',
      label: '2. مسار التنفيذ والربط (Automation & Execution)',
      hint: 'إدارة محفزات الأحداث والجدولة الزمنية وسجل تتبع الخطوات الزمني.',
      cards: [
        { route: '/automation/automation', glyph: '⚡', title: 'محرك التدفقات وسجل التشغيل', desc: 'ربط محفزات الأحداث والجدولة وتنفيذ الإجراءات المترتبة وتتبع التاريخ الزمني.', countKey: 'flows' },
      ]
    },
    {
      key: 'operate',
      label: '3. مسار التشغيل والمراقبة (Operations & DevOps)',
      hint: 'مراقبة صحة السيرفرات وقاعدة البيانات والذاكرة المؤقتة، وإدارة البيئات والإضافات.',
      cards: [
        { route: '/automation/operations', glyph: '📊', title: 'مركز العمليات والصحة الحية', desc: 'مراقبة فورية لصحة قاعدة البيانات والمؤشرات الحية وإصدار التنبيهات الفورية.' },
        { route: '/automation/devops', glyph: '🚩', title: 'مركز DevOps ورايات الميزات', desc: 'إدارة البيئات ورايات الميزات (Feature Flags) وسجلات التراجع عن النشر.' },
        { route: '/automation/plugins', glyph: '◈', title: 'إدارة الإضافات والملحقات', desc: 'سجل الإضافات وتثبيت الملحقات وفحص الأمان للمستأجرين.', countKey: 'plugin-installations' },
      ]
    }
  ];

  ngOnInit(): void {
    this.loadCounts();
  }

  loadCounts(): void {
    const resources = ['workflow-diagrams', 'flows', 'decision-tables', 'plugin-installations', 'entities'];
    resources.forEach(r => {
      this.api.list(r).subscribe({
        next: (items: any) => {
          const list = Array.isArray(items) ? items : (items?.data || []);
          this.counts.update(c => ({ ...c, [r]: list.length }));
        },
        error: () => {}
      });
    });
  }

  openAiModal(): void {
    this.aiPrompt = '';
    this.aiKind = 'workflow';
    this.aiResult.set(null);
    this.showAiModal.set(true);
  }

  closeAiModal(): void {
    this.showAiModal.set(false);
  }

  submitAiAssist(): void {
    if (!this.aiPrompt.trim()) return;

    this.aiLoading.set(true);
    this.api.aiAssist(this.aiKind, this.aiPrompt).subscribe({
      next: (res) => {
        this.aiResult.set(res);
        this.aiLoading.set(false);
      },
      error: (err) => {
        console.error('خطأ مساعد الذكاء الاصطناعي:', err);
        this.aiLoading.set(false);
      }
    });
  }
}
