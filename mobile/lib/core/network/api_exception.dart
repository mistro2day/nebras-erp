import 'package:dio/dio.dart';

/// خطأ API موحّد برسالة عربية جاهزة للعرض.
class ApiException implements Exception {
  ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;

  /// يحوّل خطأ Dio إلى رسالة عربية مفهومة، مع محاولة استخراج رسالة الخادم.
  factory ApiException.fromDio(DioException e) {
    final res = e.response;
    if (res != null) {
      final data = res.data;
      String? serverMsg;
      if (data is Map) {
        serverMsg = (data['message'] ?? data['detail'] ?? data['error'])?.toString();
        if (serverMsg == null && data['errors'] is Map) {
          final errors = data['errors'] as Map;
          if (errors.isNotEmpty) serverMsg = errors.values.first.toString();
        }
      }
      final code = res.statusCode;
      if (code == 401) return ApiException(serverMsg ?? 'بيانات الدخول غير صحيحة.', statusCode: code);
      if (code == 403) return ApiException(serverMsg ?? 'لا تملك صلاحية لهذا الإجراء.', statusCode: code);
      if (code == 404) return ApiException(serverMsg ?? 'العنصر المطلوب غير موجود.', statusCode: code);
      return ApiException(serverMsg ?? 'تعذّر إتمام الطلب (خطأ $code).', statusCode: code);
    }
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        return ApiException('انتهت مهلة الاتصال بالخادم. تحقّق من الشبكة.');
      case DioExceptionType.connectionError:
        return ApiException('تعذّر الاتصال بالخادم. تأكّد من اتصالك بالإنترنت.');
      default:
        return ApiException('حدث خطأ غير متوقّع. حاول مجدداً.');
    }
  }
}
