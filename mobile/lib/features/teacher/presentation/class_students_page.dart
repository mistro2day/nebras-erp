import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_theme.dart';
import '../application/teacher_providers.dart';

/// قائمة طلاب شعبة يدرّسها المعلّم.
class ClassStudentsPage extends ConsumerWidget {
  const ClassStudentsPage({super.key, required this.sectionId, required this.title});

  final String sectionId;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(sectionStudentsProvider(sectionId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: Text(title)),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(e.toString(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
            ),
          ),
          data: (students) {
            if (students.isEmpty) {
              return Center(
                child: Text('لا يوجد طلاب مسكَّنون في هذه الشعبة.',
                    style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(14),
              itemCount: students.length,
              separatorBuilder: (_, _) => const SizedBox(height: 6),
              itemBuilder: (c, i) {
                final s = students[i];
                return Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: NebrasTheme.accent.withAlpha(24),
                      child: Text('${i + 1}',
                          style: GoogleFonts.tajawal(
                              fontWeight: FontWeight.w700, color: NebrasTheme.accent)),
                    ),
                    title: Text(s.name,
                        style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
                    subtitle: Text(s.studentNumber, style: GoogleFonts.tajawal(fontSize: 12)),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
