import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NbPageHeaderComponent } from '../../../shared/nebras/nb-page-header.component';
import { NotificationService } from '../../../core/services/notification.service';
import { TenantService } from '../../../core/services/tenant.service';
import { PlatformService } from '../platform.service';
import { SaasBillingService } from '../../saas-billing/saas-billing.service';

/** إدارة الحساب والمؤسسات التعليمية (المستأجرين) — شاشة الإدارة وضبط المدارس. */
@Component({
  selector: 'app-platform-tenants',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, NbPageHeaderComponent],
  template: `
    <div class="page" dir="rtl">
      <nb-page-header
        title="إدارة المستأجرين (منصة المالك)"
        subtitle="لوحة تحكم مالك المنصة والمطور — متابعة وإدارة المدارس المشتركة، مراجعة طلبات الانضمام، وإدارة اشتراكات SaaS.">
        <button class="btn primary" (click)="openNew()">+ إضافة مستأجر جديد</button>
      </nb-page-header>

      <div class="tabs">
        <button [class.on]="tab() === 'tenants'" (click)="tab.set('tenants')">قائمة المستأجرين</button>
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
                      <button class="btn primary xs" (click)="openApproveModal(r)">اعتماد وتفعيل أسبوع</button>
                      <button class="btn ghost xs btn-danger-txt" (click)="openRejectModal(r)">رفض</button>
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
        <div class="stat ok"><span class="s-val">{{ activeCount() }}</span><span class="s-lbl">مستأجر نشط</span></div>
        <div class="stat"><span class="s-val">{{ subscribedCount() }}</span><span class="s-lbl">لديه اشتراك سارٍ</span></div>
      </div>

      @if (loading()) {
        <div class="muted empty">جارٍ تحميل بيانات المؤسسات…</div>
      } @else {
        <div class="scroll-x">
          <table class="data">
            <thead><tr>
              <th>المدرسة / المؤسسة</th><th>النطاق الفرعي</th><th>البريد الإلكتروني</th>
              <th>باقة الاشتراك</th><th>حالة الاشتراك</th><th>الحالة</th><th>إجراءات</th>
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
                    <button class="btn primary xs" (click)="switchToTenant(t)" title="التبديل إلى لوحة هذه المدرسة">👁️ دخول المستأجر</button>
                    <button class="btn ghost xs" (click)="openEdit(t)">تعديل</button>
                    @if (t.sub) {
                      <button class="btn ghost xs" (click)="goBilling(t)">الفوترة</button>
                    } @else {
                      <button class="btn ghost xs" (click)="openProvision(t)">تفعيل اشتراك</button>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="7" class="muted">لا توجد مؤسسات مسجلة.</td></tr> }
            </tbody>
          </table>
        </div>
      }
      }

      <!-- مودال تعديل الحساب والمدرسة المصمم بأعلى معايير Nebras OS -->
      @if (editing()) {
        <div class="overlay" (click)="editing.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ form.id ? 'تعديل بيانات المدرسة والمستأجر' : 'تسجيل مدرسة / مستأجر جديد' }}</h3>
              <p class="modal-sub">تحديث البيانات الأساسية لحساب المدرسة والنطاق ومعلومات التواصل.</p>
            </div>
            <div class="fields">
              <div class="grid2">
                <label>
                  <span>اسم المدرسة (بالعربي) <b class="req">*</b></span>
                  <input type="text" [(ngModel)]="form.name_ar" placeholder="مثال: مدارس المورد الأهلية النموذجية" />
                </label>
                <label>
                  <span>اسم المدرسة (بالإنجليزي)</span>
                  <input type="text" [(ngModel)]="form.name_en" placeholder="Al-Mawrid Model Schools" />
                </label>
              </div>

              <div class="grid2">
                <label>
                  <span>النطاق الفرعي (Subdomain) <b class="req">*</b></span>
                  <input type="text" [(ngModel)]="form.subdomain" placeholder="al-mawrid" [disabled]="!!form.id" />
                </label>
                <label>
                  <span>البريد الإلكتروني</span>
                  <input type="email" [(ngModel)]="form.email" placeholder="admin@school.com" />
                </label>
              </div>

              <div class="grid2">
                <label>
                  <span>رقم الهاتف والتواصل</span>
                  <input type="tel" [(ngModel)]="form.phone_number" placeholder="09123456789" />
                </label>
                <label>
                  <span>العنوان والمدينة</span>
                  <input type="text" [(ngModel)]="form.address" placeholder="الخرطوم / الرياض" />
                </label>
              </div>

              <div class="chk-wrapper">
                <label class="chk">
                  <input type="checkbox" [(ngModel)]="form.is_active" />
                  <span>حساب نشط ومفعّل على المنصة</span>
                </label>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn ghost" (click)="editing.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving() || !form.name_ar || !form.subdomain" (click)="save()">
                {{ saving() ? 'جارٍ الحفظ…' : 'حفظ التعديلات' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال تفعيل اشتراك -->
      @if (provisioning(); as t) {
        <div class="overlay" (click)="provisioning.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>تفعيل اشتراك — {{ t.name_ar || t.name }}</h3>
              <p class="modal-sub">تعيين الباقة المعتمدة والفترة التجريبية لحساب المؤسسة.</p>
            </div>
            <div class="fields">
              <label>
                <span>الخطة / الباقة</span>
                <select [(ngModel)]="provForm.plan_id">
                  <option value="" disabled>اختر خطة…</option>
                  @for (p of plans(); track p.id) { <option [value]="p.id">{{ p.name_ar }} — {{ p.price | number:'1.0-0' }} {{ p.currency }}</option> }
                </select>
              </label>
              <label>
                <span>أيام تجريبية (اختياري)</span>
                <input type="number" [(ngModel)]="provForm.trial_days" min="0" />
              </label>
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

      <!-- مودال اعتماد وتفعيل أسبوع تجريبي لمدرسة -->
      @if (approvingReq(); as r) {
        <div class="overlay" (click)="approvingReq.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>اعتماد وتفعيل مدرسة — {{ r.school_name }}</h3>
              <p class="modal-sub">سيتم إنشاء حساب المستأجر، الفرع الرئيسي، الأدوار النظامية، وحساب المدير تلقائياً.</p>
            </div>
            <div class="fields">
              <div class="grid2">
                <label>
                  <span>اسم المدرسة</span>
                  <input type="text" [value]="r.school_name" disabled />
                </label>
                <label>
                  <span>النطاق الفرعي المخصص</span>
                  <input type="text" [value]="r.subdomain + '.nebras.sd'" disabled />
                </label>
              </div>
              <div class="grid2">
                <label>
                  <span>اسم المسؤول / المدير</span>
                  <input type="text" [value]="r.contact_name || '—'" disabled />
                </label>
                <label>
                  <span>البريد الإلكتروني</span>
                  <input type="text" [value]="r.email" disabled />
                </label>
              </div>
              <label>
                <span>مدة الفترة التجريبية المجانية</span>
                <select [(ngModel)]="approvalTrialDays">
                  <option [value]="7">أسبوع واحد (7 أيام) — الخيار القياسي للتجربة</option>
                  <option [value]="14">أسبوعين (14 يوماً)</option>
                  <option [value]="30">شهر كامل (30 يوماً)</option>
                </select>
              </label>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="approvingReq.set(null)">إلغاء</button>
              <button class="btn primary" [disabled]="saving()" (click)="confirmApprove(r)">
                {{ saving() ? 'جارٍ التهيئة والاعتماد…' : 'تأكيد الاعتماد وتفعيل المدرسة' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- مودال رفض الطلب المخصص -->
      @if (rejectingReq(); as r) {
        <div class="overlay" (click)="rejectingReq.set(null)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>رفض طلب الانضمام — {{ r.school_name }}</h3>
              <p class="modal-sub">يمكنك توضيح سبب الرفض لتسجيله في المنظومة.</p>
            </div>
            <div class="fields">
              <label>
                <span>سبب الرفض (اختياري)</span>
                <input type="text" [(ngModel)]="rejectionReason" placeholder="اكتب سبب الرفض إن وُجد..." />
              </label>
            </div>
            <div class="modal-actions">
              <button class="btn ghost" (click)="rejectingReq.set(null)">تراجع</button>
              <button class="btn ghost btn-danger-txt" [disabled]="saving()" (click)="confirmReject(r)">
                {{ saving() ? 'جارٍ الرفض…' : 'تأكيد رفض الطلب' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { flex: 1; padding: 22px; overflow-y: auto; background: var(--nb-bg); color: var(--nb-text); font-family: var(--nb-font-family); }
    .btn { height: 36px; padding: 0 16px; font-family: inherit; font-size: 13px; font-weight: 700; border-radius: var(--nb-radius, 8px); cursor: pointer; border: none; transition: all 0.2s ease; }
    .btn.xs { height: 28px; padding: 0 12px; font-size: 12px; }
    .btn.primary { background: var(--nb-primary-600, #0284c7); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--nb-primary-700, #0369a1); }
    .btn.ghost { background: var(--nb-surface-raised, #f8fafc); border: 1px solid var(--nb-border, #cbd5e1); color: var(--nb-text, #0f172a); }
    .btn.ghost:hover { background: var(--nb-border-soft, #e2e8f0); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }

    .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 22px; }
    .stat { background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; position: relative; overflow: hidden; }
    .stat::before { content:''; position:absolute; inset-block:0; inset-inline-start:0; width:4px; background: var(--nb-primary-600); }
    .stat.ok::before { background: var(--nb-success); }
    .s-val { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .s-lbl { font-size: 12.5px; color: var(--nb-text-muted); font-weight: 600; }

    .scroll-x { overflow-x: auto; background: var(--nb-surface); border: 1px solid var(--nb-border); border-radius: var(--nb-radius-card); }
    table.data { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    table.data th { background: var(--nb-primary-600); color: #fff; text-align: start; padding: 11px 14px; font-weight: 700; white-space: nowrap; }
    table.data td { text-align: start; padding: 11px 14px; border-bottom: 1px solid var(--nb-border-soft); white-space: nowrap; }
    table.data tbody tr:nth-child(even) { background: color-mix(in srgb, var(--nb-primary-600) 3%, transparent); }
    .name { font-weight: 700; color: var(--nb-text); }
    .mono { font-family: ui-monospace, monospace; direction: ltr; text-align: start; }
    .acts { display: flex; gap: 6px; }
    .muted, .empty { color: var(--nb-text-muted); }
    .empty { text-align: center; padding: 36px; }

    .chip { font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: var(--nb-bg); color: var(--nb-text-muted); }
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

    .tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--nb-border); margin: 4px 0 20px; }
    .tabs button { height: 40px; padding: 0 18px; border: none; background: transparent; color: var(--nb-text-muted); font-family: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; border-bottom: 2px solid transparent; }
    .tabs button.on { color: var(--nb-primary-600); border-bottom-color: var(--nb-primary-600); }
    .tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; margin-inline-start: 6px; border-radius: 99px; background: var(--nb-danger); color: #fff; font-size: 11px; font-weight: 800; }

    /* المودال */
    .overlay { position: fixed; inset: 0; background: rgba(15,23,42,.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 20px; }
    .modal { background: var(--nb-surface, #ffffff); border: 1px solid var(--nb-border, #cbd5e1); border-radius: 14px; padding: 26px; width: 100%; max-width: 580px; box-shadow: 0 24px 48px rgba(0,0,0,.2); box-sizing: border-box; }
    .modal-header { margin-bottom: 18px; border-bottom: 1px solid var(--nb-border-soft, #e2e8f0); padding-bottom: 12px; }
    .modal-header h3 { margin: 0 0 4px; font-size: 17px; font-weight: 800; color: var(--nb-text, #0f172a); }
    .modal-sub { margin: 0; font-size: 12px; color: var(--nb-text-muted, #64748b); }

    .fields { display: flex; flex-direction: column; gap: 14px; box-sizing: border-box; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
    
    .fields label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: var(--nb-text, #334155); min-width: 0; }
    .fields label .req { color: #dc2626; }
    .fields input:not([type=checkbox]), .fields select { width: 100%; height: 40px; border: 1.5px solid var(--nb-border, #cbd5e1); border-radius: 8px; padding: 0 12px; font-family: inherit; font-size: 13px; background: var(--nb-surface, #ffffff); color: var(--nb-text, #0f172a); outline: none; box-sizing: border-box; transition: all 0.2s ease; }
    .fields input:focus, .fields select:focus { border-color: var(--nb-primary-500, #0284c7); box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
    .fields input:disabled { background: var(--nb-surface-raised, #f1f5f9); color: var(--nb-text-muted, #94a3b8); cursor: not-allowed; }

    .chk-wrapper { padding: 4px 0; }
    .fields label.chk { flex-direction: row; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: var(--nb-text, #1e293b); }
    .fields label.chk input { width: 18px; height: 18px; accent-color: var(--nb-primary-600, #0284c7); cursor: pointer; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--nb-border-soft, #e2e8f0); }
  `]
})
export class PlatformTenantsComponent implements OnInit {
  private svc = inject(PlatformService);
  private billing = inject(SaasBillingService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private tenantService = inject(TenantService);

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

  readonly approvingReq = signal<any | null>(null);
  readonly rejectingReq = signal<any | null>(null);
  approvalTrialDays = 7;
  rejectionReason = '';

  openApproveModal(r: any): void {
    this.approvalTrialDays = 7;
    this.approvingReq.set(r);
  }

  confirmApprove(r: any): void {
    this.saving.set(true);
    this.billing.approveSignup(r.id, Number(this.approvalTrialDays) || 7).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.approvingReq.set(null);
        this.notify.success(res?.message || 'تم الاعتماد وتفعيل المدرسة بنجاح.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.error?.message || 'تعذّر الاعتماد.');
      },
    });
  }

  openRejectModal(r: any): void {
    this.rejectionReason = '';
    this.rejectingReq.set(r);
  }

  confirmReject(r: any): void {
    this.saving.set(true);
    this.billing.rejectSignup(r.id, this.rejectionReason || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.rejectingReq.set(null);
        this.notify.success('تم رفض الطلب.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.notify.error(e?.error?.message || 'تعذّر الرفض.');
      },
    });
  }

  openNew(): void { 
    this.form = { 
      name_ar: '', 
      name_en: '', 
      subdomain: '', 
      email: '', 
      phone_number: '', 
      address: '', 
      is_active: true 
    }; 
    this.editing.set({}); 
  }

  openEdit(t: any): void { 
    this.form = { 
      id: t.id,
      name_ar: t.name_ar || t.name || '',
      name_en: t.name_en || '',
      subdomain: t.subdomain || '',
      email: t.email || '',
      phone_number: t.phone_number || '',
      address: t.address || '',
      is_active: t.is_active !== false
    }; 
    this.editing.set(t); 
  }

  save(): void {
    if (!this.form.name_ar || !this.form.subdomain) return;
    this.saving.set(true);

    const body: any = {
      name: this.form.name_ar,
      name_ar: this.form.name_ar,
      name_en: this.form.name_en || '',
      subdomain: this.form.subdomain,
      email: this.form.email || '',
      phone_number: this.form.phone_number || '',
      address: this.form.address || '',
      is_active: this.form.is_active !== false,
    };

    const done = () => { 
      this.saving.set(false); 
      this.editing.set(null); 
      this.load(); 
    };

    const fail = (e: any) => { 
      this.saving.set(false); 
      const msg = e?.error?.message || e?.error?.detail || 'تعذّر حفظ بيانات المؤسسة.';
      this.notify.error(msg); 
    };

    const req = this.form.id 
      ? this.svc.updateTenant(this.form.id, body) 
      : this.svc.createTenant(body);

    req.subscribe({ 
      next: () => { 
        this.notify.success('تم حفظ بيانات المدرسة والمستأجر بنجاح.'); 
        done(); 
      }, 
      error: fail 
    });
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

  switchToTenant(t: any): void {
    const tenantInfo = {
      id: t.id,
      name: t.name_en || t.name || 'School',
      nameAr: t.name_ar || t.name || 'المدرسة',
      primaryColor: t.primary_color || '#3F51B5',
      secondaryColor: t.secondary_color || '#7A8093',
      logoUrl: t.logo_url,
    };
    this.tenantService.setTenant(tenantInfo);
    this.notify.success(`تم الانتقال للعمل على مستأجر: ${tenantInfo.nameAr}`);
    this.router.navigate(['/dashboard']).then(() => {
      window.location.reload();
    });
  }
}
