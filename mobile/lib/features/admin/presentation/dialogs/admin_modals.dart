import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admin/domain/admin_models.dart';

/// نوافذ ومودالات مخصصة فاخرة مطابقة لنظام تصميم نبراس OS
/// (تمنع منعاً باتاً استخدام أي alert أو confirm من المتصفح)

Future<void> showNebrasMessageModal({
  required BuildContext context,
  required String title,
  required String message,
  bool isSuccess = true,
}) {
  return showDialog(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: (isSuccess ? NebrasTheme.success : NebrasTheme.primary)
                      .withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isSuccess
                      ? Icons.check_circle_rounded
                      : Icons.info_outline_rounded,
                  color: isSuccess ? NebrasTheme.success : NebrasTheme.primary,
                  size: 36,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: GoogleFonts.tajawal(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: NebrasTheme.textDark,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                message,
                style: GoogleFonts.tajawal(
                  fontSize: 14,
                  color: NebrasTheme.textMuted,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NebrasTheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: Text(
                    'حسناً',
                    style: GoogleFonts.tajawal(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

Future<void> showApprovalDecisionModal({
  required BuildContext context,
  required ApprovalItem item,
  required bool isApprove,
  required Future<void> Function(String? reason) onConfirm,
}) {
  final reasonController = TextEditingController();

  return showDialog(
    context: context,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color:
                          (isApprove ? NebrasTheme.success : NebrasTheme.danger)
                              .withAlpha(25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isApprove ? Icons.check_rounded : Icons.close_rounded,
                      color: isApprove
                          ? NebrasTheme.success
                          : NebrasTheme.danger,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      isApprove ? 'تأكيد اعتماد الطلب' : 'رفض الطلب',
                      style: GoogleFonts.tajawal(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: NebrasTheme.textDark,
                      ),
                    ),
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
                    Text(
                      item.title,
                      style: GoogleFonts.tajawal(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${item.requesterName} - ${item.requesterRole}',
                      style: GoogleFonts.tajawal(
                        fontSize: 12,
                        color: NebrasTheme.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'ملاحظة القرار (اختياري):',
                style: GoogleFonts.tajawal(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: reasonController,
                maxLines: 2,
                decoration: InputDecoration(
                  hintText: isApprove
                      ? 'ملاحظة اعتماد...'
                      : 'اذكر سبب الرفض...',
                  hintStyle: GoogleFonts.tajawal(
                    fontSize: 13,
                    color: NebrasTheme.textMuted,
                  ),
                  filled: true,
                  fillColor: NebrasTheme.background,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: Text(
                        'إلغاء',
                        style: GoogleFonts.tajawal(
                          color: NebrasTheme.textMuted,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isApprove
                            ? NebrasTheme.success
                            : NebrasTheme.danger,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () async {
                        Navigator.of(ctx).pop();
                        await onConfirm(
                          reasonController.text.trim().isEmpty
                              ? null
                              : reasonController.text.trim(),
                        );
                      },
                      child: Text(
                        isApprove ? 'اعتماد' : 'تأكيد الرفض',
                        style: GoogleFonts.tajawal(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
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

Future<void> showGatePassModal({
  required BuildContext context,
  required Future<void> Function(DailyGatePass pass) onSubmit,
}) {
  final studentCtrl = TextEditingController();
  final classCtrl = TextEditingController();
  final guardianCtrl = TextEditingController();
  final reasonCtrl = TextEditingController();

  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
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
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withAlpha(25),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.meeting_room_rounded,
                      color: Color(0xFF6366F1),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'إصدار تصريح خروج مبكر (Gate Pass)',
                    style: GoogleFonts.tajawal(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: NebrasTheme.textDark,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildField(
                'اسم الطالب:',
                studentCtrl,
                'مثال: مهند دفع الله المهدي',
              ),
              _buildField(
                'الصف والفصل:',
                classCtrl,
                'مثال: الصف الثاني متوسط / أ',
              ),
              _buildField(
                'ولي الأمر / الشخص المستلم:',
                guardianCtrl,
                'مثال: والده - دفع الله المهدي',
              ),
              _buildField(
                'سبب الخروج المبكر:',
                reasonCtrl,
                'مثال: موعد طبي عاجل بمستشفى الخرطوم',
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NebrasTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  onPressed: () async {
                    if (studentCtrl.text.trim().isEmpty) return;
                    Navigator.of(ctx).pop();
                    await onSubmit(
                      DailyGatePass(
                        studentName: studentCtrl.text.trim(),
                        gradeAndSection: classCtrl.text.trim().isEmpty
                            ? 'عام'
                            : classCtrl.text.trim(),
                        guardianName: guardianCtrl.text.trim().isEmpty
                            ? 'ولي الأمر'
                            : guardianCtrl.text.trim(),
                        reason: reasonCtrl.text.trim().isEmpty
                            ? 'ظرف طارئ'
                            : reasonCtrl.text.trim(),
                        departureTime:
                            'الآن (${TimeOfDay.now().format(context)})',
                      ),
                    );
                    if (context.mounted) {
                      showNebrasMessageModal(
                        context: context,
                        title: 'تم إصدار تصريح الخروج',
                        message:
                            'تم تسجيل التصريح وتمرير إشعار الحارس بالبوابة وولي الأمر.',
                      );
                    }
                  },
                  child: Text(
                    'اعتماد وإصدار التصريح فوراً',
                    style: GoogleFonts.tajawal(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

Future<void> showAnnouncementModal({
  required BuildContext context,
  required Future<void> Function(SchoolAnnouncementPayload payload) onSubmit,
}) {
  final titleCtrl = TextEditingController();
  final contentCtrl = TextEditingController();
  String target = 'الكل';
  bool isUrgent = false;

  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    ),
    backgroundColor: Colors.white,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setModalState) => Directionality(
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
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.amber.withAlpha(30),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.campaign_rounded,
                        color: Colors.amber,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'بث تعميم مدرسي فوري',
                      style: GoogleFonts.tajawal(
                        fontSize: 17,
                        fontWeight: FontWeight.bold,
                        color: NebrasTheme.textDark,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildField(
                  'عنوان التعميم:',
                  titleCtrl,
                  'مثال: تعليق الدراسة الحضورية غداً لسوء الأحوال',
                ),
                const SizedBox(height: 10),
                Text(
                  'نص التعميم / الرسالة:',
                  style: GoogleFonts.tajawal(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: contentCtrl,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'اكتب نص التعميم بالتفصيل...',
                    hintStyle: GoogleFonts.tajawal(
                      fontSize: 13,
                      color: NebrasTheme.textMuted,
                    ),
                    filled: true,
                    fillColor: NebrasTheme.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'الفئة المستهدفة:',
                  style: GoogleFonts.tajawal(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: ['الكل', 'أولياء الأمور', 'المعلمين'].map((role) {
                    final isSel = target == role;
                    return Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: ChoiceChip(
                        label: Text(
                          role,
                          style: GoogleFonts.tajawal(
                            fontSize: 12,
                            fontWeight: isSel
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                        selected: isSel,
                        selectedColor: NebrasTheme.primary,
                        labelStyle: TextStyle(
                          color: isSel ? Colors.white : NebrasTheme.textDark,
                        ),
                        onSelected: (val) {
                          if (val) setModalState(() => target = role);
                        },
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(
                    'تنبيه عاجل (إشعار دفع منبثق فوري)',
                    style: GoogleFonts.tajawal(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  value: isUrgent,
                  activeThumbColor: NebrasTheme.danger,
                  onChanged: (val) => setModalState(() => isUrgent = val),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: NebrasTheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () async {
                      if (titleCtrl.text.trim().isEmpty) return;
                      Navigator.of(ctx).pop();
                      await onSubmit(
                        SchoolAnnouncementPayload(
                          title: titleCtrl.text.trim(),
                          content: contentCtrl.text.trim(),
                          targetAudience: target,
                          isUrgent: isUrgent,
                        ),
                      );
                      if (context.mounted) {
                        showNebrasMessageModal(
                          context: context,
                          title: 'تم إرسال التعميم بنجاح',
                          message:
                              'وصل التعميم إلى كافة المستخدمين المحددين عبر البوابة.',
                        );
                      }
                    },
                    child: Text(
                      'نشر وبث التعميم الآن',
                      style: GoogleFonts.tajawal(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
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

Widget _buildField(String label, TextEditingController ctrl, String hint) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.tajawal(
              fontSize: 13,
              color: NebrasTheme.textMuted,
            ),
            filled: true,
            fillColor: NebrasTheme.background,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
          ),
        ),
      ],
    ),
  );
}
