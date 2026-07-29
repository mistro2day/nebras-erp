// نماذج بيانات بوابة الطالب.

double _d(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0;
}

class StudentGrade {
  StudentGrade({
    required this.examName,
    required this.term,
    required this.marksObtained,
    required this.maxMarks,
    required this.passMarks,
    required this.isPresent,
    required this.passed,
  });

  final String examName;
  final String term;
  final double marksObtained;
  final double maxMarks;
  final double passMarks;
  final bool isPresent;
  final bool passed;

  double get percentage => maxMarks > 0 ? (marksObtained / maxMarks * 100) : 0;

  factory StudentGrade.fromJson(Map<String, dynamic> j) => StudentGrade(
        examName: j['exam_name']?.toString() ?? 'امتحان',
        term: j['term']?.toString() ?? '',
        marksObtained: _d(j['marks_obtained']),
        maxMarks: _d(j['max_marks']),
        passMarks: _d(j['pass_marks']),
        isPresent: j['is_present'] != false,
        passed: j['passed'] == true,
      );
}

class AttendanceSummary {
  AttendanceSummary({
    required this.total,
    required this.present,
    required this.absent,
    required this.rate,
    required this.recent,
  });

  final int total;
  final int present;
  final int absent;
  final double rate;
  final List<Map<String, dynamic>> recent;

  factory AttendanceSummary.fromJson(Map<String, dynamic> j) => AttendanceSummary(
        total: (j['total'] ?? 0) as int,
        present: (j['present'] ?? 0) as int,
        absent: (j['absent'] ?? 0) as int,
        rate: _d(j['rate']),
        recent: (j['recent'] as List? ?? [])
            .map((e) => (e as Map).cast<String, dynamic>())
            .toList(),
      );
}

class StudentDashboard {
  StudentDashboard({
    required this.name,
    required this.studentNumber,
    required this.gradeLevel,
    required this.academicYear,
    required this.outstandingBalance,
    required this.grades,
    required this.attendance,
  });

  final String? name;
  final String? studentNumber;
  final String? gradeLevel;
  final String? academicYear;
  final double outstandingBalance;
  final List<StudentGrade> grades;
  final AttendanceSummary attendance;

  factory StudentDashboard.fromJson(Map<String, dynamic> j) {
    final info = (j['student_info'] as Map?)?.cast<String, dynamic>() ?? {};
    final finance = (j['finance'] as Map?)?.cast<String, dynamic>() ?? {};
    return StudentDashboard(
      name: info['name']?.toString(),
      studentNumber: info['student_number']?.toString(),
      gradeLevel: info['grade_level']?.toString(),
      academicYear: info['academic_year']?.toString(),
      outstandingBalance: _d(finance['outstanding_balance']),
      grades: (j['grades'] as List? ?? [])
          .map((e) => StudentGrade.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
      attendance: AttendanceSummary.fromJson(
          (j['attendance'] as Map?)?.cast<String, dynamic>() ?? {}),
    );
  }
}
