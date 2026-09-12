import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';

/// نافذة مخصصة راقية لعرض نجاح تقديم طلب تسجيل طالب جديد
Future<void> showAdmissionSuccessModal({
  required BuildContext context,
  required String applicationNumber,
  required String studentName,
  required String gradeName,
  required VoidCallback onClose,
}) {
  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Directionality(
      textDirection: TextDirection.rtl,
      child: Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // أيقونة النجاح والاحتفاء
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: NebrasTheme.success.withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: NebrasTheme.success,
                  size: 46,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'تم استلام طلب الالتحاق بنجاح!',
                textAlign: TextAlign.center,
                style: GoogleFonts.tajawal(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: NebrasTheme.textDark,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'سُجلت بيانات الطالب في نظام القبول بنجاح. يرجى الاحتفاظ برقم الطلب لتتبعه واستكمال إجراءات التسجيل.',
                textAlign: TextAlign.center,
                style: GoogleFonts.tajawal(
                  fontSize: 13,
                  color: NebrasTheme.textMuted,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              // بطاقة رقم الطلب المميزة
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    Text(
                      'رقم طلب الالتحاق المعتمد',
                      style: GoogleFonts.tajawal(
                        fontSize: 12,
                        color: NebrasTheme.textMuted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        SelectableText(
                          applicationNumber,
                          style: GoogleFonts.tajawal(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                            color: NebrasTheme.primary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 20, color: Color(0xFF4F46E5)),
                          tooltip: 'نسخ رقم الطلب',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: applicationNumber));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('تم نسخ رقم الطلب إلى الحافظة: $applicationNumber',
                                    style: GoogleFonts.tajawal()),
                                backgroundColor: NebrasTheme.success,
                                duration: const Duration(seconds: 2),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 16, thickness: 0.8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('اسم الطالب:',
                            style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                        Flexible(
                          child: Text(
                            studentName,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('الصف المطلوب:',
                            style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                        Flexible(
                          child: Text(
                            gradeName,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.tajawal(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF1B4D3E),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // إرشادات المتابعة
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFF059669), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'سيتم إشعار ولي الأمر عبر رسالة واتساب بموعد المقابلة الشخصية واختبار الجاهزية فور مراجعة المستندات.',
                        style: GoogleFonts.tajawal(
                          fontSize: 12,
                          color: const Color(0xFF065F46),
                          height: 1.35,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // أزرار التحكم
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NebrasTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    onClose();
                  },
                  child: Text(
                    'العودة لصفحة تسجيل الدخول',
                    style: GoogleFonts.tajawal(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
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
