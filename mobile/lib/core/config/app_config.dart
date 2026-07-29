import 'package:flutter/foundation.dart' show kIsWeb;

/// إعدادات التطبيق العامّة (قابلة للتهيئة حسب البيئة).
class AppConfig {
  AppConfig._();

  /// القيمة المُمرَّرة عند البناء (إن وُجدت):
  /// --dart-define=API_BASE_URL=https://api.example.com/api/v1
  static const String _envBase = String.fromEnvironment('API_BASE_URL');

  /// عنوان الـ API الأساسي. إن لم يُمرَّر عبر البيئة، يُختار تلقائياً:
  /// - الويب/سطح المكتب: 127.0.0.1 (نفس الجهاز).
  /// - محاكي Android: 10.0.2.2 يشير إلى localhost الجهاز المضيف.
  static String get apiBaseUrl {
    if (_envBase.isNotEmpty) return _envBase;
    return kIsWeb ? 'http://127.0.0.1:8000/api/v1' : 'http://10.0.2.2:8000/api/v1';
  }

  /// معرّف المستأجر الافتراضي (مدرسة نبراس) — يُستخدم عند تشغيل خادم مستأجر واحد.
  /// في الإنتاج متعدّد المستأجرين يُحدَّد من حساب المستخدم عند الدخول.
  static const String defaultTenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'b943665a-19ff-4ef3-9c24-221cf4057a55',
  );

  static const Duration connectTimeout = Duration(seconds: 20);
  static const Duration receiveTimeout = Duration(seconds: 20);
}
