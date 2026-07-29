import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/session_store.dart';
import 'api_exception.dart';

/// عميل HTTP موحّد (Dio) يحقن التوكن ومعرّف المستأجر تلقائياً، ويطبّع الأخطاء.
class ApiService {
  ApiService(this._session) {
    _dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      headers: {'Accept': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _session.readToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        final tenant = await _session.readTenant() ?? AppConfig.defaultTenantId;
        options.headers['X-Tenant-ID'] = tenant;
        handler.next(options);
      },
    ));
  }

  late final Dio _dio;
  final SessionStore _session;

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.get(path, queryParameters: query);
      return res.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<dynamic> post(String path, {dynamic data}) async {
    try {
      final res = await _dio.post(path, data: data);
      return res.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  /// تنزيل محتوى ثنائي (مثل PDF) مع حقن التوكن والمستأجر.
  Future<List<int>> getBytes(String path, {Map<String, dynamic>? query}) async {
    try {
      final res = await _dio.get<List<int>>(
        path,
        queryParameters: query,
        options: Options(responseType: ResponseType.bytes),
      );
      return res.data ?? <int>[];
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  Future<dynamic> postMultipart(String path, FormData form) async {
    try {
      final res = await _dio.post(path, data: form);
      return res.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}
