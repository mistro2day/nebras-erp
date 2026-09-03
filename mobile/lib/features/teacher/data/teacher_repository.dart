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

  Future<SectionAttendanceData> getSectionAttendance(String sectionId, {String? date}) async {
    final query = date != null ? '?date=$date' : '';
    final res = await _api.get('/portal/teacher/sections/$sectionId/attendance/$query');
    final data = (res is Map && res['data'] is Map) ? res['data'] : res;
    return SectionAttendanceData.fromJson((data as Map).cast<String, dynamic>());
  }

  Future<bool> saveSectionAttendance(
    String sectionId, {
    required String date,
    required List<StudentAttendanceItem> records,
  }) async {
    final body = {
      'date': date,
      'attendances': records.map((e) => e.toJson()).toList(),
    };
    await _api.post('/portal/teacher/sections/$sectionId/attendance/', data: body);
    return true;
  }
}
