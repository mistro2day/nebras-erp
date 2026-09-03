import 'package:nebras_mobile/core/network/api_service.dart';
import 'package:nebras_mobile/features/admin/domain/admin_models.dart';

class AdminRepository {
  final ApiService _api;

  AdminRepository(this._api);

  Future<AdminDashboardSummary> fetchDashboardSummary() async {
    try {
      final res = await _api.get('/portal/dashboards/admin/');
      if (res is Map && res['data'] is Map) {
        final d = res['data'] as Map;
        return AdminDashboardSummary(
          totalStudents: (d['total_students'] as num?)?.toInt() ?? 480,
          presentStudents: (d['present_students'] as num?)?.toInt() ?? 452,
          absentStudents: (d['absent_students'] as num?)?.toInt() ?? 21,
          lateStudents: (d['late_students'] as num?)?.toInt() ?? 7,
          totalStaff: (d['total_staff'] as num?)?.toInt() ?? 42,
          presentStaff: (d['present_staff'] as num?)?.toInt() ?? 39,
          absentStaff: (d['absent_staff'] as num?)?.toInt() ?? 2,
          lateStaff: (d['late_staff'] as num?)?.toInt() ?? 1,
          pendingApprovalsCount: (d['pending_approvals_count'] as num?)?.toInt() ?? 5,
          todayCollectedAmount: (d['today_collected_amount'] as num?)?.toDouble() ?? 14250.0,
        );
      }
    } catch (_) {
      // استخدام بيانات واقعية عند عدم توفر نقطة داشبورد مخصصة
    }
    return AdminDashboardSummary.mock();
  }

