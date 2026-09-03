import 'package:nebras_mobile/core/network/api_service.dart';
import '../domain/admission_models.dart';

class AdmissionsRepository {
  final ApiService _api;

  AdmissionsRepository(this._api);

  Future<AdmissionsStats> fetchStats() async {
    try {
      final res = await _api.get('/admissions/settings/current/');
      final bool isOpen = (res is Map && res['data'] is Map)
          ? res['data']['is_open'] == true
          : true;

      // جلب عدد الطلبات من السيرفر
      final appRes = await _api.get('/admissions/applicants/?page_size=500');
      List? list;
      if (appRes is Map) {
        if (appRes['data'] is List) {
          list = appRes['data'] as List;
        } else if (appRes['results'] is List) {
          list = appRes['results'] as List;
        }
      } else if (appRes is List) {
        list = appRes;
      }

      if (list != null) {
        int underReview = 0;
        int interviews = 0;
        int accepted = 0;
        int rejected = 0;
        for (var item in list) {
          final s = item['status']?.toString();
          if (s == 'under_review' || s == 'submitted' || s == 'draft') underReview++;
          if (s == 'interview_scheduled' || s == 'qualified_exam' || s == 'exam_scored') interviews++;
          if (s == 'accepted' || s == 'enrolled') accepted++;
          if (s == 'rejected') rejected++;
        }
        return AdmissionsStats(
          totalApplicants: list.length,
          underReviewCount: underReview,
          interviewScheduledCount: interviews,
          acceptedCount: accepted,
          rejectedCount: rejected,
          isRegistrationOpen: isOpen,
        );
      }
    } catch (_) {}

    return AdmissionsStats.mock();
  }

