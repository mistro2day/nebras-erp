import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// تخزين آمن لجلسة المستخدم (التوكن، المستأجر، بيانات المستخدم).
class SessionStore {
  SessionStore(this._storage);

  final FlutterSecureStorage _storage;

  // مخزن محلي في الذاكرة لبيئة الويب لتفادي أخطاء SubtleCrypto على بروتوكول HTTP المحلي
  static final Map<String, String> _webStore = {};

  static const _kToken = 'auth_token';
  static const _kTenant = 'tenant_id';
  static const _kUser = 'current_user';

  Future<void> saveToken(String token) async {
    if (kIsWeb) {
      _webStore[_kToken] = token;
      return;
    }
    await _storage.write(key: _kToken, value: token);
  }

  Future<String?> readToken() async {
    if (kIsWeb) return _webStore[_kToken];
    try {
      return await _storage.read(key: _kToken);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveTenant(String tenantId) async {
    if (kIsWeb) {
      _webStore[_kTenant] = tenantId;
      return;
    }
    await _storage.write(key: _kTenant, value: tenantId);
  }

  Future<String?> readTenant() async {
    if (kIsWeb) return _webStore[_kTenant];
    try {
      return await _storage.read(key: _kTenant);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveUser(Map<String, dynamic> user) async {
    final encoded = jsonEncode(user);
    if (kIsWeb) {
      _webStore[_kUser] = encoded;
      return;
    }
    await _storage.write(key: _kUser, value: encoded);
  }

  Future<Map<String, dynamic>?> readUser() async {
    final raw = kIsWeb ? _webStore[_kUser] : await _readSafe(_kUser);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<String?> _readSafe(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (_) {
      return null;
    }
  }

  Future<void> clear() async {
    if (kIsWeb) {
      _webStore.remove(_kToken);
      _webStore.remove(_kUser);
      return;
    }
    try {
      await _storage.delete(key: _kToken);
      await _storage.delete(key: _kUser);
    } catch (_) {}
  }
}
