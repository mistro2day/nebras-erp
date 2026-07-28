import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';

class StudentHomePage extends StatelessWidget {
  const StudentHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("بوابة الطالب وولي الأمر"),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_none_rounded), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [NebrasTheme.secondary, NebrasTheme.primary]),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: [
                  const CircleAvatar(radius: 26, backgroundColor: Colors.white24, child: Icon(Icons.school, color: Colors.white, size: 30)),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("الطالب: عبد الله أحمد النجار", style: GoogleFonts.tajawal(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                        Text("الصف الثالث المتوسط - الفصل أ", style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Attendance & Performance Quick Stats
            Row(
              children: [
                Expanded(child: _buildStatCard("نسبة الحضور", "98%", Icons.fact_check_rounded, NebrasTheme.success)),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard("المعدل الأكاديمي", "96.5%", Icons.grade_rounded, NebrasTheme.secondary)),
              ],
            ),

            const SizedBox(height: 24),

            // Financial Status Bar Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.black.withOpacity(0.06)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: NebrasTheme.warning.withOpacity(0.1), shape: BoxShape.circle),
                    child: const Icon(Icons.account_balance_wallet_rounded, color: NebrasTheme.warning),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("الرسوم الدراسية المتبقية", style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
                        Text("1,500 ر.س (القسط الثاني)", style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: NebrasTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {},
                    child: Text("سداد الآن", style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            Text("جدول حصص اليوم", style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            _buildScheduleItem("الحصة الأولى (08:00 ص)", "الرياضيات", "أستاذ أحمد علي", "معمل 1"),
            _buildScheduleItem("الحصة الثانية (08:50 ص)", "اللغة الإنجليزية", "أستاذ عمر الفاروق", "قاعة 3"),
            _buildScheduleItem("الحصة الثالثة (09:40 ص)", "العلوم العامة", "أستاذ خالد عبد الله", "مختبر العلوم"),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(title, style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
        ],
      ),
    );
  }

  Widget _buildScheduleItem(String time, String subject, String teacher, String room) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 40,
            decoration: BoxDecoration(color: NebrasTheme.secondary, borderRadius: BorderRadius.circular(4)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(subject, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 15)),
                Text("$teacher · $room", style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
              ],
            ),
          ),
          Text(time, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.bold, color: NebrasTheme.primary)),
        ],
      ),
    );
  }
}
