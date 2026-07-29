import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../parent/presentation/tabs/profile_tab.dart';
import 'tabs/overview_tab.dart';
import 'tabs/grades_tab.dart';
import 'tabs/attendance_tab.dart';

/// قشرة بوابة الطالب: تبويبات (الرئيسية، الدرجات، الحضور، حسابي).
class StudentShell extends ConsumerStatefulWidget {
  const StudentShell({super.key});

  @override
  ConsumerState<StudentShell> createState() => _StudentShellState();
}

class _StudentShellState extends ConsumerState<StudentShell> {
  int _index = 0;

  static const _tabs = [
    StudentOverviewTab(),
    StudentGradesTab(),
    StudentAttendanceTab(),
    ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        body: IndexedStack(index: _index, children: _tabs),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _index,
          onTap: (i) => setState(() => _index = i),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: NebrasTheme.accent,
          unselectedItemColor: NebrasTheme.textMuted,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), label: 'الرئيسية'),
            BottomNavigationBarItem(icon: Icon(Icons.grade_outlined), label: 'الدرجات'),
            BottomNavigationBarItem(icon: Icon(Icons.event_available_outlined), label: 'الحضور'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'حسابي'),
          ],
        ),
      ),
    );
  }
}
