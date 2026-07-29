import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import 'tabs/home_tab.dart';
import 'tabs/payments_tab.dart';
import 'tabs/announcements_tab.dart';
import 'tabs/profile_tab.dart';

/// قشرة بوابة ولي الأمر: تبويبات سفلية (الأبناء، المدفوعات، الإعلانات، الحساب).
class ParentShell extends ConsumerStatefulWidget {
  const ParentShell({super.key});

  @override
  ConsumerState<ParentShell> createState() => _ParentShellState();
}

class _ParentShellState extends ConsumerState<ParentShell> {
  int _index = 0;

  static const _tabs = [HomeTab(), PaymentsTab(), AnnouncementsTab(), ProfileTab()];

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
            BottomNavigationBarItem(icon: Icon(Icons.family_restroom), label: 'الأبناء'),
            BottomNavigationBarItem(icon: Icon(Icons.payments_outlined), label: 'المدفوعات'),
            BottomNavigationBarItem(icon: Icon(Icons.campaign_outlined), label: 'الإعلانات'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'حسابي'),
          ],
        ),
      ),
    );
  }
}
