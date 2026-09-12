/**
 * استخراج وهوية المستأجر الرسمية لترويسة وفوتر المطبوعات الرسمية (سندات، قيود، كشوفات، أوامر ومشتريات)
 * 
 * ثابت معماري حاسم لنظام نبراس (Nebras OS):
 * 1. المستأجر (المدرسة/المؤسسة المشتركة) هو صاحب الترويسة الرئيسية والشعار وأرقام الهواتف والعناوين الرسمية.
 * 2. يمنع منعاً باتاً وضع اسم "نظام نبراس" أو بيانات نبراس مكان المستأجر في الترويسة.
 * 3. تظهر "منظومة نبراس لإدارة المدارس (Nebras OS)" فقط في الفوتر السفلي كمنظومة تشغيل تقنية وحقوق برمجية.
 */

export interface TenantPrintBranding {
  schoolNameAr: string;
  schoolNameEn: string;
  logoUrl: string;
  stampUrl: string;
  phone: string;
  email: string;
  address: string;
}

export function getTenantPrintBranding(overrideInfo?: any): TenantPrintBranding {
  let stored: any = null;
  try {
    const raw = localStorage.getItem('nb_tenant');
    if (raw) stored = JSON.parse(raw);
  } catch {
    // تجاهل أخطاء التخزين المحلي
  }

  const info = overrideInfo || stored || {};

  // استخراج الاسم العربي الصريح للمستأجر
  let schoolNameAr =
    info.schoolNameAr ||
    info.school_name_ar ||
    info.nameAr ||
    info.name_ar ||
    info.name;

  // منع أي ظهور لاسم نبراس كاسم مستأجر في الترويسة
  if (!schoolNameAr || schoolNameAr.includes('نبراس') || schoolNameAr.toLowerCase().includes('nebras')) {
    schoolNameAr = 'مدارس المورد النموذجية الخاصة';
  }

  // الاسم الإنجليزي للمستأجر
  let schoolNameEn =
    info.schoolNameEn ||
    info.school_name_en ||
    info.nameEn ||
    info.name_en;

  if (!schoolNameEn || schoolNameEn.toLowerCase().includes('nebras')) {
    schoolNameEn = 'Al-Mawred Model Private Schools';
  }

  // الشعار والختم
  const logoUrl =
    info.logoUrl ||
    info.logo_url ||
    info.logo ||
    '/assets/default_school_logo.png';

  const stampUrl =
    info.stampUrl ||
    info.stamp_url ||
    info.stamp ||
    '';

  // الهاتف المعتمد
  const phone =
    info.phone ||
    info.phoneNumber ||
    info.phone_number ||
    '09123456789';

  // البريد الإلكتروني المعتمد للمستأجر
  let email =
    info.email ||
    'accounts@almawred.edu.sd';

  if (email.includes('nebras-edu.sd') || email.includes('nebras.com')) {
    email = 'accounts@almawred.edu.sd';
  }

  // العنوان الجغرافي المعتمد للمستأجر في السودان
  let address =
    info.address ||
    'جمهورية السودان — ولاية الخرطوم — الرياض — شارع 15';

  return {
    schoolNameAr,
    schoolNameEn,
    logoUrl,
    stampUrl,
    phone,
    email,
    address,
  };
}
