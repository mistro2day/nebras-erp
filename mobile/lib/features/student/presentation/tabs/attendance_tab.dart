import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/ui/format.dart';
import '../../application/student_providers.dart';

/// تبويب الحضور: نسبة الحضور + سجل الأيام الأخيرة.
class StudentAttendanceTab extends ConsumerWidget {
  const StudentAttendanceTab({super.key});

  ({Color color, String label, IconData icon}) _status(String s) {
    switch (s) {
      case 'present':
        return (color: NebrasTheme.success, label: 'حاضر', icon: Icons.check_circle);
      case 'absent':
        return (color: NebrasTheme.danger, label: 'غائب', icon: Icons.cancel);
      case 'late':
        return (color: NebrasTheme.warning, label: 'متأخّر', icon: Icons.schedule);
      default:
        return (color: NebrasTheme.textMuted, label: s, icon: Icons.info_outline);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(studentDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('سجل الحضور')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(e.toString(),
              style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
        ),
        data: (d) {
          final a = d.attendance;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(studentDashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [NebrasTheme.success, Color(0xFF047857)]),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    children: [
                      Text('نسبة الحضور',
                          style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 13)),
                      const SizedBox(height: 6),
                      Text('${a.rate.toStringAsFixed(1)}%',
                          style: GoogleFonts.tajawal(
                              color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text('حاضر ${a.present} · غائب ${a.absent} · إجمالي ${a.total}',
                          style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                Text('آخر الأيام',
                    style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                if (a.recent.isEmpty)
                  Text('لا توجد سجلّات حضور بعد.',
                      style: GoogleFonts.tajawal(color: NebrasTheme.textMuted, fontSize: 13))
                else
                  ...a.recent.map((r) {
                    final st = _status(r['status']?.toString() ?? '');
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: Icon(st.icon, color: st.color),
                        title: Text(prettyDate(r['date']?.toString()),
                            style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
                        trailing: Text(st.label,
                            style: GoogleFonts.tajawal(
                                fontWeight: FontWeight.w700, color: st.color)),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}
