import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { PlatformService } from '../platform.service';
import { SaasBillingService } from '../../saas-billing/saas-billing.service';

/** إدارة المستأجرين (المدارس المشتركة) — شاشة مالك المنصّة. */
@Component({
  selector: 'app-platform-tenants',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة المستأجرين"
        subtitle="المدارس والمؤسسات المشتركة في منصّة نبراس — الحسابات، الاشتراكات، والتفعيل.">
        <button class="btn primary" (click)="openNew()">+ مستأجر جديد</button>
      </nb-page-header>

      <div class="tabs">
        <button [class.on]="tab() === 'tenants'" (click)="tab.set('tenants')">المستأجرون</button>
        <button [class.on]="tab() === 'requests'" (click)="tab.set('requests')">
          طلبات الانضمام
          @if (pendingRequests() > 0) { <span class="tab-badge">{{ pendingRequests() }}</span> }
        </button>
      </div>

      @if (tab() === 'requests') {
        <div class="scroll-x">
          <table class="data">
            <thead><tr>
              <th>المدرسة</th><th>النطاق المطلوب</th><th>المسؤول</th><th>البريد</th>
              <th>الباقة</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>
              @for (r of requests(); track r.id) {
                <tr>
                  <td class="name">{{ r.school_name }}</td>
                  <td class="mono">{{ r.subdomain }}.nebras.com</td>
                  <td>{{ r.contact_name || '—' }}</td>
                  <td>{{ r.email }}</td>
                  <td>{{ r.plan_name || '—' }}</td>
                  <td><span class="chip" [class]="'sg-' + r.status">{{ r.status_display }}</span></td>
                  <td class="acts">
                    @if (r.status === 'pending') {
                      <button class="btn primary xs" (click)="approveReq(r)">اعتماد وإنشاء</button>
                      <button class="btn ghost xs" (click)="rejectReq(r)">رفض</button>
                    } @else if (r.created_tenant_subdomain) {
                      <span class="mono done">{{ r.created_tenant_subdomain }}</span>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="7" class="muted">لا توجد طلبات انضمام.</td></tr> }
            </tbody>
          </table>
        </div>
      } @else {

      <div class="stat-row">
        <div class="stat"><span class="s-val">{{ tenants().length }}</span><span class="s-lbl">إجمالي المستأجرين</span></div>
        <div class="stat ok"><span class="s-val">{{ activeCount() }}</span><span class="s-lbl">نشط</span></div>
        <div class="stat"><span class="s-val">{{ subscribedCount() }}</span><span class="s-lbl">لديه اشتراك</span></div>
      </div>

      @if (loading()) {
        <div class="empty">جارٍ التحميل…</div>
      } @else {
        <div class="scroll-x">
          <table class="data">
            <thead><tr>
              <th>المدرسة</th><th>النطاق الفرعي</th><th>البريد</th><th>الاشتراك</th>
              <th>حالة الاشتراك</th><th>الحالة</th><th>إجراءات</th>
            </tr></thead>
            <tbody>
              @for (t of rows(); track t.id) {
                <tr>
                  <td class="name">{{ t.name_ar || t.name }}</td>
                  <td class="mono">{{ t.subdomain }}</td>
                  <td>{{ t.email || '—' }}</td>
                  <td>{{ t.sub?.plan_name || '—' }}</td>
                  <td>
                    @if (t.sub) { <span class="chip" [class]="'st-' + t.sub.status">{{ t.sub.status_display }}</span> }
                    @else { <span class="chip muted-chip">بلا اشتراك</span> }
                  </td>
                  <td><span class="chip" [class.on]="t.is_active">{{ t.is_active ? 'نشط' : 'معطّل' }}</span></td>
                  <td class="acts">
                    <button class="btn ghost xs" (click)="openEdit(t)">تعديل</button>
                    @if (t.sub) {
                      <button class="btn ghost xs" (click)="goBilling(t)">الفوترة</button>
                    } @else {
                      <button class="btn primary xs" (click)="openProvision(t)">تفعيل اشتراك</button>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="7" class="muted">لا يوجد مستأجرون.</td></tr> }
            </tbody>
          </table>
        </div>
      }
      }

      <!-- مودال المستأجر -->
      @if (editing()) {
        <div class="overlay" (click)="editing.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>{{ form.id ? 'تعديل المستأجر' : 'مستأجر جديد' }}</h3>
            <div class="fields">
              <label>اسم المدرسة<input [(ngModel)]="form.name_ar" placeholder="مثال: مدارس المورد النموذجية" /></label>
              <div class="grid2">
                <label>النطاق الفرعي<input [(ngModel)]="form.subdomain" placeholder="al-mawrid" [disabled]="!!form.id" /></label>
                <label>البريد<input [(ngModel)]="form.email" /></label>
                <label>الهاتف<input [(ngModel)]="form.phone_number" /></label>
                <label class="chk"><input type="checkbox" [(ngModel)]="form.is_active" /> مستأجر نشط</label>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="editing.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving() || !form.name_ar || !form.subdomain" (click)="save()">
                {{ saving() ? 'جارٍ الحفظ…' : 'حفظ' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال تفعيل اشتراك -->
      @if (provisioning(); as t) {
        <div class="overlay" (click)="provisioning.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>تفعيل اشتراك — {{ t.name_ar || t.name }}</h3>
            <div class="fields">
              <label>الخطة
                <select [(ngModel)]="provForm.plan_id">
                  <option value="" disabled>اختر خطة…</option>
                  @for (p of plans(); track p.id) { <option [value]="p.id">{{ p.name_ar }} — {{ p.price | number:'1.0-0' }} {{ p.currency }}</option> }
                </select>
              </label>
              <label>أيام تجريبية (اختياري)<input type="number" [(ngModel)]="provForm.trial_days" min="0" /></label>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="provisioning.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving() || !provForm.plan_id" (click)="provision()">
                {{ saving() ? 'جارٍ التفعيل…' : 'تفعيل' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }
    .btn { height: 34px; padding: 0 14px; font-family: inherit; font-size: 12.5px; font-weight: 600; border-radius: var(--nb-radius); cursor: pointer; border: none; }
    .btn.xs { height: 26px; padding: 0 10px; font-size: 11.5px; }
    .btn.primary { background: var(--nb-primary-600); color: #fff; }
    .btn.ghost { background: var(--nb-surface-raised); border: 1px solid var(--nb-border); color: var(--nb-text); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .stat { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; position: relative; overflow: hidden; }
    .stat::before { content:''; position:absolute; inset-block:0; inset-inline-start:0; width:4px; background: var(--nb-primary-600); }
    .stat.ok::before { background: var(--nb-success); }
    .s-val { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .s-lbl { font-size: 12px; color: var(--nb-text-muted); font-weight: 600; }

    .scroll-x { overflow-x: auto; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    table.data { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    table.data th { background: var(--nb-primary-600); color: #fff; text-align: center; padding: 11px 12px; font-weight: 700; white-space: nowrap; }
    table.data td { text-align: center; padding: 10px 12px; border-bottom: 1px solid var(--nb-border-soft); white-space: nowrap; }
    table.data tbody tr:nth-child(even) { background: color-mix(in srgb, var(--nb-primary-600) 3%, transparent); }
    .name { font-weight: 700; }
    .mono { font-family: ui-monospace, monospace; direction: ltr; }
    .acts { display: flex; gap: 6px; justify-content: center; }
    .muted, .empty { color: var(--nb-text-muted); }
    .empty { text-align: center; padding: 30px; }

    .chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: var(--nb-bg); color: var(--nb-text-muted); }
    .chip.on { background: color-mix(in srgb, var(--nb-success) 14%, transparent); color: var(--nb-success); }
    .muted-chip { background: color-mix(in srgb, var(--nb-text-muted) 14%, transparent); }
    .st-active { background: color-mix(in srgb, var(--nb-success) 16%, transparent); color: var(--nb-success); }
    .st-trial { background: color-mix(in srgb, #2563eb 16%, transparent); color: #2563eb; }
    .st-past_due { background: color-mix(in srgb, var(--nb-danger) 16%, transparent); color: var(--nb-danger); }
    .st-suspended, .st-canceled, .st-expired { background: color-mix(in srgb, var(--nb-text-muted) 16%, transparent); color: var(--nb-text-muted); }
    .sg-approved { background: color-mix(in srgb, var(--nb-success) 16%, transparent); color: var(--nb-success); }
    .sg-pending { background: color-mix(in srgb, #d97706 16%, transparent); color: #d97706; }
    .sg-rejected { background: color-mix(in srgb, var(--nb-danger) 16%, transparent); color: var(--nb-danger); }
    .done { color: var(--nb-success); font-weight: 700; }

    .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--nb-border); margin: 4px 0 20px; }
    .tabs button { height: 38px; padding: 0 16px; border: none; background: transparent; color: var(--nb-text-muted); font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; border-bottom: 2px solid transparent; }
    .tabs button.on { color: var(--nb-primary-600); border-bottom-color: var(--nb-primary-600); }
    .tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; margin-inline-start: 6px; border-radius: 99px; background: var(--nb-danger); color: #fff; font-size: 11px; font-weight: 800; }

    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--nb-surface); border-radius: var(--nb-radius-card); padding: 22px; width: 100%; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,.25); }
    .modal h3 { margin: 0 0 12px; font-size: 16px; font-weight: 700; }
    .fields { display: flex; flex-direction: column; gap: 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fields label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 600; }
    .fields label.chk { flex-direction: row; align-items: center; gap: 8px; }
    .fields input:not([type=checkbox]), .fields select { height: 38px; border: 1px solid var(--nb-border); border-radius: var(--nb-radius); padding: 0 12px; font-family: inherit; font-size: 13px; background: var(--nb-surface); color: var(--nb-text); outline: none; }
    .fields input:focus, .fields select:focus { border-color: var(--nb-primary-500); }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
  `]
})
export class PlatformTenantsComponent implements OnInit {
  private svc = inject(PlatformService);
  private billing = inject(SaasBillingService);
  private notify = inject(NotificationService);
  private router = inject(Router);

  readonly tab = signal<'tenants' | 'requests'>('tenants');
  readonly tenants = signal<any[]>([]);
  readonly requests = signal<any[]>([]);
  readonly subsByTenant = signal<Record<string, any>>({});
  readonly plans = signal<any[]>([]);
  readonly loading = signal(true);
  readonly pendingRequests = computed(() => this.requests().filter(r => r.status === 'pending').length);
  readonly saving = signal(false);
  readonly editing = signal<any | null>(null);
  readonly provisioning = signal<any | null>(null);

  form: any = {};
  provForm: { plan_id: string; trial_days: number } = { plan_id: '', trial_days: 0 };

  readonly rows = computed(() => {
    const subs = this.subsByTenant();
    return this.tenants().map(t => ({ ...t, sub: subs[t.id] || null }));
  });
  readonly activeCount = computed(() => this.tenants().filter(t => t.is_active).length);
  readonly subscribedCount = computed(() => Object.keys(this.subsByTenant()).length);

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading.set(true);
    this.svc.getTenants().subscribe({
      next: (r) => { this.tenants.set(r?.data ?? r ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.billing.getSubscriptions().subscribe({
      next: (r) => {
        const map: Record<string, any> = {};
        for (const s of (r?.data ?? [])) { if (!map[s.tenant]) map[s.tenant] = s; }
        this.subsByTenant.set(map);
      },
    });
    this.billing.getPlans().subscribe({ next: (r) => this.plans.set(r?.data ?? []) });
    this.billing.getSignupRequests().subscribe({ next: (r) => this.requests.set(r?.data ?? []) });
  }

  approveReq(r: any): void {
    if (!confirm(`اعتماد طلب «${r.school_name}» وإنشاء نطاق ${r.subdomain}.nebras.com؟`)) return;
    this.billing.approveSignup(r.id).subscribe({
      next: (res) => { this.notify.success(res?.message || 'تم الاعتماد وإنشاء المستأجر.'); this.load(); },
      error: (e) => this.notify.error(e?.error?.message || 'تعذّر الاعتماد.'),
    });
  }
  rejectReq(r: any): void {
    const reason = prompt('سبب الرفض (اختياري):') ?? undefined;
    this.billing.rejectSignup(r.id, reason).subscribe({
      next: () => { this.notify.success('تم رفض الطلب.'); this.load(); },
      error: () => this.notify.error('تعذّر الرفض.'),
    });
  }

  openNew(): void { this.form = { name_ar: '', subdomain: '', email: '', phone_number: '', is_active: true }; this.editing.set({}); }
  openEdit(t: any): void { this.form = { ...t }; this.editing.set(t); }
  save(): void {
    this.saving.set(true);
    const body = { ...this.form, name: this.form.name_ar || this.form.name };
    const done = () => { this.saving.set(false); this.editing.set(null); this.load(); };
    const fail = () => { this.saving.set(false); this.notify.error('تعذّر حفظ المستأجر.'); };
    const req = this.form.id ? this.svc.updateTenant(this.form.id, body) : this.svc.createTenant(body);
    req.subscribe({ next: () => { this.notify.success('تم حفظ المستأجر.'); done(); }, error: fail });
  }

  openProvision(t: any): void { this.provForm = { plan_id: '', trial_days: 0 }; this.provisioning.set(t); }
  provision(): void {
    const t = this.provisioning();
    if (!t || !this.provForm.plan_id) return;
    this.saving.set(true);
    this.billing.provision({ tenant_id: t.id, plan_id: this.provForm.plan_id, trial_days: this.provForm.trial_days || 0 })
      .subscribe({
        next: () => { this.saving.set(false); this.provisioning.set(null); this.notify.success('تم تفعيل الاشتراك.'); this.load(); },
        error: () => { this.saving.set(false); this.notify.error('تعذّر تفعيل الاشتراك.'); },
      });
  }

  goBilling(t: any): void { this.router.navigate(['/saas-billing']); }
}
