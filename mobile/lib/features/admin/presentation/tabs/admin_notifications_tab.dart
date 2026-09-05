import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admin/application/admin_providers.dart';
import '../dialogs/admin_modals.dart';

class AdminNotificationsTab extends ConsumerWidget {
  const AdminNotificationsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // بطاقة إرسال تعميم عاجل
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.amber.shade700, Colors.amber.shade900],
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
              ),
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: Colors.amber.shade900.withAlpha(50),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(30),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.campaign_rounded,
                    color: Colors.white,
                    size: 30,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'مركز التعاميم والبث الفوري',
                        style: GoogleFonts.tajawal(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'إرسال إشعارات عاجلة لأولياء الأمور والمعلمين',
                        style: GoogleFonts.tajawal(
                          fontSize: 12,
                          color: Colors.white.withAlpha(220),
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.amber.shade900,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                  ),
                  onPressed: () {
                    showAnnouncementModal(
                      context: context,
                      onSubmit: (p) => ref
                          .read(adminRepositoryProvider)
                          .submitAnnouncement(p),
                    );
                  },
                  child: Text(
                    'بث جديد',
                    style: GoogleFonts.tajawal(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // قسم النماذج السريعة الأكثر استخداماً
          Text(
            'نماذج العمليات اليومية الأكثر استخداماً',
            style: GoogleFonts.tajawal(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: NebrasTheme.textDark,
            ),
          ),
          const SizedBox(height: 12),

          _buildFormLauncherCard(
            context,
            title: 'تصريح خروج مبكر (Gate Pass)',
            description:
                'إذن مغادرة طالب أثناء الدوام المدرسي وتسليمه لولي الأمر عند البوابة.',
            icon: Icons.meeting_room_rounded,
            color: const Color(0xFF6366F1),
            onTap: () {
              showGatePassModal(
                context: context,
                onSubmit: (pass) =>
                    ref.read(adminRepositoryProvider).submitGatePass(pass),
              );
            },
          ),
          const SizedBox(height: 10),

          _buildFormLauncherCard(
            context,
            title: 'رصد واقعة / ملاحظة سلوكية',
            description:
                'توثيق مخالفة أو تميز سلوكي لطالب مع إشعار ولي أمره آلياً.',
            icon: Icons.report_problem_rounded,
            color: Colors.deepOrange,
            onTap: () {
              showNebrasMessageModal(
                context: context,
                title: 'نموذج الرصد السلوكي',
                message:
                    'تم فتح نافذة الرصد وتوثيق الواقعة في ملف الطالب الأكاديمي.',
              );
            },
          ),
          const SizedBox(height: 10),

          _buildFormLauncherCard(
            context,
            title: 'اعتماد وتوثيق عذر غياب',
            description:
                'تحويل حالة الغياب من غير مبرر إلى غياب رسمي معتمد مع إرفاق التقرير.',
            icon: Icons.verified_user_rounded,
            color: NebrasTheme.success,
            onTap: () {
              showNebrasMessageModal(
                context: context,
                title: 'اعتماد عذر الغياب',
                message:
                    'تم توثيق وتأكيد العذر النظامي في سجلات الحضور والانصراف.',
              );
            },
          ),

          const SizedBox(height: 24),

          // سجل التعاميم والإشعارات الأخيرة
          Text(
            'التعاميم المدرسية الأخيرة',
            style: GoogleFonts.tajawal(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: NebrasTheme.textDark,
            ),
          ),
          const SizedBox(height: 10),

          _buildRecentAnnouncement(
            title: 'مواعيد الدوام الشتوي المحدثة',
            target: 'الكل (أولياء أمور ومعلمين)',
            date: 'اليوم • 07:15 ص',
            content:
                'نود إحاطتكم بأن الاصطفاف الصباحي سيبدأ غداً في تمام الساعة 07:15 صباحاً.',
          ),
          const SizedBox(height: 10),

          _buildRecentAnnouncement(
            title: 'اجتماع مجلس التطوير الأكاديمي',
            target: 'الكادر التعليمي',
            date: 'أمس • 01:30 م',
            content:
                'سيعقد الاجتماع الدوري لمراجعة مخرجات اختبارات منتصف الفصل في القاعة الرئيسية.',
          ),
        ],
      ),
    );
  }

  Widget _buildFormLauncherCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(4),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withAlpha(25),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.tajawal(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: NebrasTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    description,
                    style: GoogleFonts.tajawal(
                      fontSize: 11,
                      color: NebrasTheme.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_back_ios_new_rounded,
              size: 14,
              color: NebrasTheme.textMuted,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentAnnouncement({
    required String title,
    required String target,
    required String date,
    required String content,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: GoogleFonts.tajawal(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: NebrasTheme.textDark,
                ),
              ),
              const Spacer(),
              Text(
                date,
                style: GoogleFonts.tajawal(
                  fontSize: 11,
                  color: NebrasTheme.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              target,
              style: GoogleFonts.tajawal(
                fontSize: 10,
                color: Colors.blue.shade800,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            content,
            style: GoogleFonts.tajawal(
              fontSize: 12,
              color: NebrasTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
