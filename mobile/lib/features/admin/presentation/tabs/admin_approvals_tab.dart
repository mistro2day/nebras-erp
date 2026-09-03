import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admin/application/admin_providers.dart';
import 'package:nebras_mobile/features/admin/domain/admin_models.dart';
import '../dialogs/admin_modals.dart';

class AdminApprovalsTab extends ConsumerStatefulWidget {
  const AdminApprovalsTab({super.key});

  @override
  ConsumerState<AdminApprovalsTab> createState() => _AdminApprovalsTabState();
}

class _AdminApprovalsTabState extends ConsumerState<AdminApprovalsTab> {
  ApprovalCategory? _filterCategory;

  @override
  Widget build(BuildContext context) {
    final approvalsAsync = ref.watch(adminApprovalsProvider);
    final items = approvalsAsync.value ?? [];

    final filtered = _filterCategory == null
        ? items
        : items.where((i) => i.category == _filterCategory).toList();

    return Column(
      children: [
        // شريط الفلاتر
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildChip(label: 'الكل (${items.length})', isSelected: _filterCategory == null, onSelected: () => setState(() => _filterCategory = null)),
                _buildChip(label: 'إجازات', isSelected: _filterCategory == ApprovalCategory.leave, onSelected: () => setState(() => _filterCategory = ApprovalCategory.leave)),
                _buildChip(label: 'استئذان وخروج', isSelected: _filterCategory == ApprovalCategory.dismissal, onSelected: () => setState(() => _filterCategory = ApprovalCategory.dismissal)),
                _buildChip(label: 'سداد رسوم', isSelected: _filterCategory == ApprovalCategory.payment, onSelected: () => setState(() => _filterCategory = ApprovalCategory.payment)),
                _buildChip(label: 'تصحيح حضور', isSelected: _filterCategory == ApprovalCategory.attendanceCorrection, onSelected: () => setState(() => _filterCategory = ApprovalCategory.attendanceCorrection)),
              ],
            ),
          ),
        ),

        // قائمة الطلبات
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => ref.refresh(adminApprovalsProvider.future),
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.done_all_rounded, size: 64, color: NebrasTheme.success.withAlpha(120)),
                        const SizedBox(height: 12),
                        Text('لا توجد طلبات معلقة بانتظار الاعتماد', style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
                        const SizedBox(height: 4),
                        Text('تمت معالجة كافة طلبات الإجازات والاستئذانات والسداد.', style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      final item = filtered[i];
                      return _buildApprovalCard(context, item);
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildChip({required String label, required bool isSelected, required VoidCallback onSelected}) {
    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: ChoiceChip(
        label: Text(label, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        selected: isSelected,
        selectedColor: NebrasTheme.primary,
        backgroundColor: NebrasTheme.background,
        labelStyle: TextStyle(color: isSelected ? Colors.white : NebrasTheme.textDark),
        onSelected: (_) => onSelected(),
      ),
    );
  }

  Widget _buildApprovalCard(BuildContext context, ApprovalItem item) {
    Color badgeColor;
    IconData badgeIcon;

    switch (item.category) {
      case ApprovalCategory.leave:
        badgeColor = const Color(0xFF6366F1);
        badgeIcon = Icons.beach_access_rounded;
        break;
      case ApprovalCategory.dismissal:
        badgeColor = Colors.orange.shade800;
        badgeIcon = Icons.meeting_room_rounded;
        break;
      case ApprovalCategory.payment:
        badgeColor = NebrasTheme.success;
        badgeIcon = Icons.payments_rounded;
        break;
      case ApprovalCategory.attendanceCorrection:
        badgeColor = const Color(0xFF0284C7);
        badgeIcon = Icons.fingerprint_rounded;
        break;
      case ApprovalCategory.general:
        badgeColor = NebrasTheme.primary;
        badgeIcon = Icons.assignment_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(5),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: badgeColor.withAlpha(25), borderRadius: BorderRadius.circular(8)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(badgeIcon, size: 14, color: badgeColor),
                    const SizedBox(width: 4),
                    Text(item.categoryLabel, style: GoogleFonts.tajawal(fontSize: 11, fontWeight: FontWeight.bold, color: badgeColor)),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                'منذ ${_timeAgo(item.createdAt)}',
                style: GoogleFonts.tajawal(fontSize: 11, color: NebrasTheme.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            item.title,
            style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
          ),
          const SizedBox(height: 4),
          Text(
            'مقدم الطلب: ${item.requesterName} (${item.requesterRole})',
            style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted),
          ),
          if (item.details.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: NebrasTheme.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                item.details,
                style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textDark),
              ),
            ),
          ],
          if (item.amount != null) ...[
            const SizedBox(height: 8),
            Text(
              'المبلغ: ${item.amount!.toStringAsFixed(0)} ج.س',
              style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.bold, color: NebrasTheme.success),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: NebrasTheme.danger,
                    side: const BorderSide(color: NebrasTheme.danger),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: () {
                    showApprovalDecisionModal(
                      context: context,
                      item: item,
                      isApprove: false,
                      onConfirm: (reason) => ref.read(adminApprovalsProvider.notifier).decide(item.id, false, reason: reason),
                    );
                  },
                  child: Text('رفض الطلب', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: NebrasTheme.success,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  onPressed: () {
                    showApprovalDecisionModal(
                      context: context,
                      item: item,
                      isApprove: true,
                      onConfirm: (reason) => ref.read(adminApprovalsProvider.notifier).decide(item.id, true, reason: reason),
                    );
                  },
                  child: Text('اعتماد فوري', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inHours > 0) return '${diff.inHours} ساعة';
    return '${diff.inMinutes} دقيقة';
  }
}
