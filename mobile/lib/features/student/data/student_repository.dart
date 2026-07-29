import '../../../core/network/api_service.dart';
import '../domain/models.dart';

/// مستودع بيانات بوابة الطالب.
class StudentRepository {
  StudentRepository(this._api);

  final ApiService _api;

  Future<StudentDashboard> getDashboard() async {
    final res = await _api.get('/portal/student/dashboard/');
    final data = (res is Map && res['data'] is Map) ? res['data'] : res;
    return StudentDashboard.fromJson((data as Map).cast<String, dynamic>());
  }
}
