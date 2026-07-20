import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

/**
 * منصة الأتمتة المؤسسية (Automation Studio) — لغة تصميم نبراس.
 *
 * التوقيع البصري: «مسارات الأتمتة الثلاثة» — تُرتَّب المحركات في ثلاث مسارات
 * متتابعة (صمّم ← نفّذ ← شغّل) بدل شبكة مسطّحة، فيقرأ المستخدم دورة حياة
 * الأتمتة كاملة من الأعلى للأسفل ويعرف أين يبدأ. يعلوها صفّ عدّادات حيّة.
 */
@Component({
  selector: 'app-automation-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة الأتمتة المؤسسية"
        subtitle="مصمّم مسارات العمل · جداول القرار · الاستوديو منخفض الشيفرة · مركز العمليات · DevOps والإضافات.">
        <button class="btn ghost" (click)="load()">تحديث</button>
      </nb-page-header>

      <!-- عدّادات المنصة -->
      <section class="stats">
        @for (s of stats; track s.key) {
          <article class="stat">
            <span class="stat-ic" [attr.data-t]="s.tone" aria-hidden="true">{{ s.glyph }}</span>
            <span class="stat-body">
              <span class="stat-val">{{ counts()[s.key] ?? 0 }}</span>
              <span class="stat-lbl">{{ s.label }}</span>
            </span>
          </article>
        }
      </section>

      <!-- التوقيع البصري: مسارات الأتمتة الثلاثة -->
      @for (lane of lanes; track lane.key) {
        <section class="lane">
          <header class="lane-head">
            <span class="lane-step" aria-hidden="true">{{ $index + 1 }}</span>
            <span class="lane-text">
              <h2>{{ lane.label }}</h2>
              <p>{{ lane.hint }}</p>
            </span>
          </header>
          <div class="cards">
            @for (c of lane.cards; track c.route) {
              <a class="card" [routerLink]="c.route">
                <span class="card-ic" aria-hidden="true">{{ c.glyph }}</span>
                <span class="card-title">
                  {{ c.title }}
                  @if (c.countKey && counts()[c.countKey]) {
                    <span class="card-count">{{ counts()[c.countKey] }}</span>
                  }
                </span>
                <span class="card-desc">{{ c.desc }}</span>
                <span class="card-go" aria-hidden="true">←</span>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; min-width: 0; box-sizing: border-box;
      background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.ghost:hover { border-color: var(--nb-primary-400); }

    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 22px; }
    .stat { display: flex; align-items: center; gap: 12px; padding: 14px;
      background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    .stat-ic { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; font-size: 17px; }
    .stat-ic[data-t='indigo'] { background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .stat-ic[data-t='blue'] { background: #e0f2fe; color: #0284c7; }
    .stat-ic[data-t='green'] { background: #dcfce7; color: #15803d; }
    .stat-ic[data-t='amber'] { background: #fef3c7; color: #b45309; }
    .stat-body { display: flex; flex-direction: column; min-width: 0; }
    .stat-val { font-size: 22px; font-weight: 800; color: var(--nb-text); line-height: 1.2;
      font-variant-numeric: tabular-nums; }
    .stat-lbl { font-size: 12px; font-weight: 600; color: var(--nb-text-muted); }

    /* المسارات */
    .lane { margin-bottom: 22px; }
    .lane-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .lane-step { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--nb-primary-600); color: #fff; font-size: 13px; font-weight: 800; }
    .lane-text h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .lane-text p { margin: 2px 0 0; font-size: 12px; color: var(--nb-text-muted); }

    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 12px;
      padding-inline-start: 40px; position: relative; }
    .cards::before { content: ''; position: absolute; inset-inline-start: 13px; top: -14px; bottom: -14px;
      width: 2px; background: var(--nb-border); border-radius: 2px; }
    .lane:last-child .cards::before { bottom: 50%; }
    @media (max-width: 700px) { .cards { padding-inline-start: 0; } .cards::before { display: none; } }

    .card { position: relative; display: flex; flex-direction: column; gap: 6px; padding: 16px;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); text-decoration: none; color: inherit;
      transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }
    .card:hover { transform: translateY(-2px); border-color: var(--nb-primary-400);
      box-shadow: 0 6px 18px rgba(48,63,159,.10); }
    .card-ic { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center;
      justify-content: center; font-size: 15px; background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .card-title { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .card-count { font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
      background: var(--nb-primary-50); color: var(--nb-primary-600); }
    .card-desc { font-size: 12px; line-height: 1.6; color: var(--nb-text-muted); }
    .card-go { position: absolute; top: 16px; inset-inline-end: 16px; font-size: 14px;
      color: var(--nb-text-muted); opacity: 0; transition: opacity .15s ease; }
    .card:hover .card-go { opacity: 1; color: var(--nb-primary-600); }

    @media (prefers-reduced-motion: reduce) { .card:hover { transform: none; } }
    @media (max-width: 700px) { .page { padding: 14px; } }
  `],
})
export class AutomationStudioComponent implements OnInit {
  private api = inject(AutomationService);

  readonly stats = [
    { key: 'workflow-diagrams', label: 'مخططات مسارات العمل', glyph: '▦', tone: 'indigo' },
    { key: 'flows', label: 'تدفقات الأتمتة', glyph: '⚡', tone: 'blue' },
    { key: 'decision-tables', label: 'جداول القرار', glyph: '▤', tone: 'green' },
    { key: 'plugin-installations', label: 'الإضافات المثبّتة', glyph: '◈', tone: 'amber' },
  ];

  readonly lanes: Lane[] = [
    {
      key: 'design',
      label: 'صمّم',
      hint: 'ابنِ المسار أو القاعدة أو الكيان بصرياً قبل نشره إلى المحرّك.',
      cards: [
        {
          route: 'workflow-designer', glyph: '▦', countKey: 'workflow-diagrams',
          title: 'مصمّم مسارات العمل المرئي',
          desc: 'كانفس لبناء العقد والوصلات والموافقات، مع تحقّق ومحاكاة ونشر إلى محرّك مسارات العمل.',
        },
        {
          route: 'rule-designer', glyph: '▤', countKey: 'decision-tables',
          title: 'مصمّم القواعد وجداول القرار',
          desc: 'جداول وأشجار قرار ومجموعات قواعد فوق محرّك القواعد الحالي مع محاكاة واختبار.',
        },
        {
          route: 'lowcode', glyph: '◇',
          title: 'الاستوديو منخفض الشيفرة',
          desc: 'باني الكيانات والنماذج والصفحات وواجهات الـ API — يولّد شيفرة متوافقة مع بنية DDD.',
        },
      ],
    },
    {
      key: 'run',
      label: 'نفّذ',
      hint: 'اربط المحفّزات بالإجراءات ودع المحرّك ينفّذ تلقائياً.',
      cards: [
        {
          route: 'automation', glyph: '⚡', countKey: 'flows',
          title: 'محرّك أتمتة الأحداث',
          desc: 'محفّزات الأحداث والجدولة والـ Webhooks وإجراءات تُنفَّذ عبر المحرّكات القائمة.',
        },
      ],
    },
    {
      key: 'operate',
      label: 'شغّل وراقب',
      hint: 'تابع صحة المنصة وأدر النشر والرايات والإضافات.',
      cards: [
        {
          route: 'operations', glyph: '◉',
          title: 'مركز العمليات والمراقبة',
          desc: 'صحة النظام والطوابير والعمّال والكاش وقواعد البيانات والتنبيهات التشغيلية.',
        },
        {
          route: 'devops', glyph: '⚑',
          title: 'مركز DevOps ورايات الميزات',
          desc: 'البيئات والأسرار ورايات الميزات وسجل النشر والتراجع ووضع الصيانة.',
        },
        {
          route: 'plugins', glyph: '◈', countKey: 'plugin-installations',
          title: 'مدير الإضافات المخصّصة',
          desc: 'سجل الإضافات والإصدارات والاعتماديات والفحص الأمني والتثبيت الآمن للمستأجرين.',
        },
      ],
    },
  ];

  counts = signal<Record<string, number | undefined>>({});

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    for (const s of this.stats) {
      this.api.list(s.key).subscribe({
        next: (d: any) => this.counts.update((c) => ({ ...c, [s.key]: Array.isArray(d) ? d.length : 0 })),
        error: () => this.counts.update((c) => ({ ...c, [s.key]: 0 })),
      });
    }
  }
}
