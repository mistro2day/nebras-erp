import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'core/theme/app_theme.dart';
import 'features/attendance/presentation/pages/teacher_attendance_page.dart';
import 'features/admin/presentation/pages/admin_dashboard_page.dart';
import 'features/faculty/presentation/pages/student_attendance_page.dart';
import 'features/student/presentation/pages/student_home_page.dart';

void main() {
  runApp(const NebrasMobileApp());
}

class NebrasMobileApp extends StatelessWidget {
  const NebrasMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nebras ERP',
      debugShowCheckedModeBanner: false,
      theme: NebrasTheme.lightTheme,
      locale: const Locale('ar', 'SA'),
      supportedLocales: const [
        Locale('ar', 'SA'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    TeacherAttendancePage(),
    AdminDashboardPage(),
    StudentAttendancePage(),
    StudentHomePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 16,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          selectedItemColor: NebrasTheme.primary,
          unselectedItemColor: NebrasTheme.textMuted,
          showUnselectedLabels: true,
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.fingerprint_rounded),
              label: 'حضور المعلم',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_rounded),
              label: 'الإدارة',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.checklist_rtl_rounded),
              label: 'تحضير الطلاب',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              label: 'بوابة الطالب',
            ),
          ],
        ),
      ),
    );
  }
}
