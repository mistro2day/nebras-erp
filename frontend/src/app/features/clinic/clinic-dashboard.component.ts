import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ClinicService } from './clinic.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../shared/nebras/nb-loading.component';

interface QueueRow {
  id: string;
  patient: string;
  kind: string;
  visitType: string;
  status: string;
  waitedMinutes: number;
  urgent: boolean;
}

/**
 * مساحة عمل العيادة.
 *
 * التوقيع البصري: «طابور اليوم» — العيادة مكان يُنتظر فيه، والسؤال العملي
 * ليس كم زيارة سُجّلت بل مَن ينتظر الآن ومنذ متى. لذلك تُرتَّب الحالات
 * المفتوحة بطول الانتظار، وتُبرز الطارئة فوقها جميعاً.
 */
@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="العيادة المدرسية"
        subtitle="زيارات الطلاب والموظفين، صرف الأدوية، والإجازات المرضية.">
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="go('/clinic/visits')">الزيارات</button>
      </nb-page-header>

      @if (!loading() && pendingLeaves().length > 0) {
        <button class="alert" (click)="go('/clinic/leaves')">
          <span class="a-ic">◔</span>
          <span class="a-body">
            <strong>{{ pendingLeaves().length }}</strong> إجازة مرضية بانتظار اعتماد الطبيب.
            <span class="a-hint">الاعتماد يُبرّر غياب المريض تلقائياً في الحضور.</span>
          </span>
          <span class="a-go">مراجعة الإجازات ‹</span>
        </button>
      }

      <section class="kpis">
        <button class="kpi" (click)="go('/clinic/visits')">
          <span class="k-label">زيارات اليوم</span>
          <span class="k-val">{{ todayCount() }}</span>
          <span class="k-hint">من إجمالي {{ visits().length }} زيارة مسجّلة</span>
        </button>
        <button class="kpi" [class.warn]="queue().length > 0" (click)="go('/clinic/visits')">
          <span class="k-label">في الانتظار الآن</span>
          <span class="k-val">{{ queue().length }}</span>
          <span class="k-hint">لم تُغلق زيارتهم بعد</span>
        </button>
        <button class="kpi" [class.danger]="urgentCount() > 0" (click)="go('/clinic/visits')">
          <span class="k-label">حالات طارئة</span>
          <span class="k-val">{{ urgentCount() }}</span>
          <span class="k-hint">تحتاج أولوية فورية</span>
        </button>
        <button class="kpi" (click)="go('/clinic/leaves')">
          <span class="k-label">إجازات معتمدة</span>
          <span class="k-val">{{ approvedLeaves() }}</span>
          <span class="k-hint">أثّرت في سجل الحضور</span>
        </button>
      </section>

      <!-- التوقيع: طابور اليوم -->
      <section class="panel">
        <div class="p-head">
          <div>
            <h3>طابور العيادة</h3>
            <p>الحالات المفتوحة مرتّبة بطول الانتظار — الطارئ أولاً.</p>
          </div>
          <div class="legend">
            <span><i class="sw urg"></i>طارئ</span>
            <span><i class="sw wait"></i>انتظار طويل</span>
            <span><i class="sw ok"></i>ضمن المعتاد</span>
          </div>
        </div>

        @if (loading()) {
          <nb-loading message="جارٍ تحميل طابور العيادة…"></nb-loading>
        } @else if (!queue().length) {
          <div class="empty">
            <p>لا أحد في الانتظار.</p>
            <p class="hint">كل الزيارات المسجّلة أُغلقت. تُفتح زيارة جديدة من صفحة الزيارات.</p>
          </div>
        } @else {
          <div class="queue">
            @for (q of queue(); track q.id) {
              <button class="qrow" [class.urgent]="q.urgent" [class.long]="q.waitedMinutes >= 30"
                (click)="go('/clinic/visits')">
                <span class="q-who">
                  <strong>{{ q.patient }}</strong>
                  <span class="q-meta">{{ q.kind }} · {{ q.visitType }}</span>
                </span>
                <span class="q-bar">
                  <span class="q-fill" [style.width.%]="waitWidth(q)"></span>
                </span>
                <span class="q-wait">
                  <strong>{{ q.waitedMinutes }}</strong>
                  <span class="q-unit">دقيقة انتظار</span>
                </span>
                <span class="q-state">
                  @if (q.urgent) { <span class="tag urg">طارئ</span> }
                  @else { <span class="tag st">{{ statusText(q.status) }}</span> }
                </span>
              </button>
            }
          </div>
        }
      </section>

      <h3 class="sec-title">إدارة العيادة</h3>
      <section class="tiles">
        @for (t of tiles; track t.route) {
          <button class="tile" (click)="go(t.route)">
            <span class="t-ic">{{ t.icon }}</span>
            <span class="t-title">{{ t.title }}</span>
            <span class="t-desc">{{ t.desc }}</span>
          </button>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }

    .alert { display: flex; align-items: center; gap: 14px; width: 100%; text-align: start;
      font-family: inherit; cursor: pointer; background: var(--nb-primary-50, #f5f6ff);
      border: 1px solid var(--nb-primary-100, #e3e6fb);
      border-inline-start: 4px solid var(--nb-primary-500);
      border-radius: var(--nb-radius-card); padding: 13px 16px; margin-bottom: 16px; }
    .a-ic { font-size: 18px; color: var(--nb-primary-700); }
    .a-body { flex: 1; font-size: 13px; color: var(--nb-text); }
    .a-body strong { font-weight: 800; }
    .a-hint { color: var(--nb-text-muted); margin-inline-start: 6px; }
    .a-go { font-size: 12px; font-weight: 700; color: var(--nb-primary-700); }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, 1fr); } }
    .kpi { text-align: start; font-family: inherit; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px;
      display: flex; flex-direction: column; gap: 3px;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .kpi:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,.1);
      border-color: var(--nb-primary-400); }
    .kpi:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: 2px; }
    .kpi.warn { border-color: #fde9c8; background: #fffdf8; }
    .kpi.danger { border-color: #fecaca; background: #fffafa; }
    .k-label { font-size: 12px; font-weight: 700; color: var(--nb-text-muted); }
    .k-val { font-size: 25px; font-weight: 800; color: var(--nb-text); line-height: 1.15;
      font-variant-numeric: tabular-nums; }
    .k-hint { font-size: 11px; color: var(--nb-text-muted); }

    .panel { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 16px 18px; margin-bottom: 20px; }
    .p-head { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
    .p-head h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; color: var(--nb-text); }
    .p-head p { margin: 0; font-size: 12px; color: var(--nb-text-muted); }
    .legend { display: flex; align-items: center; gap: 12px; font-size: 11px; color: var(--nb-text-muted); }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .sw { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
    .sw.urg { background: #DC2626; } .sw.wait { background: #F59E0B; } .sw.ok { background: #16A34A; }

    .queue { display: flex; flex-direction: column; }
    .qrow { display: grid; grid-template-columns: 1.8fr 1.8fr 1fr 0.9fr; align-items: center; gap: 14px;
      width: 100%; text-align: start; font-family: inherit; cursor: pointer; background: none;
      border: none; border-top: 1px solid var(--nb-border-soft, #f0f1f5); padding: 11px 8px;
      border-radius: 8px; transition: background .15s ease; }
    .qrow:first-child { border-top: none; }
    .qrow:hover { background: var(--nb-surface-raised); }
    .qrow:focus-visible { outline: 2px solid var(--nb-primary-500); outline-offset: -2px; }
    .qrow.urgent { background: #fffafa; }
    @media (max-width: 820px) { .qrow { grid-template-columns: 1fr 1fr; row-gap: 8px; } }

    .q-who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .q-who strong { font-size: 13px; font-weight: 700; color: var(--nb-text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .q-meta { font-size: 11px; color: var(--nb-text-muted); }

    .q-bar { position: relative; height: 8px; border-radius: 5px; background: #eef0f5; }
    .q-fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 5px;
      background: #16A34A; transition: width .5s cubic-bezier(.4,0,.2,1); }
    .qrow.long .q-fill { background: #F59E0B; }
    .qrow.urgent .q-fill { background: #DC2626; }

    .q-wait { display: flex; flex-direction: column; gap: 0; }
    .q-wait strong { font-size: 16px; font-weight: 800; color: var(--nb-text);
      font-variant-numeric: tabular-nums; }
    .q-unit { font-size: 10.5px; color: var(--nb-text-muted); }
    .q-state { text-align: end; }

    .tag { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 10px; display: inline-block; }
    .tag.urg { background: #fef2f2; color: #B91C1C; }
    .tag.st { background: var(--nb-primary-50); color: var(--nb-primary-700); }

    .empty { padding: 26px; text-align: center; }
    .empty p { margin: 0 0 4px; font-size: 13px; color: var(--nb-text); }
    .empty .hint { font-size: 12px; color: var(--nb-text-muted); }

    .sec-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
    .tile { text-align: start; font-family: inherit; cursor: pointer; background: var(--nb-surface);
      border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px;
      display: flex; flex-direction: column; gap: 3px;
      transition: transform .15s ease, box-shadow .15s ease; }
    .tile:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,.1);
      border-color: var(--nb-primary-400); }
    .t-ic { font-size: 19px; }
    .t-title { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .t-desc { font-size: 11px; color: var(--nb-text-muted); }

    @media (prefers-reduced-motion: reduce) {
      .kpi, .tile, .qrow, .q-fill { transition: none; }
      .kpi:hover, .tile:hover { transform: none; }
    }
  `],
})
export class ClinicDashboardComponent implements OnInit {
  private svc = inject(ClinicService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly visits = signal<any[]>([]);
  private leaves = signal<any[]>([]);

  readonly tiles = [
    { icon: '🩺', title: 'الزيارات', desc: 'تسجيل الزيارات والمؤشرات وصرف الدواء.', route: '/clinic/visits' },
    { icon: '📄', title: 'الإجازات المرضية', desc: 'اعتمادها يُبرّر الغياب تلقائياً.', route: '/clinic/leaves' },
    { icon: '💊', title: 'مخزون الأدوية', desc: 'أرصدة العيادة في المستودعات.', route: '/inventory/items' },
  ];

  private today(): string { return new Date().toISOString().slice(0, 10); }

  readonly todayCount = computed(
    () => this.visits().filter((v) => v.visit_date === this.today()).length,
  );

  /** الزيارة المفتوحة هي من لم يُسجَّل خروجه بعد. */
  readonly queue = computed<QueueRow[]>(() =>
    this.visits()
      .filter((v) => !['discharged', 'closed', 'cancelled'].includes(v.status))
      .map((v) => {
        const start = v.check_in_time ? new Date(v.check_in_time).getTime() : Date.now();
        const waited = Math.max(0, Math.round((Date.now() - start) / 60000));
        return {
          id: v.id,
          patient: v.patient_name || 'غير معروف',
          kind: v.patient_type_label || '—',
          visitType: this.visitTypeText(v.visit_type),
          status: v.status,
          waitedMinutes: waited,
          urgent: v.visit_type === 'emergency',
        };
      })
      .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || b.waitedMinutes - a.waitedMinutes),
  );

  readonly urgentCount = computed(() => this.queue().filter((q) => q.urgent).length);
  readonly pendingLeaves = computed(
    () => this.leaves().filter((l) => ['draft', 'submitted', 'pending'].includes(l.status)),
  );
  readonly approvedLeaves = computed(
    () => this.leaves().filter((l) => l.status === 'approved').length,
  );

  /** الشريط يمثّل طول الانتظار مقابل ساعة كاملة. */
  waitWidth(q: QueueRow): number {
    return Math.max(4, Math.min(100, (q.waitedMinutes / 60) * 100));
  }

  statusText(s: string): string {
    return ({ checked_in: 'بانتظار الفحص', in_progress: 'قيد الفحص', diagnosed: 'شُخِّص',
      discharged: 'خرج', closed: 'مغلقة', cancelled: 'ملغاة' } as any)[s] || s;
  }
  visitTypeText(t: string): string {
    return ({ walk_in: 'زيارة عادية', emergency: 'طارئة', scheduled: 'موعد',
      follow_up: 'متابعة' } as any)[t] || t;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getVisits().subscribe({
      next: (d) => { this.visits.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.svc.getLeaves().subscribe({ next: (d) => this.leaves.set(rows(d)), error: () => {} });
  }

  go(route: string) { this.router.navigateByUrl(route); }
}
