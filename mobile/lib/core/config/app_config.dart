/// إعدادات التطبيق العامّة (قابلة للتهيئة حسب البيئة).
class AppConfig {
  AppConfig._();

  /// عنوان الـ API الأساسي.
  /// - محاكي Android: 10.0.2.2 يشير إلى localhost الجهاز المضيف.
  /// - محاكي iOS / سطح المكتب: 127.0.0.1.
  /// يُمرَّر عند البناء عبر: --dart-define=API_BASE_URL=https://api.example.com/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api/v1',
  );

  /// معرّف المستأجر الافتراضي (مدرسة نبراس) — يُستخدم عند تشغيل خادم مستأجر واحد.
  /// في الإنتاج متعدّد المستأجرين يُحدَّد من حساب المستخدم عند الدخول.
  static const String defaultTenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'b943665a-19ff-4ef3-9c24-221cf4057a55',
  );

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 20);
}
