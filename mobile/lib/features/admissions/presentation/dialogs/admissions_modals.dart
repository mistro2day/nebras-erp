import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import '../../domain/admission_models.dart';

Future<void> showApplicantDecisionModal({
  required BuildContext context,
  required ApplicantModel applicant,
  required bool isAccept,
  required Future<void> Function(String? reason) onConfirm,
}) {
  final reasonCtrl = TextEditingController();

  return showDialog(
    context: context,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (isAccept ? NebrasTheme.success : NebrasTheme.danger).withAlpha(25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isAccept ? Icons.verified_rounded : Icons.cancel_outlined,
                      color: isAccept ? NebrasTheme.success : NebrasTheme.danger,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    isAccept ? 'تأكيد قبول الطالب' : 'رفض طلب الالتحاق',
                    style: GoogleFonts.tajawal(fontSize: 17, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: NebrasTheme.background,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(applicant.arabicFullName, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text('الصف المطلوب: ${applicant.applyingGrade} • رقم الطلب: ${applicant.applicationNumber}',
                        style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isAccept ? 'ملاحظات القبول وسداد الرسوم:' : 'سبب الرفض والاعتذار:',
                style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: reasonCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: isAccept ? 'مثال: تم القبول، يُرجى سداد القسط الأول عبر تطبيق بنكك...' : 'مثال: اكتمال المقاعد في هذا الصف...',
                  hintStyle: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted),
                  filled: true,
                  fillColor: NebrasTheme.background,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: Text('إلغاء', style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isAccept ? NebrasTheme.success : NebrasTheme.danger,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () async {
                        Navigator.of(ctx).pop();
                        await onConfirm(reasonCtrl.text.trim().isEmpty ? null : reasonCtrl.text.trim());
                      },
                      child: Text(
                        isAccept ? 'تأكيد القبول' : 'تأكيد الرفض',
                        style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

Future<void> showScheduleInterviewModal({
  required BuildContext context,
  required ApplicantModel applicant,
  required Future<void> Function(DateTime scheduledAt, String? recommendation) onSchedule,
}) {
  final dateCtrl = TextEditingController(text: 'الخميس القادم - 09:00 صباحاً');
  final notesCtrl = TextEditingController(text: 'مقابلة شفوية واختبار قدرات تمهيدي');

  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
    backgroundColor: Colors.white,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          top: 24,
          left: 20,
          right: 20,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.blue.withAlpha(25), borderRadius: BorderRadius.circular(12)),
                    child: const Icon(Icons.event_available_rounded, color: Colors.blue, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Text('تحديد موعد مقابلة شخصية واختبار',
                      style: GoogleFonts.tajawal(fontSize: 17, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
                ],
              ),
              const SizedBox(height: 16),
              Text('المتقدم: ${applicant.arabicFullName}', style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 14),
              Text('الموعد والوقت المحدد:', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: dateCtrl,
                decoration: InputDecoration(
                  hintText: 'اليوم والوقت...',
                  filled: true,
                  fillColor: NebrasTheme.background,
                  prefixIcon: const Icon(Icons.calendar_today_rounded, size: 18),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 14),
              Text('تعليمات المقابلة / الاختبار:', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              TextField(
                controller: notesCtrl,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: 'ملاحظات وتوجيهات المقابلة...',
                  filled: true,
                  fillColor: NebrasTheme.background,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NebrasTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () async {
                    Navigator.of(ctx).pop();
                    await onSchedule(
                      DateTime.now().add(const Duration(days: 3)),
                      notesCtrl.text.trim(),
                    );
                  },
                  child: Text('حفظ الموعد وإرسال إشعار لولي الأمر',
                      style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
