import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../auth/application/auth_controller.dart';

/// تبويب الحساب: بيانات ولي الأمر + تغيير كلمة المرور + تسجيل الخروج.
class ProfileTab extends ConsumerWidget {
  const ProfileTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('حسابي')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: NebrasTheme.accent.withAlpha(28),
                  child: const Icon(Icons.person, size: 44, color: NebrasTheme.accent),
                ),
                const SizedBox(height: 12),
                Text(session?.displayName ?? '',
                    style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800)),
                if (session?.email != null)
                  Text(session!.email!,
                      style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.lock_outline, color: NebrasTheme.accent),
              title: Text('تغيير كلمة المرور',
                  style: GoogleFonts.tajawal(fontWeight: FontWeight.w600)),
              trailing: const Icon(Icons.chevron_left),
              onTap: () => _showChangePassword(context, ref),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout, color: NebrasTheme.danger),
              title: Text('تسجيل الخروج',
                  style: GoogleFonts.tajawal(
                      fontWeight: FontWeight.w600, color: NebrasTheme.danger)),
              onTap: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ),
        ],
      ),
    );
  }

  void _showChangePassword(BuildContext context, WidgetRef ref) {
    final oldPass = TextEditingController();
    final newPass = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Directionality(
          textDirection: TextDirection.rtl,
          child: Padding(
            padding: EdgeInsets.only(
              left: 20, right: 20, top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('تغيير كلمة المرور',
                      style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: oldPass,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'كلمة المرور الحالية'),
                    validator: (v) => (v == null || v.isEmpty) ? 'مطلوب' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: newPass,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'كلمة المرور الجديدة'),
                    validator: (v) => (v == null || v.length < 8) ? '8 أحرف على الأقل' : null,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: saving
                          ? null
                          : () async {
                              if (!formKey.currentState!.validate()) return;
                              setSheet(() => saving = true);
                              try {
                                await ref
                                    .read(authRepositoryProvider)
                                    .changePassword(oldPass.text, newPass.text);
                                if (!ctx.mounted) return;
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('تم تغيير كلمة المرور.')),
                                );
                              } catch (e) {
                                setSheet(() => saving = false);
                                if (!ctx.mounted) return;
                                ScaffoldMessenger.of(ctx).showSnackBar(
                                  SnackBar(
                                      content: Text(e.toString()),
                                      backgroundColor: NebrasTheme.danger),
                                );
                              }
                            },
                      child: saving
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white))
                          : const Text('حفظ'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
