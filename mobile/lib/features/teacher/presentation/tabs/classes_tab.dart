import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../auth/application/auth_controller.dart';
import '../../application/teacher_providers.dart';
import '../../domain/models.dart';
import '../class_students_page.dart';
import '../take_attendance_page.dart';

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
    final title = '${cls.subject} · ${cls.grade ?? ''} (${cls.section ?? ''})';
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 1.5,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: NebrasTheme.accent.withAlpha(24),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.menu_book, color: NebrasTheme.accent, size: 26),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cls.subject,
                        style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${cls.grade ?? ''} · شعبة ${cls.section ?? ''}',
                        style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F3F5),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${cls.students} طالب',
                    style: GoogleFonts.tajawal(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            // أزرار الإجراءات السريعة
            Row(
              children: [
                // زر رصد الحضور الرئيسي
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B4D3E), // أخضر زمردي داكن نبراس
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: const Icon(Icons.fact_check_outlined, size: 18),
                    label: Text(
                      'رصد الحضور والغياب',
                      style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => TakeAttendancePage(
                          sectionId: cls.sectionId,
                          title: title,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // زر قائمة الطلاب
                Expanded(
                  flex: 2,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.black87,
                      side: BorderSide(color: Colors.grey.shade300),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: const Icon(Icons.people_outline, size: 18),
                    label: Text(
                      'الطلاب',
                      style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ClassStudentsPage(
                          sectionId: cls.sectionId,
                          title: title,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

