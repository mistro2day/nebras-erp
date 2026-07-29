import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/ui/format.dart';
import '../../../auth/application/auth_controller.dart';
import '../../application/parent_providers.dart';
import '../../domain/models.dart';

/// تبويب الأبناء: قائمة أبناء ولي الأمر مع رصيد كلٍّ.
class HomeTab extends ConsumerWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);
    final async = ref.watch(childrenProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('أبنائي')),
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
                  onPressed: () => ref.invalidate(childrenProvider),
                  child: const Text('إعادة المحاولة'),
                ),
              ],
            ),
          ),
        ),
        data: (children) {
          if (children.isEmpty) {
            return Center(
              child: Text('لا يوجد أبناء مرتبطون بحسابك.',
                  style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
            );
          }
          final totalOutstanding =
              children.fold<double>(0, (s, c) => s + c.outstandingBalance);
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(childrenProvider),
            child: ListView(
              padding: const EdgeInsets.all(14),
              children: [
                _welcomeHeader(session?.displayName, children.length, totalOutstanding),
                const SizedBox(height: 14),
                ...children.map((c) => _ChildCard(child: c)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _welcomeHeader(String? parentName, int childrenCount, double totalOutstanding) {
    final hasDebt = totalOutstanding > 0;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [NebrasTheme.primary, NebrasTheme.accent]),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(
                radius: 22,
                backgroundColor: Colors.white24,
                child: Icon(Icons.person, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('أهلاً بك',
                        style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12)),
                    Text(parentName ?? 'ولي الأمر',
                        style: GoogleFonts.tajawal(
                            color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _headerStat('الأبناء', '$childrenCount'),
              Container(width: 1, height: 34, color: Colors.white24),
              _headerStat('إجمالي المتبقّي',
                  hasDebt ? money(totalOutstanding) : 'لا مستحقّات'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _headerStat(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: GoogleFonts.tajawal(
                  color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(label, style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12)),
        ],
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard({required this.child});
  final ChildSummary child;

  @override
  Widget build(BuildContext context) {
    final hasDebt = child.outstandingBalance > 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/parent/child/${child.studentId}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: NebrasTheme.accent.withAlpha(28),
                child: const Icon(Icons.person, color: NebrasTheme.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(child.name,
                        style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('${child.gradeLevel ?? '—'} · ${child.studentNumber}',
                        style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: (hasDebt ? NebrasTheme.danger : NebrasTheme.success).withAlpha(24),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        hasDebt ? 'متبقٍّ: ${money(child.outstandingBalance)}' : 'لا مستحقّات',
                        style: GoogleFonts.tajawal(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: hasDebt ? NebrasTheme.danger : NebrasTheme.success),
                      ),
                    ),
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
