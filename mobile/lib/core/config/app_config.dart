import 'package:flutter/foundation.dart' show kIsWeb;

/// إعدادات التطبيق العامّة (قابلة للتهيئة حسب البيئة).
class AppConfig {
  AppConfig._();

  /// القيمة المُمرَّرة عند البناء (إن وُجدت):
  /// --dart-define=API_BASE_URL=https://api.example.com/api/v1
  static const String _envBase = String.fromEnvironment('API_BASE_URL');

  /// عنوان الـ API الأساسي (خادم ريندر السحابي المباشر):
  static const String renderBaseUrl = 'https://nebras-erp-api-85v9.onrender.com/api/v1';

  static String get apiBaseUrl {
    if (_envBase.isNotEmpty) return _envBase;
    return renderBaseUrl;
  }

  /// معرّف المستأجر الافتراضي (مدرسة نبراس) — يُستخدم عند تشغيل خادم مستأجر واحد.
  /// في الإنتاج متعدّد المستأجرين يُحدَّد من حساب المستخدم عند الدخول.
  static const String defaultTenantId = String.fromEnvironment(
    'TENANT_ID',
    defaultValue: 'b943665a-19ff-4ef3-9c24-221cf4057a55',
  );

  static const Duration connectTimeout = Duration(seconds: 35);
  static const Duration receiveTimeout = Duration(seconds: 35);
}
