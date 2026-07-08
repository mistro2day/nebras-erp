export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api/v1/',
  defaultLanguage: 'ar',
  direction: 'rtl',
  // مستأجر التطوير الافتراضي — يُحقَن كـ X-Tenant-ID تلقائياً في وضع التطوير.
  // في الإنتاج يبقى فارغاً ويُحلّ المستأجر عبر النطاق الفرعي على الخادم.
  defaultTenantId: 'b943665a-19ff-4ef3-9c24-221cf4057a55',
  defaultTenantName: 'مجموعة مدارس النبراس الأهلية',
};
