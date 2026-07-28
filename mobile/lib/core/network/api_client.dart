import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String baseUrl = 'http://127.0.0.1:8000/api/v1';
  static String tenantId = '49260172-f08b-411a-b5c6-405d36fbc9e5'; // Default Tenant ID
  static String? authToken;

  static Map<String, String> get headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant-ID': tenantId,
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  static Future<Map<String, dynamic>> post(String path, Map<String, dynamic> data) async {
    final url = Uri.parse('$baseUrl$path');
    try {
      final response = await http.post(
        url,
        headers: headers,
        body: jsonEncode(data),
      );
      final responseData = jsonDecode(utf8.decode(response.bodyBytes));
      return responseData is Map<String, dynamic> ? responseData : {'data': responseData};
    } catch (e) {
      return {'success': false, 'message': 'خطأ في الاتصال بالسيرفر: $e'};
    }
  }

  static Future<Map<String, dynamic>> get(String path, {Map<String, String>? queryParams}) async {
    var uriStr = '$baseUrl$path';
    if (queryParams != null && queryParams.isNotEmpty) {
      final query = queryParams.entries.map((e) => '${e.key}=${Uri.encodeComponent(e.value)}').join('&');
      uriStr += '?$query';
    }
    final url = Uri.parse(uriStr);
    try {
      final response = await http.get(url, headers: headers);
      final responseData = jsonDecode(utf8.decode(response.bodyBytes));
      return responseData is Map<String, dynamic> ? responseData : {'data': responseData};
    } catch (e) {
      return {'success': false, 'message': 'خطأ في جلب البيانات: $e'};
    }
  }
}
