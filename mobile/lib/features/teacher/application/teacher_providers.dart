import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/teacher_repository.dart';
import '../domain/models.dart';

final teacherRepositoryProvider = Provider<TeacherRepository>((ref) {
  return TeacherRepository(ref.watch(apiServiceProvider));
});

final teacherDashboardProvider =
    FutureProvider.autoDispose<TeacherDashboard>((ref) {
  return ref.watch(teacherRepositoryProvider).getDashboard();
});

final sectionStudentsProvider =
    FutureProvider.autoDispose.family<List<SectionStudent>, String>((ref, sectionId) {
  return ref.watch(teacherRepositoryProvider).getSectionStudents(sectionId);
});
