// نماذج بيانات بوابة المعلّم.

class TeacherClass {
  TeacherClass({
    required this.assignmentId,
    required this.subject,
    required this.sectionId,
    required this.section,
    required this.grade,
    required this.students,
    required this.weeklyHours,
  });

  final String assignmentId;
  final String subject;
  final String sectionId;
  final String? section;
  final String? grade;
  final int students;
  final int weeklyHours;

  factory TeacherClass.fromJson(Map<String, dynamic> j) => TeacherClass(
        assignmentId: j['assignment_id']?.toString() ?? '',
        subject: j['subject']?.toString() ?? 'مادة',
        sectionId: j['section_id']?.toString() ?? '',
        section: j['section']?.toString(),
        grade: j['grade']?.toString(),
        students: (j['students'] ?? 0) as int,
        weeklyHours: (j['weekly_hours'] ?? 0) as int,
      );
}

class TeacherDashboard {
  TeacherDashboard({
    required this.name,
    required this.employeeNumber,
    required this.classesCount,
    required this.totalStudents,
    required this.weeklyHours,
    required this.classes,
  });

  final String? name;
  final String? employeeNumber;
  final int classesCount;
  final int totalStudents;
  final int weeklyHours;
  final List<TeacherClass> classes;

  factory TeacherDashboard.fromJson(Map<String, dynamic> j) {
    final info = (j['teacher_info'] as Map?)?.cast<String, dynamic>() ?? {};
    final summary = (j['summary'] as Map?)?.cast<String, dynamic>() ?? {};
    return TeacherDashboard(
      name: info['name']?.toString(),
      employeeNumber: info['employee_number']?.toString(),
      classesCount: (summary['classes'] ?? 0) as int,
      totalStudents: (summary['total_students'] ?? 0) as int,
      weeklyHours: (summary['weekly_hours'] ?? 0) as int,
      classes: (j['classes'] as List? ?? [])
          .map((e) => TeacherClass.fromJson((e as Map).cast<String, dynamic>()))
          .toList(),
    );
  }
}

class SectionStudent {
  SectionStudent({required this.studentId, required this.studentNumber, required this.name});

  final String studentId;
  final String studentNumber;
  final String name;

  factory SectionStudent.fromJson(Map<String, dynamic> j) => SectionStudent(
        studentId: j['student_id']?.toString() ?? '',
        studentNumber: j['student_number']?.toString() ?? '',
        name: j['name']?.toString() ?? '—',
      );
}

enum AttendanceStatus {
  present,
  absent,
  late,
  excused,
}

extension AttendanceStatusExt on AttendanceStatus {
  String get code {
    switch (this) {
      case AttendanceStatus.present:
        return 'present';
      case AttendanceStatus.absent:
        return 'absent';
      case AttendanceStatus.late:
        return 'late';
      case AttendanceStatus.excused:
        return 'excused_absence';
    }
  }

  String get label {
    switch (this) {
      case AttendanceStatus.present:
        return 'حاضر';
      case AttendanceStatus.absent:
        return 'غائب';
      case AttendanceStatus.late:
        return 'متأخر';
      case AttendanceStatus.excused:
        return 'بعذر';
    }
  }

  static AttendanceStatus fromCode(String? c) {
    if (c == 'absent') return AttendanceStatus.absent;
    if (c == 'late') return AttendanceStatus.late;
    if (c == 'excused' || c == 'excused_absence') return AttendanceStatus.excused;
    return AttendanceStatus.present;
  }
}

class StudentAttendanceItem {
  StudentAttendanceItem({
    required this.studentId,
    required this.studentNumber,
    required this.name,
    this.gender,
    this.status = AttendanceStatus.present,
    this.notes = '',
    this.recorded = false,
  });

  final String studentId;
  final String studentNumber;
  final String name;
  final String? gender;
  AttendanceStatus status;
  String notes;
  final bool recorded;

  StudentAttendanceItem copyWith({
    AttendanceStatus? status,
    String? notes,
  }) {
    return StudentAttendanceItem(
      studentId: studentId,
      studentNumber: studentNumber,
      name: name,
      gender: gender,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      recorded: recorded,
    );
  }

  factory StudentAttendanceItem.fromJson(Map<String, dynamic> j) => StudentAttendanceItem(
        studentId: j['student_id']?.toString() ?? '',
        studentNumber: j['student_number']?.toString() ?? '',
        name: j['name']?.toString() ?? '—',
        gender: j['gender']?.toString(),
        status: AttendanceStatusExt.fromCode(j['status']?.toString()),
        notes: j['notes']?.toString() ?? '',
        recorded: j['recorded'] == true,
      );

  Map<String, dynamic> toJson() => {
        'student_id': studentId,
        'status': status.code,
        'notes': notes,
      };
}

class SectionAttendanceData {
  SectionAttendanceData({
    required this.date,
    required this.sectionId,
    required this.students,
    required this.total,
    required this.present,
    required this.absent,
    required this.late,
    required this.excused,
  });

  final String date;
  final String sectionId;
  final List<StudentAttendanceItem> students;
  final int total;
  final int present;
  final int absent;
  final int late;
  final int excused;

  factory SectionAttendanceData.fromJson(Map<String, dynamic> j) {
    final list = (j['students'] as List? ?? [])
        .map((e) => StudentAttendanceItem.fromJson((e as Map).cast<String, dynamic>()))
        .toList();
    final s = (j['summary'] as Map?)?.cast<String, dynamic>() ?? {};
    return SectionAttendanceData(
      date: j['date']?.toString() ?? '',
      sectionId: j['section_id']?.toString() ?? '',
      students: list,
      total: (s['total'] ?? list.length) as int,
      present: (s['present'] ?? 0) as int,
      absent: (s['absent'] ?? 0) as int,
      late: (s['late'] ?? 0) as int,
      excused: (s['excused'] ?? 0) as int,
    );
  }
}