  Future<List<ApplicantModel>> fetchApplicants({
    ApplicantStatus? filterStatus,
    String? search,
  }) async {
    try {
      String query = '/admissions/applicants/';
      List<String> params = ['page_size=100'];
      if (filterStatus != null) {
        if (filterStatus == ApplicantStatus.underReview) {
          params.add('status=under_review,submitted,draft');
        } else if (filterStatus == ApplicantStatus.interviewScheduled) {
          params.add('status=interview_scheduled,qualified_exam,exam_scored');
        } else if (filterStatus == ApplicantStatus.accepted) {
          params.add('status=accepted,enrolled');
        } else {
          params.add('status=${statusToString(filterStatus)}');
        }
      }
      if (search != null && search.trim().isNotEmpty) {
        params.add('search=${Uri.encodeComponent(search.trim())}');
      }
      if (params.isNotEmpty) {
        query += '?${params.join('&')}';
      }

      final res = await _api.get(query);
      List? rawList;
      if (res is Map) {
        if (res['data'] is List) {
          rawList = res['data'] as List;
        } else if (res['results'] is List) {
          rawList = res['results'] as List;
        }
      } else if (res is List) {
        rawList = res;
      }

      if (rawList != null) {
        return rawList
            .map((e) => ApplicantModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {}

    // بيانات تجريبية سودانية واقعية
    final mockList = [
      ApplicantModel(
        id: 'app-sd-01',
        arabicFullName: 'محمد الفاتح بابكر عبد الرحيم',
        englishFullName: 'Mohamed El-Fateh Babiker',
        gender: 'ذكر',
        dateOfBirth: '2014-04-12',
        nationalId: '104829103948',
        previousSchool: 'مدرسة المنار الخاصة - الخرطوم بحري',
        previousGrade: 'الصف السادس أساس',
        applyingGrade: 'الصف الأول متوسط',
        applicationNumber: 'APP-2026-0814',
        status: ApplicantStatus.underReview,
        createdAt: DateTime.now().subtract(const Duration(hours: 3)),
        notes: 'طالب متفوق أكاديمياً، شهادة النقل مستوفية الأختام.',
        primaryGuardian: const GuardianModel(
          id: 'g-01',
          relationship: 'أب',
          fullName: 'الفاتح بابكر عبد الرحيم',
          phone: '+249912345678',
          whatsappPhone: '+249912345678',
          email: 'elfateh.babiker@gmail.com',
          occupation: 'مهندس زراعي',
          address: 'الخرطوم بحري - الصافية',
        ),
      ),
      ApplicantModel(
        id: 'app-sd-02',
        arabicFullName: 'فاطمة عمار دفع الله البدوي',
        englishFullName: 'Fatima Ammar Dafallah',
        gender: 'أنثى',
        dateOfBirth: '2016-09-20',
        nationalId: '106938201945',
        previousSchool: 'روضة براعم المستقبل - أم درمان',
        previousGrade: 'التمهيدي الثاني',
        applyingGrade: 'الصف الأول أساس',
        applicationNumber: 'APP-2026-0815',
        status: ApplicantStatus.interviewScheduled,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        notes: 'تم تحديد موعد مقابلة شخصية واختبار جاهزية يوم الخميس.',
        primaryGuardian: const GuardianModel(
          id: 'g-02',
          relationship: 'أب',
          fullName: 'عمار دفع الله البدوي',
          phone: '+249123456789',
          whatsappPhone: '+249123456789',
          email: 'ammar.badawi@yahoo.com',
          occupation: 'طبيب استشاري',
          address: 'أم درمان - حي الروضة',
        ),
      ),
      ApplicantModel(
        id: 'app-sd-03',
        arabicFullName: 'عمر التاج إبراهيم النور',
        englishFullName: 'Omer El-Tag Ibrahim',
        gender: 'ذكر',
        dateOfBirth: '2012-01-15',
        nationalId: '102849104820',
        previousSchool: 'مدارس النيل النموذجية - مدني',
        previousGrade: 'الصف الثامن أساس',
        applyingGrade: 'الصف الأول ثانوي',
        applicationNumber: 'APP-2026-0816',
        status: ApplicantStatus.accepted,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
        notes: 'اجتاز امتحان القدرات والمقابلة بنسبة 92%. بانتظار سداد رسوم التسجيل.',
        primaryGuardian: const GuardianModel(
          id: 'g-03',
          relationship: 'أب',
          fullName: 'التاج إبراهيم النور',
          phone: '+249918765432',
          whatsappPhone: '+249918765432',
          email: 'tag.ibrahim@outlook.com',
          occupation: 'محاسب قانوني',
          address: 'الخرطوم - الرياض، شارع المشتل',
        ),
      ),
      ApplicantModel(
        id: 'app-sd-04',
        arabicFullName: 'آمنة مزمل الكباشي الطيب',
        englishFullName: 'Amna Muzamil El-Kabashi',
        gender: 'أنثى',
        dateOfBirth: '2015-06-30',
        nationalId: '105829104839',
        previousSchool: 'مدرسة القبس الخاصة - الخرطوم',
        previousGrade: 'الصف الرابع أساس',
        applyingGrade: 'الصف الخامس أساس',
        applicationNumber: 'APP-2026-0817',
        status: ApplicantStatus.rejected,
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
        notes: 'اعتذار لعدم توفر مقاعد شاغرة في الصف الخامس.',
        primaryGuardian: const GuardianModel(
          id: 'g-04',
          relationship: 'أب',
          fullName: 'مزمل الطيب الكباشي',
          phone: '+249923456789',
          whatsappPhone: '+249923456789',
          email: 'muzamil.kabashi@gmail.com',
          occupation: 'أستاذ جامعي',
          address: 'الخرطوم - العمارات، شارع 15',
        ),
      ),
    ];

    if (filterStatus != null) {
      return mockList.where((a) => a.status == filterStatus).toList();
    }
    return mockList;
  }

  Future<ApplicantModel> fetchApplicantDetail(String id) async {
    try {
      final res = await _api.get('/admissions/applicants/$id/');
      if (res is Map) {
        final data = res['data'] is Map ? res['data'] as Map<String, dynamic> : res as Map<String, dynamic>;
        return ApplicantModel.fromJson(data);
      }
    } catch (_) {}

    final list = await fetchApplicants();
    return list.firstWhere((a) => a.id == id, orElse: () => list.first);
  }

  Future<void> updateApplicantStatus(
    String id,
    ApplicantStatus status, {
    String? reason,
  }) async {
    try {
      await _api.patch('/admissions/applicants/$id/set-status/', data: {
        'status': statusToString(status),
        'reason': reason,
      });
    } catch (_) {}
  }

  Future<void> scheduleInterview(
    String id,
    DateTime scheduledAt, {
    String? recommendation,
  }) async {
    try {
      await _api.post('/admissions/applicants/$id/schedule-interview/', data: {
        'scheduled_at': scheduledAt.toIso8601String(),
        'recommendation': recommendation ?? 'مقابلة شخصية وتقييم قدرات',
      });
    } catch (_) {}
  }

  Future<void> createApplicant({
    required String arabicFullName,
    required String gender,
    required String dateOfBirth,
    required String nationalId,
    required String applyingGrade,
    required String guardianName,
    required String guardianPhone,
    required String guardianRelationship,
    String? previousSchool,
  }) async {
    try {
      await _api.post('/admissions/applicants/', data: {
        'arabic_full_name': arabicFullName,
        'gender': gender == 'أنثى' ? 'female' : 'male',
        'date_of_birth': dateOfBirth,
        'national_id': nationalId,
        'nationality': 'سوداني',
        'applying_grade_id': '49260172-f08b-411a-b5c6-405d36fbc9e5',
        'academic_year_id': '5a4b8aa8-f768-4b7c-a96e-620f1c884c40',
        'previous_school': previousSchool,
      });
    } catch (_) {}
  }
}
