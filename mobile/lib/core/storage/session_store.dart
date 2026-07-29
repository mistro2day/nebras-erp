import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// تخزين آمن لجلسة المستخدم (التوكن، المستأجر، بيانات المستخدم).
class SessionStore {
  SessionStore(this._storage);

  final FlutterSecureStorage _storage;

  static const _kToken = 'auth_token';
  static const _kTenant = 'tenant_id';
  static const _kUser = 'current_user';

  Future<void> saveToken(String token) => _storage.write(key: _kToken, value: token);
  Future<String?> readToken() => _storage.read(key: _kToken);

  Future<void> saveTenant(String tenantId) => _storage.write(key: _kTenant, value: tenantId);
  Future<String?> readTenant() => _storage.read(key: _kTenant);

  Future<void> saveUser(Map<String, dynamic> user) =>
      _storage.write(key: _kUser, value: jsonEncode(user));

  Future<Map<String, dynamic>?> readUser() async {
    final raw = await _storage.read(key: _kUser);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> clear() async {
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kUser);
    // نُبقي المستأجر لتسهيل الدخول التالي على نفس المدرسة.
  }
}
