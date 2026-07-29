import '../../../core/network/api_exception.dart';
import '../../../core/network/api_service.dart';
import '../domain/session.dart';

/// مستودع المصادقة — يتحدّث مع نقاط `identity` في الخادم.
class AuthRepository {
  AuthRepository(this._api);

  final ApiService _api;

  /// تسجيل الدخول: يُرجع (التوكن، بيانات المستخدم، الدور).
  Future<({String token, Map<String, dynamic> user, UserRole role})> login(
      String email, String password) async {
    final res = await _api.post('/identity/login/', data: {
      'email': email,
      'password': password,
      'device_id': 'MOB-FLUTTER-APP',
      'device_name': 'Nebras Mobile',
    });

    // StandardResponse: { success, message, data: { access, user, permissions } }
    final data = (res is Map && res['data'] is Map) ? res['data'] as Map : res as Map;
    final token = data['access']?.toString();
    final user = (data['user'] as Map?)?.cast<String, dynamic>();
    if (token == null || user == null) {
      throw ApiException('استجابة الدخول غير متوقّعة من الخادم.');
    }
    final role = roleFromPortalType(
      user['portal_user_type']?.toString(),
      isStaff: user['is_staff'] == true || user['is_superuser'] == true,
    );
    return (token: token, user: user, role: role);
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _api.post('/identity/change-my-password/', data: {
      'old_password': oldPassword,
      'new_password': newPassword,
    });
  }
}
