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

class SectionAttendanceQuery {
  final String sectionId;
  final String date;
  const SectionAttendanceQuery({required this.sectionId, required this.date});

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SectionAttendanceQuery &&
          runtimeType == other.runtimeType &&
          sectionId == other.sectionId &&
          date == other.date;

  @override
  int get hashCode => sectionId.hashCode ^ date.hashCode;
}

final sectionAttendanceProvider = FutureProvider.autoDispose
    .family<SectionAttendanceData, SectionAttendanceQuery>((ref, query) {
  return ref.watch(teacherRepositoryProvider).getSectionAttendance(
        query.sectionId,
        date: query.date,
      );
});