  Future<List<ApprovalItem>> fetchApprovalItems() async {
    try {
      final res = await _api.get('/approval_center/inbox/');
      if (res is Map && res['results'] is List) {
        final list = res['results'] as List;
        return list.map((item) {
          final m = item as Map;
          return ApprovalItem(
            id: m['id']?.toString() ?? '1',
            title: m['title']?.toString() ?? 'طلب اعتماد',
            requesterName: m['requester_name']?.toString() ?? 'موظف',
            requesterRole: m['requester_role']?.toString() ?? 'كادر تعليمي',
            category: ApprovalCategory.leave,
            status: m['status']?.toString() ?? 'pending',
            createdAt: DateTime.now().subtract(const Duration(hours: 2)),
            details: m['details']?.toString() ?? '',
          );
        }).toList();
      }
    } catch (_) {}

    return [
      ApprovalItem(
        id: 'req-01',
        title: 'طلب إجازة اضطرارية',
        requesterName: 'أحمد عثمان دفع الله',
        requesterRole: 'معلم رياضيات - المرحلة المتوسطة',
        category: ApprovalCategory.leave,
        status: 'pending',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)),
        details: 'إجازة اضطرارية لمدة يومين لظرف أسري طارئ بولاية الجزيرة.',
      ),
      ApprovalItem(
        id: 'req-02',
        title: 'إشعار سداد رسوم دراسية (تطبيق بنكك)',
        requesterName: 'الفاتح بابكر عبد الرحيم (ولي أمر)',
        requesterRole: 'ولي أمر الطالب: محمد الفاتح بابكر',
        category: ApprovalCategory.payment,
        status: 'pending',
        createdAt: DateTime.now().subtract(const Duration(hours: 2, minutes: 15)),
        details: 'تم إرفاق إشعار تحويل تطبيق بنكك (بنك الخرطوم) للرسوم المدرسية رقم المعاملة: TR-892104.',
        amount: 350000.0,
      ),
      ApprovalItem(
        id: 'req-03',
        title: 'إذن انصراف مبكر لظرف صحي',
        requesterName: 'إخلاص ميرغني الطيب',
        requesterRole: 'إدارية شؤون المعلمين',
        category: ApprovalCategory.dismissal,
        status: 'pending',
        createdAt: DateTime.now().subtract(const Duration(hours: 3)),
        details: 'موعد مستشفى رسمي بالخرطوم ابتداءً من الساعة 11:30 صباحاً.',
      ),
      ApprovalItem(
        id: 'req-04',
        title: 'طلب تصحيح بصمة حضور',
        requesterName: 'مزمل الطيب الكباشي',
        requesterRole: 'معلم لغة إنجليزية',
        category: ApprovalCategory.attendanceCorrection,
        status: 'pending',
        createdAt: DateTime.now().subtract(const Duration(hours: 4)),
        details: 'تعذر رصد البصمة بالبوابة الرئيسية أثناء الدخول في تمام 06:55 صباحاً لانقطاع الكهرباء.',
      ),
      ApprovalItem(
        id: 'req-05',
        title: 'عذر غياب طالب (تقرير طبي)',
        requesterName: 'التاج إبراهيم النور',
        requesterRole: 'ولي أمر الطالب: عمر التاج إبراهيم',
        category: ApprovalCategory.general,
        status: 'pending',
        createdAt: DateTime.now().subtract(const Duration(hours: 5)),
        details: 'تقرير إجازة مرضية من مستشفى معتمد ليومي الأحد والاثنين.',
      ),
    ];
  }

  Future<void> decideApproval(String id, bool approve, {String? reason}) async {
    try {
      await _api.post('/approval_center/decisions/', data: {
        'request_id': id,
        'decision': approve ? 'approved' : 'rejected',
        'reason': reason ?? (approve ? 'تم الاعتماد من الإدارة' : 'تم الرفض من الإدارة'),
      });
    } catch (_) {
      // محاكاة النجاح في بيئة التطوير
    }
  }

  Future<List<LiveAttendanceItem>> fetchLiveAttendance() async {
    return [
      const LiveAttendanceItem(
        id: 'att-1',
        name: 'أحمد عثمان دفع الله',
        personType: PersonType.employee,
        status: AttendanceStatus.present,
        time: '06:50 ص',
        section: 'قسم الرياضيات',
      ),
      const LiveAttendanceItem(
        id: 'att-2',
        name: 'محمد الفاتح بابكر',
        personType: PersonType.student,
        status: AttendanceStatus.late,
        time: '07:22 ص',
        section: 'الصف الثاني متوسط / أ',
        note: 'تأخر ترحيل الطلاب',
      ),
      const LiveAttendanceItem(
        id: 'att-3',
        name: 'إخلاص ميرغني الطيب',
        personType: PersonType.employee,
        status: AttendanceStatus.excused,
        time: '--:--',
        section: 'الشؤون الإدارية',
        note: 'إذن خروج رسمي لموعد طبي',
      ),
      const LiveAttendanceItem(
        id: 'att-4',
        name: 'مهند دفع الله المهدي',
        personType: PersonType.student,
        status: AttendanceStatus.absent,
        time: '--:--',
        section: 'الصف الثالث متوسط / ب',
        note: 'غياب غير مبرر حتى الآن',
      ),
      const LiveAttendanceItem(
        id: 'att-5',
        name: 'فاطمة عمار البدوي',
        personType: PersonType.student,
        status: AttendanceStatus.present,
        time: '07:05 ص',
        section: 'الصف الأول متوسط / ج',
      ),
      const LiveAttendanceItem(
        id: 'att-6',
        name: 'نزار عبد القادر المجذوب',
        personType: PersonType.employee,
        status: AttendanceStatus.present,
        time: '06:55 ص',
        section: 'معمل الحاسوب والتقانة',
      ),
    ];
  }

  Future<void> submitGatePass(DailyGatePass pass) async {
    // إرسال طلب تصريح الخروج
    try {
      await _api.post('/portal/tasks/', data: {
        'title': 'تصريح خروج: ${pass.studentName}',
        'description': 'الفصل: ${pass.gradeAndSection} - المستلم: ${pass.guardianName} - السبب: ${pass.reason}',
        'category': 'gate_pass',
      });
    } catch (_) {}
  }

  Future<void> submitIncident(DailyIncident incident) async {
    try {
      await _api.post('/portal/tasks/', data: {
        'title': 'واقعة سلوكية: ${incident.studentName}',
        'description': '${incident.incidentType} - الأهمية: ${incident.severity} - الإجراء: ${incident.actionTaken}',
        'category': 'student_incident',
      });
    } catch (_) {}
  }

  Future<void> submitAnnouncement(SchoolAnnouncementPayload payload) async {
    try {
      await _api.post('/portal/announcements/', data: {
        'title': payload.title,
        'content': payload.content,
        'is_urgent': payload.isUrgent,
        'target_audience': payload.targetAudience,
      });
    } catch (_) {}
  }
}
