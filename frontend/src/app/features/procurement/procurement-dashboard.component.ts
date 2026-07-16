import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProcurementService } from './procurement.service';
import { NbPageHeaderComponent } from '../../shared/nebras/nb-page-header.component';

interface Stage {
  key: string;
  label: string;
  icon: string;
  countKey: string;
  hint: string;
  route: string;
}

/**
 * مساحة عمل المشتريات — نموذج «من الطلب إلى الدفع» (Source-to-Pay).
 *
 * التوقيع البصري: خط أنابيب المشتريات — تسلسل المراحل الأربع (طلب → عرض أسعار →
 * أمر شراء → عقد) كما في دورة حياة المشتريات بالتوثيق، يعرض عدّاد كل مرحلة
 * وتدفّقها. مستوحى من نمط Odoo / Dynamics 365 ومصاغ بلغة نبراس البصرية.
 */
@Component({
  selector: 'app-procurement-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="منصة المشتريات والتعاقدات"
        subtitle="من الطلب إلى الدفع — طلبات الشراء، عروض الأسعار، أوامر الشراء، والعقود في مسار واحد.">
        <button class="btn ghost" (click)="loadDashboard()">تحديث</button>
      </nb-page-header>

      <!-- تنبيه الموافقات المعلّقة -->
      @if (stat('pending_approvals') > 0) {
        <div class="approve-alert">
          <span class="aa-ic">⏳</span>
          <span class="aa-body">
            <strong>{{ stat('pending_approvals') }} طلب شراء بانتظار الاعتماد</strong>
            <small>طلبات شراء وصلت لمرحلة المراجعة وتنتظر قرار الاعتماد للمتابعة في المسار.</small>
          </span>
        </div>
      }

      <!-- العنصر المميّز: خط أنابيب المشتريات -->
      <section class="pipeline">
        @for (st of stages; track st.key; let i = $index; let last = $last) {
          <div class="stage">
            <button class="stage-card" [class.active]="stat(st.countKey) > 0" (click)="go(st.route)">
              <div class="stage-top">
                <span class="stage-idx">{{ i + 1 }}</span>
                <span class="stage-ic">{{ st.icon }}</span>
              </div>
              <span class="stage-count">{{ stat(st.countKey) }}</span>
              <span class="stage-label">{{ st.label }}</span>
              <span class="stage-hint">{{ st.hint }}</span>
            </button>
            @if (!last) { <span class="stage-flow" aria-hidden="true">→</span> }
          </div>
        }
      </section>

      <!-- مؤشرات الإنفاق -->
      <div class="kpis">
        <div class="kpi">
          <span class="kpi-label">إجمالي الإنفاق</span>
          <span class="kpi-value">{{ fmt(stat('total_spent')) }}</span>
          <span class="kpi-unit">القيمة التراكمية لأوامر الشراء المصدرة</span>
        </div>
        <div class="kpi good">
          <span class="kpi-label">الوفورات المحققة</span>
          <span class="kpi-value">{{ fmt(stat('savings')) }}</span>
          <span class="kpi-unit">الفرق بين التقديري والمُرسى عليه</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">معدّل الوفورات</span>
          <span class="kpi-value">{{ savingsRate() | number:'1.0-1' }}<em>%</em></span>
          <span class="kpi-unit">من إجمالي القيمة التقديرية</span>
        </div>
      </div>

      <!-- بطاقات التنقّل بين صفحات المشتريات -->
      <div class="nav-tiles">
        @for (t of navTiles; track t.route) {
          <button class="nav-tile" (click)="go(t.route)">
            <span class="nt-ic">{{ t.icon }}</span>
            <span class="nt-label">{{ t.label }}</span>
            <span class="nt-arrow">←</span>
          </button>
        }
      </div>

      <!-- عمودان: الطلبات الأخيرة + أداء الموردين -->
      <div class="cols">
        <section class="card">
          <div class="card-head">
            <h3>أحدث طلبات الشراء</h3>
            <a class="see-all" (click)="go('/procurement/requests')">عرض الكل ({{ requests().length }}) ←</a>
          </div>
          <div class="list">
            <div class="row head">
              <span>رقم الطلب</span><span>التاريخ</span><span class="ta-end">تقديري</span><span class="ta-end">الحالة</span>
            </div>
            @for (r of requests().slice(0, 7); track r.id) {
              <div class="row link" (click)="openRequest(r)" title="فتح تفاصيل الطلب">
                <span class="mono">{{ r.request_number || '—' }}</span>
                <span class="muted">{{ r.date || '—' }}</span>
                <span class="ta-end strong">{{ fmt(r.total_estimated_amount) }}</span>
                <span class="ta-end"><span class="badge" [attr.data-s]="r.status">{{ statusText(r.status) }}</span></span>
              </div>
            }
            @if (requests().length === 0) {
              <div class="empty">
                لا توجد طلبات شراء بعد.
                <a class="empty-cta" (click)="go('/procurement/requests')">إنشاء طلب شراء ←</a>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h3>أداء الموردين</h3>
            <a class="see-all" (click)="go('/procurement/vendors')">عرض الكل ({{ vendors().length }}) ←</a>
          </div>
          <div class="vendors">
            @for (v of topVendors(); track v.id) {
              <div class="vendor link" (click)="openVendor(v)" title="فتح سجل الموردين">
                <div class="v-ava">{{ initial(v.name_ar || v.name) }}</div>
                <div class="v-info">
                  <strong>{{ v.name_ar || v.name || 'مورّد' }}</strong>
                  <span class="v-meta">{{ vendorStatus(v.status) }}</span>
                </div>
                <div class="v-rate">
                  <span class="stars">{{ stars(v.rating) }}</span>
                  <span class="rnum">{{ (v.rating || 0) | number:'1.1-1' }}</span>
                </div>
              </div>
            }
            @if (vendors().length === 0) {
              <div class="empty">
                لا يوجد موردون معتمدون.
                <a class="empty-cta" (click)="go('/procurement/vendors')">إضافة مورّد ←</a>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }

    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }

    /* تنبيه الاعتماد */
    .approve-alert { display: flex; align-items: center; gap: 14px; background: var(--nb-warning-bg, #fffaf0);
      border: 1px solid #fde9c8; border-inline-start: 4px solid var(--nb-warning, #F59E0B);
      border-radius: var(--nb-radius-card); padding: 14px 16px; margin-bottom: 16px; }
    .aa-ic { font-size: 24px; }
    .aa-body { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .aa-body strong { font-size: 14px; font-weight: 800; color: #92400e; }
    .aa-body small { font-size: 12px; color: #a16207; }

    /* خط الأنابيب — العنصر المميّز */
    .pipeline { display: flex; align-items: stretch; gap: 4px; margin-bottom: 18px; overflow-x: auto; padding-bottom: 4px; }
    .stage { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; }
    .stage-card { flex: 1; min-width: 130px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px; display: flex; flex-direction: column; gap: 2px;
      position: relative; transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
      cursor: pointer; text-align: start; font-family: inherit; width: 100%; }
    .stage-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(48,63,159,0.1); border-color: var(--nb-primary-400); }
    .stage-card.active { border-color: var(--nb-primary-300); }
    .stage-card.active::before { content: ''; position: absolute; inset-inline-start: 0; top: 12px; bottom: 12px;
      width: 3px; border-radius: 3px; background: var(--nb-primary-500); }
    .stage-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .stage-idx { width: 20px; height: 20px; border-radius: 50%; background: var(--nb-primary-50);
      color: var(--nb-primary-700); font-size: 11px; font-weight: 800; display: grid; place-items: center; }
    .stage-ic { font-size: 20px; }
    .stage-count { font-size: 26px; font-weight: 800; color: var(--nb-text); line-height: 1.1; font-variant-numeric: tabular-nums; }
    .stage-label { font-size: 13px; font-weight: 700; color: var(--nb-text); }
    .stage-hint { font-size: 11px; color: var(--nb-text-muted); }
    .stage-flow { color: var(--nb-primary-400); font-size: 18px; flex: none; transform: scaleX(-1); }

    /* مؤشرات الإنفاق */
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
    @media (max-width: 820px) { .kpis { grid-template-columns: 1fr; } }
    .kpi { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 16px; }
    .kpi-label { font-size: 12px; color: var(--nb-text-muted); display: block; margin-bottom: 6px; }
    .kpi-value { font-size: 24px; font-weight: 800; color: var(--nb-text); font-variant-numeric: tabular-nums; }
    .kpi-value em { font-size: 14px; font-style: normal; color: var(--nb-text-muted); }
    .kpi.good .kpi-value { color: var(--nb-success); }
    .kpi-unit { display: block; font-size: 11px; color: var(--nb-text-muted); margin-top: 4px; }

    /* بطاقات التنقّل */
    .nav-tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 18px; }
    @media (max-width: 820px) { .nav-tiles { grid-template-columns: repeat(2, 1fr); } }
    .nav-tile { display: flex; align-items: center; gap: 10px; background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 13px 14px; cursor: pointer; font-family: inherit; text-align: start;
      transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease; }
    .nav-tile:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(48,63,159,0.1); border-color: var(--nb-primary-400); }
    .nav-tile:hover .nt-arrow { opacity: 1; transform: translateX(-3px); }
    .nt-ic { font-size: 18px; width: 34px; height: 34px; display: grid; place-items: center; flex: none;
      background: var(--nb-primary-50); border-radius: 10px; }
    .nt-label { flex: 1; font-size: 12.5px; font-weight: 700; color: var(--nb-text); }
    .nt-arrow { color: var(--nb-primary-600); font-size: 15px; opacity: 0; transition: all .15s ease; }

    /* الأعمدة */
    .cols { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
    @media (max-width: 960px) { .cols { grid-template-columns: 1fr; } }
    .card { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); overflow: hidden; }
    .card-head { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px 10px; }
    .card-head h3 { margin: 0; font-size: 14px; font-weight: 800; color: var(--nb-text); }
    .card-sub { font-size: 12px; color: var(--nb-text-muted); }
    .see-all { font-size: 12px; font-weight: 700; color: var(--nb-primary-600); cursor: pointer; }
    .see-all:hover { text-decoration: underline; }
    /* الصفوف القابلة للفتح */
    .row.link, .vendor.link { cursor: pointer; }
    .row.link:hover { background: var(--nb-primary-50); }
    .vendor.link:hover { background: var(--nb-primary-50); }
    .empty-cta { display: block; margin-top: 8px; font-size: 12.5px; font-weight: 700;
      color: var(--nb-primary-600); cursor: pointer; }
    .empty-cta:hover { text-decoration: underline; }

    .list { display: flex; flex-direction: column; }
    .list .row { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1fr; gap: 8px; align-items: center;
      padding: 10px 16px; font-size: 13px; color: var(--nb-text); border-top: 1px solid var(--nb-border-row, var(--nb-border-soft)); }
    .list .row.head { border-top: none; background: var(--nb-surface-raised); font-size: 11px; font-weight: 700; color: var(--nb-text-muted); }
    .list .row:not(.head):hover { background: var(--nb-surface-raised); }
    .ta-end { text-align: end; }
    .mono { font-variant-numeric: tabular-nums; font-weight: 600; }
    .muted { color: var(--nb-text-muted); }
    .strong { font-weight: 700; }
    .badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--nb-surface-raised); color: var(--nb-text-muted); }
    .badge[data-s="approved"] { background: #e0f2fe; color: #075985; }
    .badge[data-s="completed"] { background: #dcfce7; color: #166534; }
    .badge[data-s="rejected"] { background: #fee2e2; color: #991b1b; }
    .badge[data-s="pending_approval"] { background: #fef3c7; color: #92400e; }
    .badge[data-s="rfq_created"] { background: var(--nb-primary-50); color: var(--nb-primary-700); }

    .vendors { display: flex; flex-direction: column; }
    .vendor { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-top: 1px solid var(--nb-border-soft); }
    .vendor:first-child { border-top: none; }
    .v-ava { width: 38px; height: 38px; border-radius: 11px; flex: none; background: var(--nb-primary-50);
      color: var(--nb-primary-700); display: grid; place-items: center; font-weight: 800; font-size: 16px; }
    .v-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .v-info strong { font-size: 13.5px; font-weight: 700; color: var(--nb-text); }
    .v-meta { font-size: 11.5px; color: var(--nb-text-muted); }
    .v-rate { text-align: end; display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
    .stars { color: var(--nb-warning); font-size: 12px; letter-spacing: 1px; }
    .rnum { font-size: 11px; color: var(--nb-text-muted); font-weight: 700; }

    .empty { padding: 26px 16px; text-align: center; font-size: 13px; color: var(--nb-text-muted); }
  `]
})
export class ProcurementDashboardComponent implements OnInit {
  private svc = inject(ProcurementService);
  private router = inject(Router);

  go(route: string) { this.router.navigateByUrl(route); }

  /** فتح استمارة الطلب مباشرة من اللوحة. */
  openRequest(r: any) { this.router.navigate(['/procurement/requests', r.id]); }

  /** فتح سجل الموردين مع تمرير اسم المورّد للبحث. */
  openVendor(v: any) {
    this.router.navigate(['/procurement/vendors'], { queryParams: { q: v.name_ar || v.name_en || '' } });
  }

  readonly stats = this.svc.stats;
  readonly requests = signal<any[]>([]);
  readonly vendors = signal<any[]>([]);

  readonly navTiles = [
    { label: 'طلبات الشراء', icon: '📝', route: '/procurement/requests' },
    { label: 'عروض الأسعار', icon: '📨', route: '/procurement/rfqs' },
    { label: 'أوامر الشراء', icon: '📦', route: '/procurement/orders' },
    { label: 'الموردون', icon: '🏭', route: '/procurement/vendors' },
    { label: 'العقود', icon: '📄', route: '/procurement/contracts' },
  ];

  readonly stages: Stage[] = [
    { key: 'req', label: 'طلبات الشراء', icon: '📝', countKey: 'open_requests', hint: 'واردة من الأقسام', route: '/procurement/requests' },
    { key: 'rfq', label: 'عروض الأسعار', icon: '📨', countKey: 'active_rfqs', hint: 'مُرسلة للموردين', route: '/procurement/rfqs' },
    { key: 'po', label: 'أوامر الشراء', icon: '📦', countKey: 'active_pos', hint: 'صادرة ونشطة', route: '/procurement/orders' },
    { key: 'contract', label: 'العقود', icon: '📄', countKey: 'active_contracts', hint: 'اتفاقيات سارية', route: '/procurement/contracts' },
  ];

  readonly savingsRate = computed(() => {
    const spent = this.stat('total_spent');
    const savings = this.stat('savings');
    const base = spent + savings;
    return base > 0 ? (savings / base) * 100 : 0;
  });

  readonly topVendors = computed(() =>
    [...this.vendors()].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)).slice(0, 6));

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.svc.getDashboardStats().subscribe();
    this.svc.getPurchaseRequests().subscribe(d => this.requests.set(this.asList(d)));
    this.svc.getVendors().subscribe(d => this.vendors.set(this.asList(d)));
  }

  private asList(d: any): any[] {
    return Array.isArray(d) ? d : (d?.data ?? d?.results ?? []);
  }

  stat(key: string): number {
    const s: any = this.stats();
    return s ? Number(s[key]) || 0 : 0;
  }

  fmt(v: any): string {
    return (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  initial(name: string): string { return (name || '؟').trim().charAt(0); }

  stars(rating: any): string {
    const r = Math.round(Number(rating) || 0);
    return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r);
  }

  vendorStatus(status: string): string {
    const map: Record<string, string> = {
      approved: 'معتمد ونشط', blacklisted: 'قائمة سوداء', pending: 'تحت الاعتماد',
    };
    return map[status] || status || '—';
  }

  statusText(status: string): string {
    const map: Record<string, string> = {
      draft: 'مسودة', pending_approval: 'تحت المراجعة', approved: 'معتمد للشراء',
      rejected: 'مرفوض', rfq_created: 'أُنشئ RFQ', completed: 'مكتمل',
    };
    return map[status] || status || '—';
  }
}
