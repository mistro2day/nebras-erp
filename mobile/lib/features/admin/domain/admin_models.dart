class AdminDashboardSummary {
  final int totalStudents;
  final int presentStudents;
  final int absentStudents;
  final int lateStudents;
  final int totalStaff;
  final int presentStaff;
  final int absentStaff;
  final int lateStaff;
  final int pendingApprovalsCount;
  final double todayCollectedAmount;

  const AdminDashboardSummary({
    required this.totalStudents,
    required this.presentStudents,
    required this.absentStudents,
    required this.lateStudents,
    required this.totalStaff,
    required this.presentStaff,
    required this.absentStaff,
    required this.lateStaff,
    required this.pendingApprovalsCount,
    required this.todayCollectedAmount,
  });

  double get studentAttendanceRate =>
      totalStudents > 0 ? (presentStudents / totalStudents) * 100 : 0.0;

  double get staffAttendanceRate =>
      totalStaff > 0 ? (presentStaff / totalStaff) * 100 : 0.0;

  factory AdminDashboardSummary.mock() {
    return const AdminDashboardSummary(
      totalStudents: 480,
      presentStudents: 452,
      absentStudents: 21,
      lateStudents: 7,
      totalStaff: 42,
      presentStaff: 39,
      absentStaff: 2,
      lateStaff: 1,
      pendingApprovalsCount: 5,
      todayCollectedAmount: 14250.0,
    );
  }
}

enum ApprovalCategory {
  leave, // إجازة
  dismissal, // إذن انصراف
  payment, // سداد رسوم / إيصال بنكي
  attendanceCorrection, // تصحيح حضور
  general, // عام
}

class ApprovalItem {
  final String id;
  final String title;
  final String requesterName;
  final String requesterRole;
  final ApprovalCategory category;
  final String status; // pending, approved, rejected
  final DateTime createdAt;
  final String details;
  final double? amount;

  const ApprovalItem({
    required this.id,
    required this.title,
    required this.requesterName,
    required this.requesterRole,
    required this.category,
    required this.status,
    required this.createdAt,
    required this.details,
    this.amount,
  });

  String get categoryLabel {
    switch (category) {
      case ApprovalCategory.leave:
        return 'إجازة موظف';
      case ApprovalCategory.dismissal:
        return 'إذن خروج';
      case ApprovalCategory.payment:
        return 'سداد رسوم';
      case ApprovalCategory.attendanceCorrection:
        return 'تصحيح حضور';
      case ApprovalCategory.general:
        return 'طلب عام';
    }
  }
}

enum PersonType { student, employee }
enum AttendanceStatus { present, absent, late, excused }

class LiveAttendanceItem {
  final String id;
  final String name;
  final PersonType personType;
  final AttendanceStatus status;
  final String time;
  final String section; // الفصل أو القسم
  final String? note;

  const LiveAttendanceItem({
    required this.id,
    required this.name,
    required this.personType,
    required this.status,
    required this.time,
    required this.section,
    this.note,
  });

  String get statusLabel {
    switch (status) {
      case AttendanceStatus.present:
        return 'حاضر';
      case AttendanceStatus.absent:
        return 'غائب';
      case AttendanceStatus.late:
        return 'متأخر';
      case AttendanceStatus.excused:
        return 'معذور';
    }
  }
}

class DailyGatePass {
  final String studentName;
  final String gradeAndSection;
  final String guardianName;
  final String reason;
  final String departureTime;
  final String? notes;

  const DailyGatePass({
    required this.studentName,
    required this.gradeAndSection,
    required this.guardianName,
    required this.reason,
    required this.departureTime,
    this.notes,
  });
}

class DailyIncident {
  final String studentName;
  final String gradeAndSection;
  final String incidentType;
  final String severity; // عادية، متوسطة، جسيمة
  final String details;
  final String actionTaken;
  final bool notifyParent;

  const DailyIncident({
    required this.studentName,
    required this.gradeAndSection,
    required this.incidentType,
    required this.severity,
    required this.details,
    required this.actionTaken,
    required this.notifyParent,
  });
}

class SchoolAnnouncementPayload {
  final String title;
  final String content;
  final String targetAudience; // الكل، أولياء الأمور، المعلمين
  final bool isUrgent;

  const SchoolAnnouncementPayload({
    required this.title,
    required this.content,
    required this.targetAudience,
    required this.isUrgent,
  });
}
