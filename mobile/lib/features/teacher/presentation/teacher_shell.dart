import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../parent/presentation/tabs/profile_tab.dart';
import 'tabs/classes_tab.dart';

/// قشرة بوابة المعلّم: تبويبات (فصولي، حسابي).
class TeacherShell extends ConsumerStatefulWidget {
  const TeacherShell({super.key});

  @override
  ConsumerState<TeacherShell> createState() => _TeacherShellState();
}

class _TeacherShellState extends ConsumerState<TeacherShell> {
  int _index = 0;

  static const _tabs = [ClassesTab(), ProfileTab()];

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
            BottomNavigationBarItem(icon: Icon(Icons.class_outlined), label: 'فصولي'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'حسابي'),
          ],
        ),
      ),
    );
  }
}
