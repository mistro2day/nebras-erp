import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaintenanceService } from '../maintenance.service';
import { AssetsService } from '../../assets/assets.service';
import { AuthService } from '../../../core/auth/auth.service';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NbLoadingComponent } from '../../../shared/nebras/nb-loading.component';

/**
 * بلاغات الصيانة.
 *
 * التوقيع: الأولوية تحكم الترتيب لا التاريخ — بلاغ يوقف الدراسة يسبق
 * بلاغاً قديماً منخفض الأثر. البلاغ يُفتح على أصل بعينه، فيتراكم تاريخه
 * على سجل الأصل ويُظهر ما يتكرّر عطله.
 */
@Component({
  selector: 'app-maintenance-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent, NbLoadingComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header title="بلاغات الصيانة" subtitle="الأعطال المُبلَّغ عنها على الأصول، مرتّبة بالأولوية.">
        <button class="btn ghost" (click)="back()">رجوع للوحة</button>
        <button class="btn ghost" (click)="load()">تحديث</button>
        <button class="btn primary" (click)="openNew()">＋ بلاغ جديد</button>
      </nb-page-header>

      @if (showNew()) {
        <section class="form-card">
          <header class="fc-head">
            <h3>بلاغ صيانة جديد</h3>
            <button class="x" (click)="showNew.set(false)" aria-label="إغلاق">✕</button>
          </header>
          <div class="fc-body">
            <div class="fields">
              <label class="wide">
                <span>عنوان البلاغ <i>*</i></span>
                <input [(ngModel)]="form.title" placeholder="المكيف لا يبرّد في قاعة المعلمين" />
              </label>
              <label>
                <span>الأصل المتأثر <i>*</i></span>
                <select [(ngModel)]="form.asset">
                  <option value="">اختر…</option>
                  @for (a of assets(); track a.id) {
                    <option [value]="a.id">{{ a.name_ar }} ({{ a.asset_number }})</option>
                  }
                </select>
              </label>
              <label>
                <span>التصنيف <i>*</i></span>
                <select [(ngModel)]="form.category">
                  <option value="">اختر…</option>
                  @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>الأولوية <i>*</i></span>
                <select [(ngModel)]="form.priority">
                  <option value="">اختر…</option>
                  @for (p of priorities(); track p.id) { <option [value]="p.id">{{ p.name_ar }}</option> }
                </select>
              </label>
              <label>
                <span>نوع الصيانة <i>*</i></span>
                <select [(ngModel)]="form.type">
                  <option value="">اختر…</option>
                  @for (ty of types(); track ty.id) { <option [value]="ty.id">{{ ty.name_ar }}</option> }
                </select>
              </label>
              <label class="wide">
                <span>وصف العطل <i>*</i></span>
                <input [(ngModel)]="form.description" placeholder="ما الذي حدث ومتى" />
              </label>
            </div>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
          <footer class="fc-acts">
            <button class="btn ghost" (click)="showNew.set(false)">إلغاء</button>
            <button class="btn primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'جارٍ الرفع…' : 'رفع البلاغ' }}
            </button>
          </footer>
        </section>
      }

      <div class="chips">
        <button [class.on]="filter()===''" (click)="filter.set('')">الكل ({{ all().length }})</button>
        <button [class.on]="filter()==='submitted'" (click)="filter.set('submitted')">قيد المراجعة ({{ count('submitted') }})</button>
        <button [class.on]="filter()==='approved'" (click)="filter.set('approved')">مقبول ({{ count('approved') }})</button>
        <button [class.on]="filter()==='closed'" (click)="filter.set('closed')">مغلق ({{ count('closed') }})</button>
      </div>

      @if (loading()) {
        <nb-loading message="جارٍ تحميل البلاغات…"></nb-loading>
      } @else if (!filtered().length) {
        <div class="empty-card">لا توجد بلاغات مطابقة.</div>
      } @else {
        <section class="list">
          @for (r of filtered(); track r.id) {
            <article class="req" [class.urgent]="isUrgent(r)">
              <div class="r-main">
                <div class="r-title">
                  <strong>{{ r.title }}</strong>
                  <span class="r-num">{{ r.request_number }}</span>
                </div>
                <span class="r-asset">🏛️ {{ assetName(r.asset) }}</span>
                @if (r.description) { <span class="r-desc">{{ r.description }}</span> }
              </div>
              <div class="r-side">
                <span class="pri" [class.high]="isUrgent(r)">{{ priorityName(r.priority) }}</span>
                <span class="badge" [class]="r.status">{{ statusLabel(r.status) }}</span>
                @if (r.status === 'submitted') {
                  <button class="act" (click)="approve(r)">قبول البلاغ</button>
                } @else if (r.status === 'approved') {
                  <button class="act pri-btn" (click)="goWorkOrders()">إنشاء أمر عمل ‹</button>
                }
              </div>
            </article>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); font-family: var(--nb-font-family); }
    .btn { font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 14px;
      border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn:disabled { opacity: .55; cursor: default; }

    .chips { display: flex; gap: 6px; margin-bottom: 13px; flex-wrap: wrap; }
    .chips button { font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
      background: var(--nb-surface); border: 1px solid var(--nb-border); color: var(--nb-text-muted);
      border-radius: 20px; padding: 6px 14px; }
    .chips button.on { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .list { display: flex; flex-direction: column; gap: 10px; }
    .req { display: flex; gap: 16px; justify-content: space-between; flex-wrap: wrap;
      background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 14px 16px; }
    .req.urgent { border-inline-start: 4px solid #DC2626; }
    .r-main { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 220px; }
    .r-title { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; }
    .r-title strong { font-size: 14px; font-weight: 700; color: var(--nb-text); }
    .r-num { font-size: 11px; color: var(--nb-text-muted); font-family: ui-monospace, monospace; }
    .r-asset { font-size: 12px; color: var(--nb-text-muted); }
    .r-desc { font-size: 12px; color: var(--nb-text-muted); }
    .r-side { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }

    .pri { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 11px;
      background: var(--nb-surface-raised); color: var(--nb-text-muted); border: 1px solid var(--nb-border); }
    .pri.high { background: #fef2f2; color: #B91C1C; border-color: #fecaca; }
    .badge { font-size: 11px; font-weight: 700; border-radius: 20px; padding: 3px 11px; }
    .badge.submitted { background: #fffaf0; color: #B45309; }
    .badge.approved { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.in_progress { background: var(--nb-primary-50); color: var(--nb-primary-700); }
    .badge.completed, .badge.closed { background: #f0fdf4; color: #15803D; }
    .badge.rejected { background: #fef2f2; color: #B91C1C; }

    .act { border: 1px solid var(--nb-border); background: var(--nb-surface); border-radius: 8px;
      font-family: inherit; font-size: 11.5px; font-weight: 700; color: var(--nb-text);
      cursor: pointer; padding: 5px 12px; }
    .act:hover { border-color: var(--nb-primary-400); color: var(--nb-primary-700); }
    .act.pri-btn { background: var(--nb-primary-600); border-color: var(--nb-primary-600); color: #fff; }

    .form-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); overflow: hidden; margin-bottom: 14px; }
    .fc-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 18px;
      background: var(--nb-primary-50, #f5f6ff); border-bottom: 1px solid var(--nb-primary-100, #e3e6fb); }
    .fc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--nb-primary-800, #2a3178); }
    .x { border: none; background: none; font-size: 15px; color: var(--nb-text-muted); cursor: pointer; padding: 4px; }
    .fc-body { padding: 16px 18px; }
    .fc-acts { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px;
      background: var(--nb-surface-raised); border-top: 1px solid var(--nb-border); }

    .fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    @media (max-width: 900px) { .fields { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 560px) { .fields { grid-template-columns: 1fr; } }
    .fields .wide { grid-column: 1 / -1; }
    .fields label { display: grid; grid-template-rows: 18px auto; gap: 4px; }
    .fields label > span { font-size: 11.5px; font-weight: 700; color: var(--nb-text-muted); }
    .fields label i { color: #DC2626; font-style: normal; }
    .fields input, .fields select { height: 38px; padding: 0 11px; font-family: inherit; font-size: 13px;
      border: 1px solid var(--nb-border); border-radius: 8px; background: var(--nb-surface);
      color: var(--nb-text); width: 100%; box-sizing: border-box; }

    .err { margin: 12px 0 0; font-size: 12.5px; color: #B91C1C; background: #fef2f2;
      border: 1px solid #fecaca; border-radius: 8px; padding: 9px 12px; }
    .empty-card { background: var(--nb-surface); border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-card); padding: 30px; text-align: center;
      font-size: 13px; color: var(--nb-text-muted); }
  `],
})
export class MaintenanceRequestsComponent implements OnInit {
  private svc = inject(MaintenanceService);
  private assetsSvc = inject(AssetsService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showNew = signal(false);
  readonly filter = signal('');

  readonly all = signal<any[]>([]);
  readonly assets = signal<any[]>([]);
  readonly categories = signal<any[]>([]);
  readonly priorities = signal<any[]>([]);
  readonly types = signal<any[]>([]);

  form: any = { title: '', asset: '', category: '', priority: '', type: '', description: '' };

  /** الترتيب بالأولوية: ما يوقف الدراسة أولاً مهما كان تاريخه. */
  private priorityRank(id: string): number {
    const code: string = this.priorities().find((p) => p.id === id)?.code || '';
    const ranks: Record<string, number> = { EMERGENCY: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    return ranks[code] ?? 9;
  }

  readonly filtered = computed(() => {
    const f = this.filter();
    return this.all()
      .filter((r) => !f || r.status === f)
      .sort((a, b) => this.priorityRank(a.priority) - this.priorityRank(b.priority));
  });

  count(status: string): number { return this.all().filter((r) => r.status === status).length; }

  isUrgent(r: any): boolean { return this.priorityRank(r.priority) <= 1; }
  assetName(id: string): string {
    const a = this.assets().find((x) => x.id === id);
    return a ? `${a.name_ar} (${a.asset_number})` : '—';
  }
  priorityName(id: string): string {
    return this.priorities().find((p) => p.id === id)?.name_ar || '—';
  }
  statusLabel(s: string): string {
    return ({ submitted: 'قيد المراجعة', approved: 'مقبول', in_progress: 'جارٍ العمل',
      completed: 'منفَّذ', closed: 'مغلق', rejected: 'مرفوض' } as any)[s] || s;
  }

  openNew() {
    this.form = { title: '', asset: '', category: '', priority: '', type: '', description: '' };
    this.error.set('');
    this.showNew.set(true);
  }

  save() {
    const f = this.form;
    if (!f.title?.trim() || !f.asset || !f.category || !f.priority || !f.type || !f.description?.trim()) {
      this.error.set('كل الحقول المعلَّمة بنجمة مطلوبة، ومنها وصف العطل.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    // رقم البلاغ يولّده الخادم — لا يُرسل من هنا
    this.svc.createRequest({
      title: f.title.trim(),
      description: f.description.trim(),
      asset: f.asset,
      category: f.category,
      priority: f.priority,
      maint_type: f.type,
      reported_by_user_id: (this.auth.currentUser() as any)?.id,
      status: 'submitted',
    }).subscribe({
      next: () => { this.saving.set(false); this.showNew.set(false); this.load(); },
      error: (e: any) => {
        this.saving.set(false);
        const d = e?.details?.error ?? e?.details;
        this.error.set(typeof d === 'string' ? d : (e?.message || 'تعذّر رفع البلاغ.'));
      },
    });
  }

  approve(r: any) {
    this.svc.updateRequest(r.id, { status: 'approved' }).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const rows = (d: any) => (Array.isArray(d) ? d : (d?.data ?? d?.results ?? []));
    this.svc.getRequests().subscribe({
      next: (d) => { this.all.set(rows(d)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.assetsSvc.getAssets().subscribe({ next: (d) => this.assets.set(rows(d)), error: () => {} });
    this.svc.getCategories().subscribe({ next: (d) => this.categories.set(rows(d)), error: () => {} });
    this.svc.getPriorities().subscribe({ next: (d) => this.priorities.set(rows(d)), error: () => {} });
    this.svc.getTypes().subscribe({ next: (d) => this.types.set(rows(d)), error: () => {} });
  }

  goWorkOrders() { this.router.navigateByUrl('/maintenance/work-orders'); }
  back() { this.router.navigateByUrl('/maintenance/dashboard'); }
}
