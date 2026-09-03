import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/auth/application/auth_controller.dart';
import 'package:nebras_mobile/features/admin/application/admin_providers.dart';
import 'package:nebras_mobile/features/admin/domain/admin_models.dart';
import '../dialogs/admin_modals.dart';

class AdminDashboardTab extends ConsumerWidget {
  final void Function(int tabIndex) onNavigateTab;

  const AdminDashboardTab({super.key, required this.onNavigateTab});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authControllerProvider);
    final summaryAsync = ref.watch(adminSummaryProvider);
    final summary = summaryAsync.value ?? AdminDashboardSummary.mock();

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(adminSummaryProvider);
        ref.invalidate(adminApprovalsProvider);
      },
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ترويسة الترحيب والتاريخ
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: NebrasTheme.primary.withAlpha(30),
                  child: const Icon(Icons.admin_panel_settings_rounded, color: NebrasTheme.primary, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'مرحباً، ${session?.displayName ?? "المدير العام"}',
                        style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'الرقابة اللحظية ونبض المدرسة اليومي',
                        style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: NebrasTheme.success.withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.fiber_manual_record, color: NebrasTheme.success, size: 10),
                      const SizedBox(width: 6),
                      Text('النظام متصل', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.bold, color: NebrasTheme.success)),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // بطاقة مؤشرات الحضور اللحظية (نبض اليوم)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [NebrasTheme.primary, Color(0xFF2E2A72)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: NebrasTheme.primary.withAlpha(50),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'مؤشر الحضور اللحظي اليوم',
                        style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      InkWell(
                        onTap: () => onNavigateTab(1), // الانتقال لتبويب الحضور
                        borderRadius: BorderRadius.circular(8),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          child: Row(
                            children: [
                              Text('كشف الحضور', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70)),
                              const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 12),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      // نسبة حضور الطلاب
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(20),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('حضور الطلاب', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70)),
                              const SizedBox(height: 6),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    '${summary.studentAttendanceRate.toStringAsFixed(1)}%',
                                    style: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '(${summary.presentStudents}/${summary.totalStudents})',
                                    style: GoogleFonts.tajawal(fontSize: 11, color: Colors.white70),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // نسبة حضور الكادر
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(20),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('حضور الكادر', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70)),
                              const SizedBox(height: 6),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    '${summary.staffAttendanceRate.toStringAsFixed(1)}%',
                                    style: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '(${summary.presentStaff}/${summary.totalStaff})',
                                    style: GoogleFonts.tajawal(fontSize: 11, color: Colors.white70),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // شريط الاعتمادات المعلقة
            if (summary.pendingApprovalsCount > 0)
              InkWell(
                onTap: () => onNavigateTab(2), // الانتقال لتبويب الاعتمادات
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.amber.shade300),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.amber.shade200, shape: BoxShape.circle),
                        child: const Icon(Icons.pending_actions_rounded, color: Colors.brown, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'لديك ${summary.pendingApprovalsCount} طلبات اعتماد بانتظار قرارك',
                              style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.brown.shade800),
                            ),
                            Text('إجازات، أذونات انصراف، وإيصالات سداد بنكية', style: GoogleFonts.tajawal(fontSize: 11, color: Colors.brown.shade600)),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_back_ios_new_rounded, size: 14, color: Colors.brown),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 12),

            // بطاقة إدارة القبول والتسجيل
            InkWell(
              onTap: () => context.push('/admin/admissions'),
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF0284C7).withAlpha(50)),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFF0284C7).withAlpha(15), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withAlpha(20),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.how_to_reg_rounded, color: Color(0xFF0284C7), size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'إدارة القبول والتسجيل',
                            style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'فحص طلبات الالتحاق، المقابلات، وقرارات القبول',
                            style: GoogleFonts.tajawal(fontSize: 11, color: NebrasTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withAlpha(15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('فتح الإدارة', style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF0284C7))),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_back_ios_new_rounded, size: 10, color: Color(0xFF0284C7)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 22),

            // عنوان النماذج السريعة الأكثر استخداماً
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'إجراءات الروتين اليومي السريعة',
                  style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
                ),
                TextButton(
                  onPressed: () => onNavigateTab(3), // تبويب النماذج
                  child: Text('عرض الكل', style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.accent, fontWeight: FontWeight.bold)),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // شبكة الوصول السريع للنماذج
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.35,
              children: [
                _buildActionCard(
                  context,
                  title: 'إذن خروج مبكر',
                  subtitle: 'Gate Pass للطلاب',
                  icon: Icons.meeting_room_rounded,
                  color: const Color(0xFF6366F1),
                  onTap: () {
                    showGatePassModal(
                      context: context,
                      onSubmit: (pass) => ref.read(adminRepositoryProvider).submitGatePass(pass),
                    );
                  },
                ),
                _buildActionCard(
                  context,
                  title: 'تعميم مدرسي',
                  subtitle: 'بث فوري عبر البوابة',
                  icon: Icons.campaign_rounded,
                  color: Colors.amber.shade800,
                  onTap: () {
                    showAnnouncementModal(
                      context: context,
                      onSubmit: (p) => ref.read(adminRepositoryProvider).submitAnnouncement(p),
                    );
                  },
                ),
                _buildActionCard(
                  context,
                  title: 'كشف الحضور اللحظي',
                  subtitle: 'متابعة الكادر والطلاب',
                  icon: Icons.how_to_reg_rounded,
                  color: NebrasTheme.success,
                  onTap: () => onNavigateTab(1),
                ),
                _buildActionCard(
                  context,
                  title: 'التحصيلات اليومية',
                  subtitle: '${summary.todayCollectedAmount.toInt()} ج.س محصلة',
                  icon: Icons.account_balance_wallet_rounded,
                  color: const Color(0xFF0EA5E9),
                  onTap: () => onNavigateTab(3),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              subtitle,
              style: GoogleFonts.tajawal(fontSize: 11, color: NebrasTheme.textMuted),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
