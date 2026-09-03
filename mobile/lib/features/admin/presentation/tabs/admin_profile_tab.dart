import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/auth/application/auth_controller.dart';
import '../dialogs/admin_modals.dart';

class AdminProfileTab extends ConsumerWidget {
  const AdminProfileTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 10),
          CircleAvatar(
            radius: 44,
            backgroundColor: NebrasTheme.primary.withAlpha(25),
            child: const Icon(Icons.admin_panel_settings_rounded, size: 52, color: NebrasTheme.primary),
          ),
          const SizedBox(height: 14),
          Text(
            session?.displayName ?? 'المدير العام',
            style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
          ),
          const SizedBox(height: 4),
          Text(
            session?.email ?? 'admin@nebras.edu',
            style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: NebrasTheme.primary.withAlpha(20),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              'صلاحيات الإدارة العليا والرقابة الكاملة',
              style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.bold, color: NebrasTheme.primary),
            ),
          ),

          const SizedBox(height: 28),

          // خيارات الحساب
          _buildCard([
            _buildTile(
              icon: Icons.school_outlined,
              title: 'المنشأة التعليمية',
              subtitle: 'مدارس المورد الخاصة - الخرطوم (السودان)',
            ),
            const Divider(height: 1, indent: 56),
            _buildTile(
              icon: Icons.lock_outline_rounded,
              title: 'تغيير كلمة المرور',
              subtitle: 'تحديث بيانات الدخول الخاصة بحساب الإدارة',
              onTap: () {
                showNebrasMessageModal(
                  context: context,
                  title: 'تغيير كلمة المرور',
                  message: 'يمكنك تغيير كلمة المرور بأمان من خلال إعدادات المنصة أو طلب رابط التعيين.',
                );
              },
            ),
            const Divider(height: 1, indent: 56),
            _buildTile(
              icon: Icons.notifications_active_outlined,
              title: 'إشعارات النظام',
              subtitle: 'تفعيل التنبيهات الفورية للاعتمادات والحالات الطارئة',
            ),
          ]),

          const SizedBox(height: 20),

          // زر تسجيل الخروج
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: NebrasTheme.danger,
                side: const BorderSide(color: NebrasTheme.danger),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              icon: const Icon(Icons.logout_rounded),
              label: Text('تسجيل الخروج من البوابة', style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold)),
              onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildTile({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: NebrasTheme.background, borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: NebrasTheme.primary, size: 22),
      ),
      title: Text(title, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
      subtitle: Text(subtitle, style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
      trailing: onTap != null ? const Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: NebrasTheme.textMuted) : null,
      onTap: onTap,
    );
  }
}
