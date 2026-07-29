import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../application/student_providers.dart';
import '../../domain/models.dart';

/// تبويب الدرجات: كل درجات الطالب المرصودة مع نسبة النجاح.
class StudentGradesTab extends ConsumerWidget {
  const StudentGradesTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(studentDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('كشف الدرجات')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(e.toString(),
              style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
        ),
        data: (d) {
          if (d.grades.isEmpty) {
            return Center(
              child: Text('لا توجد درجات مرصودة بعد.',
                  style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(studentDashboardProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: d.grades.length,
              itemBuilder: (c, i) => _GradeCard(g: d.grades[i]),
            ),
          );
        },
      ),
    );
  }
}

class _GradeCard extends StatelessWidget {
  const _GradeCard({required this.g});
  final StudentGrade g;

  @override
  Widget build(BuildContext context) {
    final color = !g.isPresent
        ? NebrasTheme.textMuted
        : (g.passed ? NebrasTheme.success : NebrasTheme.danger);
    final pct = (g.percentage.clamp(0, 100)) / 100.0;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(g.examName,
                      style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
                Text(
                  g.isPresent ? '${g.marksObtained.toStringAsFixed(0)} / ${g.maxMarks.toStringAsFixed(0)}' : 'غائب',
                  style: GoogleFonts.tajawal(
                      fontSize: 15, fontWeight: FontWeight.w800, color: color),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(g.term, style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: g.isPresent ? pct : 0,
                minHeight: 8,
                backgroundColor: NebrasTheme.textMuted.withAlpha(30),
                valueColor: AlwaysStoppedAnimation(color),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              g.isPresent
                  ? '${g.percentage.toStringAsFixed(0)}% · ${g.passed ? 'ناجح' : 'دون درجة النجاح'}'
                  : 'لم يحضر الامتحان',
              style: GoogleFonts.tajawal(fontSize: 12, color: color, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
