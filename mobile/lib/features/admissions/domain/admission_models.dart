enum ApplicantStatus {
  draft,
  submitted,
  underReview,
  interviewScheduled,
  accepted,
  rejected,
  waitlist,
  enrolled,
}

ApplicantStatus parseApplicantStatus(String? val) {
  switch (val?.toLowerCase()) {
    case 'draft':
      return ApplicantStatus.draft;
    case 'submitted':
      return ApplicantStatus.submitted;
    case 'under_review':
      return ApplicantStatus.underReview;
    case 'interview_scheduled':
    case 'qualified_exam':
    case 'exam_scored':
      return ApplicantStatus.interviewScheduled;
    case 'accepted':
      return ApplicantStatus.accepted;
    case 'enrolled':
      return ApplicantStatus.enrolled;
    case 'rejected':
      return ApplicantStatus.rejected;
    case 'waitlist':
      return ApplicantStatus.waitlist;
    default:
      return ApplicantStatus.underReview;
  }
}

String statusToString(ApplicantStatus status) {
  switch (status) {
    case ApplicantStatus.draft:
      return 'draft';
    case ApplicantStatus.submitted:
      return 'submitted';
    case ApplicantStatus.underReview:
      return 'under_review';
    case ApplicantStatus.interviewScheduled:
      return 'interview_scheduled';
    case ApplicantStatus.accepted:
      return 'accepted';
    case ApplicantStatus.rejected:
      return 'rejected';
    case ApplicantStatus.waitlist:
      return 'waitlist';
    case ApplicantStatus.enrolled:
      return 'enrolled';
  }
}

String statusToDisplayLabel(ApplicantStatus status) {
  switch (status) {
    case ApplicantStatus.draft:
      return 'مسودة';
    case ApplicantStatus.submitted:
      return 'طلب جديد';
    case ApplicantStatus.underReview:
      return 'قيد المراجعة';
    case ApplicantStatus.interviewScheduled:
      return 'مقابلة مجدولة';
    case ApplicantStatus.accepted:
      return 'تم القبول';
    case ApplicantStatus.rejected:
      return 'مرفوض';
    case ApplicantStatus.waitlist:
      return 'قائمة الانتظار';
    case ApplicantStatus.enrolled:
      return 'مقيد بالمدرسة';
  }
}

class GuardianModel {
  final String id;
  final String relationship; // أب، أم، ولي أمر
  final String fullName;
  final String phone;
  final String? whatsappPhone;
  final String? email;
  final String? occupation;
  final String? nationalId;
  final String? address;

  const GuardianModel({
    required this.id,
    required this.relationship,
    required this.fullName,
    required this.phone,
    this.whatsappPhone,
    this.email,
    this.occupation,
    this.nationalId,
    this.address,
  });

  factory GuardianModel.fromJson(Map<String, dynamic> json) {
    return GuardianModel(
      id: json['id']?.toString() ?? '',
      relationship: json['relationship'] == 'father'
          ? 'أب'
          : (json['relationship'] == 'mother' ? 'أم' : 'ولي أمر'),
      fullName: json['full_name']?.toString() ?? 'ولي الأمر',
      phone: json['phone']?.toString() ?? '',
      whatsappPhone: json['whatsapp_phone']?.toString() ?? json['phone']?.toString(),
      email: json['email']?.toString(),
      occupation: json['occupation']?.toString(),
      nationalId: json['national_id']?.toString(),
      address: json['address']?.toString(),
    );
  }
}

class ApplicantModel {
  final String id;
  final String arabicFullName;
  final String? englishFullName;
  final String gender; // ذكر، أنثى
  final String dateOfBirth;
  final String nationalId;
  final String? previousSchool;
  final String? previousGrade;
  final String applyingGrade;
  final String applicationNumber;
  final ApplicantStatus status;
  final DateTime createdAt;
  final String? notes;
  final GuardianModel? primaryGuardian;

  const ApplicantModel({
    required this.id,
    required this.arabicFullName,
    this.englishFullName,
    required this.gender,
    required this.dateOfBirth,
    required this.nationalId,
    this.previousSchool,
    this.previousGrade,
    required this.applyingGrade,
    required this.applicationNumber,
    required this.status,
    required this.createdAt,
    this.notes,
    this.primaryGuardian,
  });

  factory ApplicantModel.fromJson(Map<String, dynamic> json) {
    GuardianModel? guardian;
    if (json['guardians'] is List && (json['guardians'] as List).isNotEmpty) {
      guardian = GuardianModel.fromJson(json['guardians'][0] as Map<String, dynamic>);
    } else if (json['guardian_name'] != null || json['guardian_phone'] != null) {
      guardian = GuardianModel(
        id: 'g-info',
        relationship: 'ولي أمر',
        fullName: json['guardian_name']?.toString() ?? 'ولي الأمر',
        phone: json['guardian_phone']?.toString() ?? '',
        whatsappPhone: json['guardian_phone']?.toString() ?? '',
      );
    }

    final name = (json['arabic_full_name'] != null && json['arabic_full_name'].toString().trim().isNotEmpty)
        ? json['arabic_full_name'].toString()
        : (json['english_full_name']?.toString() ?? 'متقدم جديد');

    return ApplicantModel(
      id: json['id']?.toString() ?? '',
      arabicFullName: name,
      englishFullName: json['english_full_name']?.toString(),
      gender: json['gender'] == 'female' ? 'أنثى' : 'ذكر',
      dateOfBirth: json['date_of_birth']?.toString() ?? '',
      nationalId: json['national_id']?.toString() ?? '',
      previousSchool: json['previous_school']?.toString(),
      previousGrade: json['previous_grade']?.toString(),
      applyingGrade: json['grade_name']?.toString() ??
          json['applying_grade_name']?.toString() ??
          'الصف الدراسي',
      applicationNumber: json['application_number']?.toString() ?? 'APP-000',
      status: parseApplicantStatus(json['status']?.toString()),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      notes: json['notes']?.toString(),
      primaryGuardian: guardian,
    );
  }
}

class AdmissionsStats {
  final int totalApplicants;
  final int underReviewCount;
  final int interviewScheduledCount;
  final int acceptedCount;
  final int rejectedCount;
  final bool isRegistrationOpen;

  const AdmissionsStats({
    required this.totalApplicants,
    required this.underReviewCount,
    required this.interviewScheduledCount,
    required this.acceptedCount,
    required this.rejectedCount,
    required this.isRegistrationOpen,
  });

  factory AdmissionsStats.mock() {
    return const AdmissionsStats(
      totalApplicants: 42,
      underReviewCount: 14,
      interviewScheduledCount: 8,
      acceptedCount: 17,
      rejectedCount: 3,
      isRegistrationOpen: true,
    );
  }
}
