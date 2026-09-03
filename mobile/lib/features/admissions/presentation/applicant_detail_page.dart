import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admissions/domain/admission_models.dart';
import 'package:nebras_mobile/features/admissions/application/admission_providers.dart';
import 'dialogs/admissions_modals.dart';

class ApplicantDetailPage extends ConsumerWidget {
  final String applicantId;

  const ApplicantDetailPage({super.key, required this.applicantId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final applicantAsync = ref.watch(applicantDetailProvider(applicantId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text('ملف المتقدم للالتحاق',
              style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
        body: applicantAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, _) => Center(child: Text('تعذر تحميل بيانات الطلب.', style: GoogleFonts.tajawal())),
          data: (app) => SingleChildScrollView(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // بطاقة رأس الملف
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [NebrasTheme.primary, Color(0xFF2E2A72)],
                      begin: Alignment.topRight,
                      end: Alignment.bottomLeft,
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(color: NebrasTheme.primary.withAlpha(40), blurRadius: 14, offset: const Offset(0, 6)),
                    ],
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: Colors.white.withAlpha(30),
                        child: const Icon(Icons.school_rounded, color: Colors.white, size: 34),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              app.arabicFullName,
                              style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'رقم الطلب: ${app.applicationNumber}',
                              style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: Colors.white.withAlpha(25), borderRadius: BorderRadius.circular(8)),
                              child: Text(
                                'الصف المستهدف: ${app.applyingGrade}',
                                style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: _statusBg(app.status),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          statusToDisplayLabel(app.status),
                          style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // البيانات الأكاديمية والشخصية
                _buildSectionTitle('البيانات الشخصية والأكاديمية:'),
                const SizedBox(height: 8),
                _buildInfoCard([
                  _buildRow('الرقم الوطني:', app.nationalId.isNotEmpty ? app.nationalId : 'غير مسجل'),
                  _buildRow('تاريخ الميلاد:', app.dateOfBirth.isNotEmpty ? app.dateOfBirth : 'غير مسجل'),
                  _buildRow('النوع:', app.gender),
                  if (app.previousSchool != null && app.previousSchool!.isNotEmpty) _buildRow('المدرسة السابقة:', app.previousSchool!),
                  if (app.previousGrade != null && app.previousGrade!.isNotEmpty) _buildRow('الصف السابق:', app.previousGrade!),
                  _buildRow('تاريخ التقديم:', '${app.createdAt.year}-${app.createdAt.month.toString().padLeft(2, '0')}-${app.createdAt.day.toString().padLeft(2, '0')}'),
                ]),

                const SizedBox(height: 20),

                // بيانات ولي الأمر والتواصل
                if (app.primaryGuardian != null) ...[
                  _buildSectionTitle('بيانات ولي الأمر والتواصل:'),
                  const SizedBox(height: 8),
                  _buildInfoCard([
                    _buildRow('اسم ولي الأمر:', app.primaryGuardian!.fullName),
                    _buildRow('صلة القرابة:', app.primaryGuardian!.relationship),
                    _buildRow('رقم الهاتف:', app.primaryGuardian!.phone),
                    _buildRow('رقم الواتساب:', app.primaryGuardian!.whatsappPhone ?? app.primaryGuardian!.phone),
                    if (app.primaryGuardian!.occupation != null) _buildRow('المهنة:', app.primaryGuardian!.occupation!),
                    if (app.primaryGuardian!.address != null) _buildRow('السكن / العنوان:', app.primaryGuardian!.address!),
                  ]),
                  const SizedBox(height: 12),
                  // زر المراسلة السريعة عبر الواتساب
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF10B981),
                        side: const BorderSide(color: Color(0xFF10B981)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.chat_bubble_outline_rounded),
                      label: Text(
                        'مراسلة ولي الأمر عبر تطبيق الواتساب (+249)',
                        style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'جاري فتح محادثة واتساب مع: ${app.primaryGuardian!.phone}',
                              style: GoogleFonts.tajawal(),
                            ),
                            backgroundColor: NebrasTheme.primary,
                          ),
                        );
                      },
                    ),
                  ),
                ],

                if (app.notes != null && app.notes!.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  _buildSectionTitle('ملاحظات المراجعة:'),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Text(app.notes!, style: GoogleFonts.tajawal(fontSize: 13, color: Colors.brown.shade800)),
                  ),
                ],

                const SizedBox(height: 28),

                // أزرار القرارات السريعة
                Text('إجراءات وقرارات القبول:',
                    style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: NebrasTheme.success,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.check_circle_outline_rounded, color: Colors.white),
                        label: Text('اعتماد القبول',
                            style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                        onPressed: () {
                          showApplicantDecisionModal(
                            context: context,
                            applicant: app,
                            isAccept: true,
                            onConfirm: (reason) async {
                              await ref.read(admissionsRepositoryProvider).updateApplicantStatus(
                                    app.id,
                                    ApplicantStatus.accepted,
                                    reason: reason,
                                  );
                              ref.invalidate(admissionsStatsProvider);
                              ref.invalidate(admissionsListProvider);
                              ref.invalidate(applicantDetailProvider(app.id));
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.amber.shade900,
                          side: BorderSide(color: Colors.amber.shade800),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.event_available_rounded),
                        label: Text('موعد مقابلة',
                            style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          showScheduleInterviewModal(
                            context: context,
                            applicant: app,
                            onSchedule: (dt, rec) async {
                              await ref.read(admissionsRepositoryProvider).scheduleInterview(
                                    app.id,
                                    dt,
                                    recommendation: rec,
                                  );
                              ref.invalidate(admissionsStatsProvider);
                              ref.invalidate(admissionsListProvider);
                              ref.invalidate(applicantDetailProvider(app.id));
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: NebrasTheme.danger,
                      side: const BorderSide(color: NebrasTheme.danger),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.cancel_outlined),
                    label: Text('رفض طلب الالتحاق والاعتذار',
                        style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      showApplicantDecisionModal(
                        context: context,
                        applicant: app,
                        isAccept: false,
                        onConfirm: (reason) async {
                          await ref.read(admissionsRepositoryProvider).updateApplicantStatus(
                                app.id,
                                ApplicantStatus.rejected,
                                reason: reason,
                              );
                          ref.invalidate(admissionsStatsProvider);
                          ref.invalidate(admissionsListProvider);
                          ref.invalidate(applicantDetailProvider(app.id));
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _statusBg(ApplicantStatus s) {
    switch (s) {
      case ApplicantStatus.accepted:
      case ApplicantStatus.enrolled:
        return NebrasTheme.success;
      case ApplicantStatus.interviewScheduled:
        return Colors.amber.shade800;
      case ApplicantStatus.rejected:
        return NebrasTheme.danger;
      default:
        return const Color(0xFF0284C7);
    }
  }

  Widget _buildSectionTitle(String t) {
    return Text(t, style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold, color: NebrasTheme.textDark));
  }

  Widget _buildInfoCard(List<Widget> rows) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(children: rows),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
          Text(value, style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
        ],
      ),
    );
  }
}
