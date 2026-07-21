import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface TenantInfo {
  id: string;
  name: string;
  nameAr: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

const TENANT_STORAGE_KEY = 'nb_tenant';

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  // استخدام Signals لإدارة حالة المستأجر والفرع النشط (بنين / بنات / الكل)
  currentTenant = signal<TenantInfo | null>(null);
  activeBranch = signal<'all' | 'boys' | 'girls'>('all');

  constructor() {
    this.bootstrap();
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
