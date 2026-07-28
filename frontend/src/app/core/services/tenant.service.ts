import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TenantInfo {
  id: string;
  name: string;
  nameAr: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

/** السطح المُخدَّم بناءً على النطاق:
 *  public = الموقع العام لنبراس · admin = لوحة المالك · tenant = لوحة مدرسة. */
export type AppSurface = 'public' | 'admin' | 'tenant';

const TENANT_STORAGE_KEY = 'nb_tenant';

// نطاقات التطوير/الاستضافة التي لا تمثّل نطاق مستأجر فرعياً؛ عندها نعتمد
// المستأجر الافتراضي (وضع المدرسة الواحدة) بدل استخراج subdomain.
const DEV_HOST_SUFFIXES = ['localhost', '.local', '.onrender.com', '.vercel.app', '.ngrok.io'];
// نطاقات فرعية محجوزة لا تمثّل مدرسة.
const RESERVED_SUBDOMAINS = ['www', 'app', 'admin', 'api', 'portal'];

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  // استخدام Signals لإدارة حالة المستأجر والفرع النشط (بنين / بنات / الكل)
  private http = inject(HttpClient);

  currentTenant = signal<TenantInfo | null>(null);
  activeBranch = signal<'all' | 'boys' | 'girls'>('all');

  // السطح ونطاق المستأجر الفرعي المُستخرَجان من عنوان المتصفّح
  surface = signal<AppSurface>('tenant');
  subdomain = signal<string | null>(null);
  isDevHost = signal(false);

  isPublicSite = () => this.surface() === 'public';
  isAdminSite = () => this.surface() === 'admin';
  isTenantSite = () => this.surface() === 'tenant';

  /** منطقة المالك (إدارة المستأجرين/الفوترة/المنصّة): تظهر على سطح admin فقط،
   *  وتبقى ظاهرة في التطوير المحلّي (localhost) لتيسير الاختبار. */
  showOwnerArea = () => this.isAdminSite() || this.isDevHost();

  constructor() {
    this.resolveSurface(window.location.hostname);
    this.bootstrap();
  }

  /** يحدّد السطح (public/admin/tenant) و subdomain من اسم المضيف. */
  private resolveSurface(hostname: string): void {
    const host = (hostname || '').split(':')[0].toLowerCase();

    // نطاقات التطوير/الاستضافة أو IP: سطح مستأجر بلا نطاق فرعي (مدرسة واحدة افتراضية)
    const isDevHost = DEV_HOST_SUFFIXES.some(s => host === s || host.endsWith(s));
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (isDevHost || isIp) {
      this.isDevHost.set(true);
      this.surface.set('tenant');
      this.subdomain.set(null);
      return;
    }

    const parts = host.split('.');
    const first = parts[0];

    // النطاق الجذر (nebras.com) أو www → الموقع العام
    if (parts.length <= 2 || first === 'www') {
      this.surface.set('public');
      this.subdomain.set(null);
      return;
    }
    if (first === 'admin') {
      this.surface.set('admin');
      this.subdomain.set(null);
      return;
    }
    if (RESERVED_SUBDOMAINS.includes(first)) {
      this.surface.set('public');
      this.subdomain.set(null);
      return;
    }
    // نطاق فرعي لمدرسة: al-mawrid.nebras.com
    this.surface.set('tenant');
    this.subdomain.set(first);
  }

  /**
   * تهيئة المستأجر عند إقلاع التطبيق:
   * 1) من التخزين المحلي إن وُجد اختيار سابق.
   * 2) وإلا من المستأجر الافتراضي المُعرّف في البيئة (وضع التطوير فقط).
   * بدون هذه التهيئة لا يُرسَل رأس X-Tenant-ID فيرفض الخادم الطلب (404).
   */
  private bootstrap(): void {
    // الموقع العام ولوحة المالك لا يحتاجان مستأجراً محدّداً
    if (this.surface() === 'public' || this.surface() === 'admin') {
      return;
    }

    const stored = this.readStored();
    // على نطاق فرعي لمدرسة: إن كان المخزَّن لا يطابق النطاق، نتجاهله ونجلب من الخادم
    if (stored && !this.subdomain()) {
      this.currentTenant.set(stored);
      this.applyBranding(stored);
      return;
    }

    // نطاق فرعي لمدرسة: نجلب المستأجر من الخادم (يحلّه الميدلوير عبر Host تلقائياً)
    if (this.subdomain()) {
      this.resolveTenantFromHost();
      return;
    }

    if (stored) {
      this.currentTenant.set(stored);
      this.applyBranding(stored);
      return;
    }

    const defaultId = (environment as any).defaultTenantId as string | undefined;
    if (defaultId) {
      const tenant: TenantInfo = {
        id: defaultId,
        name: (environment as any).defaultTenantName || 'Nebras',
        nameAr: (environment as any).defaultTenantName || 'نبراس ERP',
        primaryColor: '#3F51B5',
        secondaryColor: '#7A8093',
      };
      this.currentTenant.set(tenant);
      this.applyBranding(tenant);
    }
  }

  /** يجلب المستأجر الحالي من الخادم اعتماداً على النطاق الفرعي في الطلب (Host). */
  private resolveTenantFromHost(): void {
    const base = (environment.apiUrl || '/api/v1/').replace(/\/?$/, '/');
    this.http.get<any>(`${base}tenants/branding/current/`).subscribe({
      next: (res) => {
        const d = res?.data ?? res;
        if (!d?.id) return;
        const tenant: TenantInfo = {
          id: d.id,
          name: d.name || d.name_en || 'Nebras',
          nameAr: d.name_ar || d.name || 'نبراس',
          primaryColor: d.primary_color || '#3F51B5',
          secondaryColor: d.secondary_color || '#7A8093',
          logoUrl: d.logo_url,
        };
        this.setTenant(tenant);
      },
      error: () => {
        // النطاق الفرعي غير معروف: نبقى بلا مستأجر (تتكفّل الحُرّاس بإعادة التوجيه)
      },
    });
  }

  setTenant(tenant: TenantInfo) {
    this.currentTenant.set(tenant);
    this.applyBranding(tenant);
    try {
      localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify(tenant));
    } catch {
      // تجاهل أخطاء التخزين المحلي (وضع التصفح الخاص مثلاً)
    }
  }

  setBranch(branch: 'all' | 'boys' | 'girls') {
    this.activeBranch.set(branch);
    try {
      localStorage.setItem('nb_active_branch', branch);
    } catch {}
  }

  clearTenant() {
    this.currentTenant.set(null);
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--secondary-color');
    try {
      localStorage.removeItem(TENANT_STORAGE_KEY);
    } catch {
      // تجاهل
    }
  }

  private applyBranding(tenant: TenantInfo): void {
    // تحديث متغيرات CSS المخصصة للبراندينغ ديناميكياً
    document.documentElement.style.setProperty('--primary-color', tenant.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', tenant.secondaryColor);
  }

  private readStored(): TenantInfo | null {
    try {
      const raw = localStorage.getItem(TENANT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as TenantInfo) : null;
    } catch {
      return null;
    }
  }
}
