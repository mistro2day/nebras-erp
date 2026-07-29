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
