import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../auth/application/auth_controller.dart';
import '../../application/teacher_providers.dart';
import '../../domain/models.dart';
import '../class_students_page.dart';

/// تبويب فصول المعلّم: بطاقات إسناداته (المادة/الشعبة/الصف/عدد الطلاب).
class ClassesTab extends ConsumerWidget {
  const ClassesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);
    final async = ref.watch(teacherDashboardProvider);
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('فصولي'),
            Text('أهلاً ${session?.displayName ?? ''}',
                style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70)),
          ],
        ),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: NebrasTheme.danger),
                const SizedBox(height: 12),
                Text(e.toString(),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(teacherDashboardProvider),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(teacherDashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(14),
            children: [
              Row(
                children: [
                  _stat('الفصول', '${d.classesCount}', Icons.class_),
                  const SizedBox(width: 10),
                  _stat('الطلاب', '${d.totalStudents}', Icons.groups),
                  const SizedBox(width: 10),
                  _stat('حصص/أسبوع', '${d.weeklyHours}', Icons.schedule),
                ],
              ),
              const SizedBox(height: 16),
              if (d.classes.isEmpty)
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(
                    child: Text('لا توجد إسنادات دراسية لك حالياً.',
                        style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
                  ),
                )
              else
                ...d.classes.map((c) => _ClassCard(cls: c)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: NebrasTheme.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: NebrasTheme.accent.withAlpha(30)),
        ),
        child: Column(
          children: [
            Icon(icon, color: NebrasTheme.accent, size: 24),
            const SizedBox(height: 6),
            Text(value, style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(label, style: GoogleFonts.tajawal(fontSize: 11, color: NebrasTheme.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({required this.cls});
  final TeacherClass cls;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ClassStudentsPage(
            sectionId: cls.sectionId,
            title: '${cls.subject} · ${cls.section ?? ''}',
          ),
        )),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: NebrasTheme.accent.withAlpha(24),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.menu_book, color: NebrasTheme.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(cls.subject,
                        style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('${cls.grade ?? ''} · شعبة ${cls.section ?? ''}',
                        style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                    const SizedBox(height: 4),
                    Text('${cls.students} طالب · ${cls.weeklyHours} حصص أسبوعياً',
                        style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.accent)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_left, color: NebrasTheme.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
