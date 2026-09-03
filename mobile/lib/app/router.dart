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
import '../features/teacher/presentation/teacher_shell.dart';
import '../features/teacher/presentation/take_attendance_page.dart';
import '../features/teacher/presentation/class_students_page.dart';
import '../features/admin/presentation/admin_shell.dart';
import '../features/admissions/presentation/admissions_list_page.dart';
import '../features/admissions/presentation/applicant_detail_page.dart';
import '../features/admissions/presentation/new_applicant_form_page.dart';
import '../features/common/role_placeholder_page.dart';

String _homePathFor(UserRole role) {
  switch (role) {
    case UserRole.admin:
      return '/admin';
    case UserRole.parent:
      return '/parent';
    case UserRole.student:
      return '/student';
    case UserRole.teacher:
      return '/teacher';
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
      GoRoute(path: '/admin', builder: (c, s) => const AdminShell()),
      GoRoute(path: '/admin/admissions', builder: (c, s) => const AdmissionsListPage()),
      GoRoute(path: '/admin/admissions/new', builder: (c, s) => const NewApplicantFormPage()),
      GoRoute(
        path: '/admin/admissions/:id',
        builder: (c, s) => ApplicantDetailPage(applicantId: s.pathParameters['id']!),
      ),
      GoRoute(path: '/parent', builder: (c, s) => const ParentShell()),
      GoRoute(path: '/student', builder: (c, s) => const StudentShell()),
      GoRoute(path: '/teacher', builder: (c, s) => const TeacherShell()),
      GoRoute(
        path: '/teacher/sections/:id/attendance',
        builder: (c, s) => TakeAttendancePage(
          sectionId: s.pathParameters['id']!,
          title: (s.extra as String?) ?? 'رصد الحضور',
        ),
      ),
      GoRoute(
        path: '/teacher/sections/:id/students',
        builder: (c, s) => ClassStudentsPage(
          sectionId: s.pathParameters['id']!,
          title: (s.extra as String?) ?? 'قائمة الطلاب',
        ),
      ),
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
