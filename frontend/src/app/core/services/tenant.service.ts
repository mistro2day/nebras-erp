import { Injectable, signal } from '@angular/core';

export interface TenantInfo {
  id: string;
  name: string;
  nameAr: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  // استخدام Signals لإدارة حالة المستأجر النشط بكفاءة ومرونة
  currentTenant = signal<TenantInfo | null>(null);

  setTenant(tenant: TenantInfo) {
    this.currentTenant.set(tenant);
    // تحديث متغيرات CSS المخصصة للبراندينغ ديناميكياً
    document.documentElement.style.setProperty('--primary-color', tenant.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', tenant.secondaryColor);
  }

  clearTenant() {
    this.currentTenant.set(null);
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--secondary-color');
  }
}