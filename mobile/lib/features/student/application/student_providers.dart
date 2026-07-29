import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/student_repository.dart';
import '../domain/models.dart';

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  return StudentRepository(ref.watch(apiServiceProvider));
});

final studentDashboardProvider =
    FutureProvider.autoDispose<StudentDashboard>((ref) {
  return ref.watch(studentRepositoryProvider).getDashboard();
});
