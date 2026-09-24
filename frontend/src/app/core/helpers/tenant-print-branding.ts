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
  stampFinanceUrl: string;
  stampAcademicUrl: string;
  phone: string;
  phones: string[];
  phonesFormatted: string;
  whatsapp: string;
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
    schoolNameAr = 'مدارس المورد الجديدة للتعليم الخاص الخاصة';
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

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  const toAbs = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    const clean = url.startsWith('/') ? url : `/${url}`;
    return origin ? `${origin}${clean}` : clean;
  };

  // الشعار والأختام الرسمية المعتمدة
  const rawLogo =
    info.logoUrl ||
    info.logo_url ||
    info.logo ||
    '/assets/branding/logo-dark.png';
  const logoUrl = toAbs(rawLogo === '/assets/default_school_logo.png' ? '/assets/branding/logo-dark.png' : rawLogo);

  // ختم الإدارة العامة (الرئيسي والافتراضي)
  const stampUrl = toAbs(
    info.stampUrl ||
    info.stamp_url ||
    info.stamp ||
    ''
  );

  // ختم الإدارة المالية والخزينة (منفصل تماماً عن ختم المدير العام)
  const stampFinanceUrl = toAbs(
    info.stampFinanceUrl ||
    info.stamp_finance_url ||
    info.stamp_finance ||
    ''
  );

  // ختم الشؤون الأكاديمية والمتابعة (منفصل تماماً عن ختم المدير العام)
  const stampAcademicUrl = toAbs(
    info.stampAcademicUrl ||
    info.stamp_academic_url ||
    info.stamp_academic ||
    ''
  );

  // الهواتف المعتمدة
  const defaultPhones = ['0123689814', '0110100504', '0110100505', '0110100506'];
  const phones: string[] = Array.isArray(info.phones) && info.phones.length > 0 ? info.phones : defaultPhones;
  const phonesFormatted = phones.join(' - ');

  // الواتساب
  const whatsapp = info.whatsapp || '0120397775';

  // الهاتف المعتمد المعروض في الترويسات الرسمية
  const phone = `${phonesFormatted} | واتساب: ${whatsapp}`;
  const primaryPhone = phones[0] || '0123689814';

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
    'جمهورية السودان — ولاية الخرطوم — أركويت — شارع الفردوس — مربع 54';

  return {
    schoolNameAr,
    schoolNameEn,
    logoUrl,
    stampUrl,
    stampFinanceUrl,
    stampAcademicUrl,
    phone,
    phones,
    phonesFormatted,
    whatsapp,
    email,
    address,
  };
}

/**
 * الحصول على ختم القسم المناسب للمستند الرسمي
 * @param branding بيانات الهوية والمطبوعات للمستأجر
 * @param dept نوع القسم: 'finance' للمالية | 'academic' للمتابعة والأكاديميات | 'general' للإدارة العامة والشهادات
 */
export function getDepartmentStamp(
  branding: TenantPrintBranding,
  dept: 'general' | 'finance' | 'academic' = 'general'
): string {
  if (!branding) return '';
  switch (dept) {
    case 'finance':
      return branding.stampFinanceUrl || '';
    case 'academic':
      return branding.stampAcademicUrl || '';
    case 'general':
    default:
      return branding.stampUrl || '';
  }
}
