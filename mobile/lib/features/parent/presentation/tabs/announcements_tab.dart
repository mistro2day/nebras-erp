import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/ui/format.dart';
import '../../application/parent_providers.dart';

/// تبويب الإعلانات المدرسية.
class AnnouncementsTab extends ConsumerWidget {
  const AnnouncementsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(announcementsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('إعلانات المدرسة')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(e.toString(),
              style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Text('لا توجد إعلانات حالياً.',
                  style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(announcementsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: items.length,
              itemBuilder: (c, i) {
                final a = items[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.campaign, color: NebrasTheme.accent, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(a.title,
                                  style: GoogleFonts.tajawal(
                                      fontSize: 15, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                        if (a.date != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 2, right: 28),
                            child: Text(prettyDate(a.date),
                                style: GoogleFonts.tajawal(
                                    fontSize: 11, color: NebrasTheme.textMuted)),
                          ),
                        const SizedBox(height: 8),
                        Text(a.body,
                            style: GoogleFonts.tajawal(
                                fontSize: 13, color: NebrasTheme.textDark, height: 1.6)),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
