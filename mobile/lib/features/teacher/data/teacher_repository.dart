import '../../../core/network/api_service.dart';
import '../domain/models.dart';

/// مستودع بيانات بوابة المعلّم.
class TeacherRepository {
  TeacherRepository(this._api);

  final ApiService _api;

  Future<TeacherDashboard> getDashboard() async {
    final res = await _api.get('/portal/teacher/dashboard/');
    final data = (res is Map && res['data'] is Map) ? res['data'] : res;
    return TeacherDashboard.fromJson((data as Map).cast<String, dynamic>());
  }

  Future<List<SectionStudent>> getSectionStudents(String sectionId) async {
    final res = await _api.get('/portal/teacher/sections/$sectionId/students/');
    final list = (res is Map ? (res['students'] ?? res['data'] ?? []) : res) as List? ?? [];
    return list.map((e) => SectionStudent.fromJson((e as Map).cast<String, dynamic>())).toList();
  }
}
