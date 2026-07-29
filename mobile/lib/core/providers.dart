import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'network/api_service.dart';
import 'storage/session_store.dart';

/// مزوّدات البنية التحتية المشتركة (تخزين، جلسة، عميل API).
final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
});

final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SessionStore(ref.watch(secureStorageProvider));
});

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref.watch(sessionStoreProvider));
});
