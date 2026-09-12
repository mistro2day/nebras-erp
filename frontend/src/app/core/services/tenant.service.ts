import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface TenantInfo {
  id: string;
  name: string;
  nameAr: string;
  nameEn?: string;
  schoolNameAr?: string;
  schoolNameEn?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  stampUrl?: string;
  phone?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  subdomain?: string;
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

    // 1. فحص عناوين IP المباشرة (مثل 127.0.0.1 أو 192.168.x.x)
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (isIp) {
      this.isDevHost.set(true);
      this.surface.set('public');
      this.subdomain.set(null);
      return;
    }

    // 2. فحص نطاقات التطوير (localhost ومشتقاتها)
    if (host === 'localhost') {
      this.isDevHost.set(true);
      this.surface.set('public');
      this.subdomain.set(null);
      return;
    }

    if (host.endsWith('.localhost')) {
      this.isDevHost.set(true);
      const sub = host.replace('.localhost', '');
      if (sub && !RESERVED_SUBDOMAINS.includes(sub)) {
        this.surface.set('tenant');
        this.subdomain.set(sub);
      } else {
        this.surface.set('public');
        this.subdomain.set(null);
      }
      return;
    }

    // 3. نطاقات الاستضافة السحابية التجريبية (Vercel / Render / Ngrok)
    const isCloudDev = DEV_HOST_SUFFIXES.some(s => host.endsWith(s));
    if (isCloudDev) {
      this.isDevHost.set(true);
      const parts = host.split('.');
      if (parts[0].startsWith('nebras-erp') || RESERVED_SUBDOMAINS.includes(parts[0])) {
        this.surface.set('public');
        this.subdomain.set(null);
        return;
      }
      if (parts.length >= 4) {
        this.surface.set('tenant');
        this.subdomain.set(parts[0]);
        return;
      }
      this.surface.set('public');
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
    // نطاق فرعي لمدرسة: almawred.nebras.com
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
    const stored = this.readStored();
    if (stored) {
      this.currentTenant.set(stored);
      this.applyBranding(stored);
    }

    // جلب بيانات المستأجر الحقيقية والاسم الفعلي من الخادم لتحديث أي بيانات قديمة
    this.resolveTenantFromHost();
  }

  /** يجلب المستأجر الحالي والاسم الحقيقي وبيانات التواصل من الخادم. */
  resolveTenantFromHost(): void {
    const base = (environment.apiUrl || '/api/v1/').replace(/\/?$/, '/');
    this.http.get<any>(`${base}tenants/branding/current/`).subscribe({
      next: (res) => {
        const d = res?.data ?? res;
        if (!d?.id) return;
        const tenant: TenantInfo = {
          id: d.id,
          name: d.name || d.name_en || d.name_ar || 'Al-Mawred',
          nameAr: d.name_ar || d.school_name_ar || d.name || 'مدارس المورد النموذجية الخاصة',
          nameEn: d.name_en || d.school_name_en || 'Al-Mawred Model Private Schools',
          schoolNameAr: d.school_name_ar || d.name_ar || d.name || 'مدارس المورد النموذجية الخاصة',
          schoolNameEn: d.school_name_en || d.name_en || 'Al-Mawred Model Private Schools',
          primaryColor: d.primary_color || '#1e3a8a',
          secondaryColor: d.secondary_color || '#10b981',
          logoUrl: d.logo_url || d.logo || '',
          stampUrl: d.stamp_url || d.stamp || '',
          phone: d.phone || d.phone_number || '09123456789',
          phoneNumber: d.phone_number || d.phone || '09123456789',
          email: d.email || 'accounts@almawred.edu.sd',
          address: d.address || 'جمهورية السودان — ولاية الخرطوم — الرياض — شارع 15',
          subdomain: d.subdomain || 'almawred',
        };
        this.setTenant(tenant);
      },
      error: () => {
        // النطاق الفرعي غير معروف
      },
    });
  }

  refreshCurrentTenant(): void {
    this.resolveTenantFromHost();
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
