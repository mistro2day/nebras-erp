import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/ui/format.dart';
import '../../../auth/application/auth_controller.dart';
import '../../application/student_providers.dart';
import '../../domain/models.dart';

/// تبويب الرئيسية: بطاقة الطالب + نِسب سريعة (الحضور، المستحقّات، عدد الدرجات).
class StudentOverviewTab extends ConsumerWidget {
  const StudentOverviewTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);
    final async = ref.watch(studentDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('لوحتي')),
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
                  onPressed: () => ref.invalidate(studentDashboardProvider),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(studentDashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _identity(d, session?.displayName),
              const SizedBox(height: 16),
              Row(
                children: [
                  _stat('نسبة الحضور', '${d.attendance.rate.toStringAsFixed(0)}%',
                      Icons.event_available, NebrasTheme.success),
                  const SizedBox(width: 12),
                  _stat('عدد الدرجات', '${d.grades.length}',
                      Icons.grade, NebrasTheme.accent),
                ],
              ),
              const SizedBox(height: 12),
              _financeCard(d),
              const SizedBox(height: 20),
              Text('أحدث الدرجات',
                  style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              if (d.grades.isEmpty)
                Text('لا توجد درجات مرصودة بعد.',
                    style: GoogleFonts.tajawal(color: NebrasTheme.textMuted, fontSize: 13))
              else
                ...d.grades.take(3).map(_gradeRow),
            ],
          ),
        ),
      ),
    );
  }

  Widget _identity(StudentDashboard d, String? fallback) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [NebrasTheme.primary, NebrasTheme.accent]),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white24,
            child: Icon(Icons.school, color: Colors.white, size: 30),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(d.name ?? fallback ?? 'طالب',
                    style: GoogleFonts.tajawal(
                        color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('${d.gradeLevel ?? '—'} · ${d.studentNumber ?? ''}',
                    style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 13)),
                if (d.academicYear != null)
                  Text('العام الدراسي: ${d.academicYear}',
                      style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: NebrasTheme.cardBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withAlpha(40)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 8),
            Text(value,
                style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.w800)),
            Text(label,
                style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _financeCard(StudentDashboard d) {
    final hasDebt = d.outstandingBalance > 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: (hasDebt ? NebrasTheme.danger : NebrasTheme.success).withAlpha(20),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Icon(hasDebt ? Icons.account_balance_wallet : Icons.check_circle,
              color: hasDebt ? NebrasTheme.danger : NebrasTheme.success),
          const SizedBox(width: 12),
          Expanded(
            child: Text(hasDebt ? 'رسوم متبقّية عليك' : 'لا توجد مستحقّات مالية',
                style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w600)),
          ),
          Text(hasDebt ? money(d.outstandingBalance) : '',
              style: GoogleFonts.tajawal(
                  fontWeight: FontWeight.w800, color: NebrasTheme.danger)),
        ],
      ),
    );
  }

  Widget _gradeRow(StudentGrade g) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(g.examName,
            style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text(g.term, style: GoogleFonts.tajawal(fontSize: 12)),
        trailing: Text('${g.marksObtained.toStringAsFixed(0)} / ${g.maxMarks.toStringAsFixed(0)}',
            style: GoogleFonts.tajawal(
                fontWeight: FontWeight.w800,
                color: g.passed ? NebrasTheme.success : NebrasTheme.danger)),
      ),
    );
  }
}
