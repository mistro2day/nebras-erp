import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/auth/application/auth_controller.dart';
import 'package:nebras_mobile/features/admin/application/admin_providers.dart';
import 'tabs/admin_dashboard_tab.dart';
import 'tabs/admin_attendance_tab.dart';
import 'tabs/admin_approvals_tab.dart';
import 'tabs/admin_notifications_tab.dart';
import 'tabs/admin_profile_tab.dart';

/// قشرة بوابة الإدارة والمدراء (Admin Portal)
/// شريط التنقل المعماري المعتمد في الخطة: (الرئيسية، الحضور، الاعتمادات، الإشعارات، الحساب)
class AdminShell extends ConsumerStatefulWidget {
  const AdminShell({super.key});

  @override
  ConsumerState<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<AdminShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.invalidate(adminSummaryProvider);
      ref.invalidate(adminApprovalsProvider);
      ref.invalidate(liveAttendanceProvider);
    });
  }

  void _onNavigateTab(int index) {
    setState(() => _index = index);
  }

  @override
  Widget build(BuildContext context) {
    final approvalsAsync = ref.watch(adminApprovalsProvider);
    final pendingCount = approvalsAsync.value?.length ?? 0;

    final titles = [
      'نبراس • لوحة الإدارة',
      'الرقابة اللحظية للحضور',
      'مركز الاعتمادات والموافقات',
      'التعاميم والعمليات اليومية',
      'الملف الشخصي للإدارة',
    ];

    final tabs = [
      AdminDashboardTab(onNavigateTab: _onNavigateTab),
      const AdminAttendanceTab(),
      const AdminApprovalsTab(),
      const AdminNotificationsTab(),
      const AdminProfileTab(),
    ];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            titles[_index],
            style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Colors.white),
              tooltip: 'تحديث البيانات اللحظية',
              onPressed: () {
                ref.invalidate(adminSummaryProvider);
                ref.invalidate(adminApprovalsProvider);
                ref.invalidate(liveAttendanceProvider);
              },
            ),
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: Colors.white70),
              tooltip: 'تسجيل الخروج',
              onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ],
        ),
        body: IndexedStack(
          index: _index,
          children: tabs,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _index,
          onTap: _onNavigateTab,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: NebrasTheme.primary,
          unselectedItemColor: NebrasTheme.textMuted,
          selectedLabelStyle: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.bold),
          unselectedLabelStyle: GoogleFonts.tajawal(fontSize: 11),
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: 'الرئيسية',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.how_to_reg_outlined),
              activeIcon: Icon(Icons.how_to_reg_rounded),
              label: 'الحضور',
            ),
            BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: pendingCount > 0,
                label: Text('$pendingCount'),
                child: const Icon(Icons.approval_outlined),
              ),
              activeIcon: Badge(
                isLabelVisible: pendingCount > 0,
                label: Text('$pendingCount'),
                child: const Icon(Icons.approval_rounded),
              ),
              label: 'الاعتمادات',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.notifications_outlined),
              activeIcon: Icon(Icons.notifications_rounded),
              label: 'الإشعارات',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              activeIcon: Icon(Icons.person_rounded),
              label: 'الحساب',
            ),
          ],
        ),
      ),
    );
  }
}
