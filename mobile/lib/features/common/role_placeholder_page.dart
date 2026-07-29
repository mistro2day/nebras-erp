import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/theme/app_theme.dart';
import '../auth/application/auth_controller.dart';

/// شاشة مؤقتة للأدوار غير المدعومة بعد (طالب/معلّم/إدارة) — قيد التطوير.
class RolePlaceholderPage extends ConsumerWidget {
  const RolePlaceholderPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('نبراس'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ],
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.construction_rounded, size: 64, color: NebrasTheme.textMuted),
                const SizedBox(height: 16),
                Text('أهلاً ${session?.displayName ?? ''}',
                    style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(
                  'تجربة هذا الدور قيد التطوير في التطبيق. تتوفّر حالياً بوابة ولي الأمر.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.tajawal(fontSize: 14, color: NebrasTheme.textMuted),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
