import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../domain/session.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiServiceProvider));
});

/// حالة المصادقة الحالية (null = غير مصادَق).
class AuthController extends Notifier<Session?> {
  @override
  Session? build() => null;

  bool _bootstrapped = false;

  /// استعادة الجلسة من التخزين الآمن عند الإقلاع.
  Future<void> bootstrap() async {
    if (_bootstrapped) return;
    _bootstrapped = true;
    final store = ref.read(sessionStoreProvider);
    final token = await store.readToken();
    final user = await store.readUser();
    if (token != null && user != null) {
      final role = roleFromUserData(user);
      state = Session(token: token, user: user, role: role);
    }
  }

  Future<void> login(String email, String password) async {
    final repo = ref.read(authRepositoryProvider);
    final store = ref.read(sessionStoreProvider);
    final result = await repo.login(email, password);
    await store.saveToken(result.token);
    await store.saveUser(result.user);
    state = Session(token: result.token, user: result.user, role: result.role);
  }

  Future<void> logout() async {
    await ref.read(sessionStoreProvider).clear();
    state = null;
  }
}

final authControllerProvider = NotifierProvider<AuthController, Session?>(AuthController.new);
