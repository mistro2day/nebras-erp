import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/application/auth_controller.dart';
import '../features/auth/domain/session.dart';
import '../features/auth/presentation/login_page.dart';
import '../features/parent/presentation/parent_shell.dart';
import '../features/parent/presentation/child_detail_page.dart';
import '../features/parent/presentation/pay_page.dart';
import '../features/student/presentation/student_shell.dart';
import '../features/common/role_placeholder_page.dart';

String _homePathFor(UserRole role) {
  switch (role) {
    case UserRole.parent:
      return '/parent';
    case UserRole.student:
      return '/student';
    default:
      return '/placeholder';
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  // جسر يعيد تقييم التوجيه عند تغيّر حالة المصادقة (دخول/خروج).
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(authControllerProvider);
      final loggingIn = state.matchedLocation == '/login';

      if (session == null) return loggingIn ? null : '/login';
      if (loggingIn) return _homePathFor(session.role);
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (c, s) => const LoginPage()),
      GoRoute(path: '/parent', builder: (c, s) => const ParentShell()),
      GoRoute(path: '/student', builder: (c, s) => const StudentShell()),
      GoRoute(
        path: '/parent/child/:id',
        builder: (c, s) => ChildDetailPage(studentId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/parent/pay',
        builder: (c, s) => PayPage(args: s.extra as PayArgs),
      ),
      GoRoute(path: '/placeholder', builder: (c, s) => const RolePlaceholderPage()),
    ],
  );
});
