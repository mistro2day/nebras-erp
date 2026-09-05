import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admissions/domain/admission_models.dart';
import 'package:nebras_mobile/features/admissions/application/admission_providers.dart';

class AdmissionsListPage extends ConsumerWidget {
  const AdmissionsListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(admissionsStatsProvider);
    final stats = statsAsync.value ?? AdmissionsStats.mock();
    final filter = ref.watch(admissionsFilterProvider);
    final applicantsAsync = ref.watch(admissionsListProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'إدارة القبول والتسجيل',
            style: GoogleFonts.tajawal(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: Colors.white),
              tooltip: 'تحديث',
              onPressed: () {
                ref.invalidate(admissionsStatsProvider);
                ref.invalidate(admissionsListProvider);
              },
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: NebrasTheme.primary,
          foregroundColor: Colors.white,
          elevation: 4,
          icon: const Icon(Icons.person_add_alt_1_rounded),
          label: Text(
            'تقديم طلب جديد',
            style: GoogleFonts.tajawal(
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          onPressed: () => context.push('/admin/admissions/new'),
        ),
        body: Column(
          children: [
            // بطاقة الإحصائيات السريعة
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              color: Colors.white,
              child: statsAsync.when(
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 4),
                    child: SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: NebrasTheme.primary,
                      ),
                    ),
                  ),
                ),
                error: (_, _) => Row(
                  children: [
                    _buildStatItem('إجمالي الطلبات', '-', NebrasTheme.primary),
                    _buildDivider(),
                    _buildStatItem(
                      'قيد المراجعة',
                      '-',
                      const Color(0xFF0284C7),
                    ),
                    _buildDivider(),
                    _buildStatItem('مقابلات', '-', Colors.amber.shade800),
                    _buildDivider(),
                    _buildStatItem('مقبولون', '-', NebrasTheme.success),
                  ],
                ),
                data: (stats) => Row(
                  children: [
                    _buildStatItem(
                      'إجمالي الطلبات',
                      '${stats.totalApplicants}',
                      NebrasTheme.primary,
                    ),
                    _buildDivider(),
                    _buildStatItem(
                      'قيد المراجعة',
                      '${stats.underReviewCount}',
                      const Color(0xFF0284C7),
                    ),
                    _buildDivider(),
                    _buildStatItem(
                      'مقابلات',
                      '${stats.interviewScheduledCount}',
                      Colors.amber.shade800,
                    ),
                    _buildDivider(),
                    _buildStatItem(
                      'مقبولون',
                      '${stats.acceptedCount}',
                      NebrasTheme.success,
                    ),
                  ],
                ),
              ),
            ),

            // حقل البحث والفلترة
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: Colors.white,
              child: Column(
                children: [
                  TextField(
                    onChanged: (val) => ref
                        .read(admissionsFilterProvider.notifier)
                        .setSearch(val),
                    decoration: InputDecoration(
                      hintText: 'بحث باسم الطالب أو رقم الطلب...',
                      hintStyle: GoogleFonts.tajawal(
                        fontSize: 13,
                        color: NebrasTheme.textMuted,
                      ),
                      prefixIcon: const Icon(
                        Icons.search,
                        color: NebrasTheme.textMuted,
                        size: 20,
                      ),
                      filled: true,
                      fillColor: NebrasTheme.background,
                      contentPadding: const EdgeInsets.symmetric(
                        vertical: 0,
                        horizontal: 16,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip(
                          label: 'الكل',
                          isSelected: filter.status == null,
                          onSelected: () => ref
                              .read(admissionsFilterProvider.notifier)
                              .setStatus(null),
                        ),
                        _buildFilterChip(
                          label: 'قيد المراجعة',
                          isSelected:
                              filter.status == ApplicantStatus.underReview,
                          onSelected: () => ref
                              .read(admissionsFilterProvider.notifier)
                              .setStatus(ApplicantStatus.underReview),
                        ),
                        _buildFilterChip(
                          label: 'مقابلة مجدولة',
                          isSelected:
                              filter.status ==
                              ApplicantStatus.interviewScheduled,
                          onSelected: () => ref
                              .read(admissionsFilterProvider.notifier)
                              .setStatus(ApplicantStatus.interviewScheduled),
                        ),
                        _buildFilterChip(
                          label: 'تم القبول',
                          isSelected: filter.status == ApplicantStatus.accepted,
                          onSelected: () => ref
                              .read(admissionsFilterProvider.notifier)
                              .setStatus(ApplicantStatus.accepted),
                        ),
                        _buildFilterChip(
                          label: 'مرفوض',
                          isSelected: filter.status == ApplicantStatus.rejected,
                          onSelected: () => ref
                              .read(admissionsFilterProvider.notifier)
                              .setStatus(ApplicantStatus.rejected),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // قائمة طلبات الالتحاق
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  ref.invalidate(admissionsStatsProvider);
                  ref.invalidate(admissionsListProvider);
                },
                child: applicantsAsync.when(
                  loading: () => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(
                          color: NebrasTheme.primary,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'جاري تحميل طلبات القبول والتسجيل من السيرفر...',
                          style: GoogleFonts.tajawal(
                            color: NebrasTheme.textMuted,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  error: (err, stack) => Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.cloud_off_rounded,
                            size: 48,
                            color: Colors.grey,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'تعذر تحميل الطلبات الحالية',
                            style: GoogleFonts.tajawal(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: NebrasTheme.primary,
                            ),
                            onPressed: () {
                              ref.invalidate(admissionsStatsProvider);
                              ref.invalidate(admissionsListProvider);
                            },
                            icon: const Icon(
                              Icons.refresh,
                              color: Colors.white,
                              size: 18,
                            ),
                            label: Text(
                              'إعادة المحاولة',
                              style: GoogleFonts.tajawal(color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  data: (applicants) {
                    if (applicants.isEmpty) {
                      return Center(
                        child: Text(
                          'لا توجد طلبات تطابق معايير البحث.',
                          style: GoogleFonts.tajawal(
                            color: NebrasTheme.textMuted,
                            fontSize: 14,
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.only(
                        top: 14,
                        left: 16,
                        right: 16,
                        bottom: 90,
                      ),
                      itemCount: applicants.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, i) {
                        final app = applicants[i];
                        return _buildApplicantCard(context, app);
                      },
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String title, String count, Color color) {
    return Expanded(
      child: Column(
        children: [
          Text(
            count,
            style: GoogleFonts.tajawal(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: GoogleFonts.tajawal(
              fontSize: 10,
              color: NebrasTheme.textMuted,
            ),
            maxLines: 1,
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(height: 24, width: 1, color: Colors.grey.shade300);
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onSelected,
  }) {
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: FilterChip(
        label: Text(
          label,
          style: GoogleFonts.tajawal(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        selected: isSelected,
        selectedColor: NebrasTheme.primary,
        backgroundColor: NebrasTheme.background,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : NebrasTheme.textDark,
        ),
        onSelected: (_) => onSelected(),
      ),
    );
  }

  Widget _buildApplicantCard(BuildContext context, ApplicantModel app) {
    Color statusColor;
    IconData statusIcon;

    switch (app.status) {
      case ApplicantStatus.accepted:
      case ApplicantStatus.enrolled:
        statusColor = NebrasTheme.success;
        statusIcon = Icons.check_circle_rounded;
        break;
      case ApplicantStatus.interviewScheduled:
        statusColor = Colors.amber.shade800;
        statusIcon = Icons.event_available_rounded;
        break;
      case ApplicantStatus.rejected:
        statusColor = NebrasTheme.danger;
        statusIcon = Icons.cancel_rounded;
        break;
      case ApplicantStatus.underReview:
      case ApplicantStatus.submitted:
      case ApplicantStatus.draft:
      case ApplicantStatus.waitlist:
        statusColor = const Color(0xFF0284C7);
        statusIcon = Icons.hourglass_top_rounded;
        break;
    }

    return InkWell(
      onTap: () => context.push('/admin/admissions/${app.id}'),
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
            CircleAvatar(
              radius: 22,
              backgroundColor: statusColor.withAlpha(25),
              child: Icon(statusIcon, color: statusColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    app.arabicFullName,
                    style: GoogleFonts.tajawal(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: NebrasTheme.textDark,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${app.applyingGrade} • رقم الطلب: ${app.applicationNumber}',
                    style: GoogleFonts.tajawal(
                      fontSize: 11,
                      color: NebrasTheme.textMuted,
                    ),
                  ),
                  if (app.primaryGuardian != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        'ولي الأمر: ${app.primaryGuardian!.fullName} (${app.primaryGuardian!.phone})',
                        style: GoogleFonts.tajawal(
                          fontSize: 11,
                          color: NebrasTheme.primary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                statusToDisplayLabel(app.status),
                style: GoogleFonts.tajawal(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: statusColor,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
