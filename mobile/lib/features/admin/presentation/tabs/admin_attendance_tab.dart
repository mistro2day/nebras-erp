import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admin/application/admin_providers.dart';
import 'package:nebras_mobile/features/admin/domain/admin_models.dart';
import '../dialogs/admin_modals.dart';

class AdminAttendanceTab extends ConsumerStatefulWidget {
  const AdminAttendanceTab({super.key});

  @override
  ConsumerState<AdminAttendanceTab> createState() => _AdminAttendanceTabState();
}

class _AdminAttendanceTabState extends ConsumerState<AdminAttendanceTab> {
  String _selectedFilter = 'الكل';
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final listAsync = ref.watch(liveAttendanceProvider);
    final allItems = listAsync.value ?? [];

    final filteredItems = allItems.where((item) {
      if (_selectedFilter == 'الكادر' && item.personType != PersonType.employee) return false;
      if (_selectedFilter == 'الطلاب' && item.personType != PersonType.student) return false;
      if (_selectedFilter == 'المتأخرين' && item.status != AttendanceStatus.late) return false;
      if (_selectedFilter == 'الغياب' && item.status != AttendanceStatus.absent) return false;

      final query = _searchController.text.trim();
      if (query.isNotEmpty) {
        return item.name.contains(query) || item.section.contains(query);
      }
      return true;
    }).toList();

    return Column(
      children: [
        // ترويسة البحث والفلترة
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Column(
            children: [
              TextField(
                controller: _searchController,
                onChanged: (_) => setState(() {}),
                decoration: InputDecoration(
                  hintText: 'بحث بالاسم، الفصل، أو القسم...',
                  hintStyle: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted),
                  prefixIcon: const Icon(Icons.search, color: NebrasTheme.textMuted),
                  filled: true,
                  fillColor: NebrasTheme.background,
                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 12),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['الكل', 'الكادر', 'الطلاب', 'المتأخرين', 'الغياب'].map((f) {
                    final isSel = _selectedFilter == f;
                    return Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: FilterChip(
                        label: Text(f, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                        selected: isSel,
                        selectedColor: NebrasTheme.primary,
                        labelStyle: TextStyle(color: isSel ? Colors.white : NebrasTheme.textDark),
                        backgroundColor: NebrasTheme.background,
                        onSelected: (val) => setState(() => _selectedFilter = f),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),

        // قائمة السجلات اللحظية
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async => ref.invalidate(liveAttendanceProvider),
            child: filteredItems.isEmpty
                ? Center(
                    child: Text('لا توجد سجلات تطابق الفلتر المحدد.', style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredItems.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final item = filteredItems[i];
                      return _buildAttendanceCard(context, item);
                    },
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceCard(BuildContext context, LiveAttendanceItem item) {
    Color statusColor;
    IconData statusIcon;

    switch (item.status) {
      case AttendanceStatus.present:
        statusColor = NebrasTheme.success;
        statusIcon = Icons.check_circle_rounded;
        break;
      case AttendanceStatus.late:
        statusColor = NebrasTheme.warning;
        statusIcon = Icons.access_time_filled_rounded;
        break;
      case AttendanceStatus.absent:
        statusColor = NebrasTheme.danger;
        statusIcon = Icons.cancel_rounded;
        break;
      case AttendanceStatus.excused:
        statusColor = const Color(0xFF0284C7);
        statusIcon = Icons.verified_user_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
            backgroundColor: statusColor.withAlpha(25),
            radius: 20,
            child: Icon(statusIcon, color: statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      item.name,
                      style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.bold, color: NebrasTheme.textDark),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: (item.personType == PersonType.employee ? NebrasTheme.primary : const Color(0xFF6366F1)).withAlpha(20),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item.personType == PersonType.employee ? 'كادر' : 'طالب',
                        style: GoogleFonts.tajawal(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: item.personType == PersonType.employee ? NebrasTheme.primary : const Color(0xFF6366F1),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.section} • وقت الرصد: ${item.time}',
                  style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted),
                ),
                if (item.note != null && item.note!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'ملاحظة: ${item.note}',
                      style: GoogleFonts.tajawal(fontSize: 11, color: Colors.orange.shade800, fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
          // زر رصد استثناء أو عذر يدوي
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: NebrasTheme.textMuted),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (action) {
              showNebrasMessageModal(
                context: context,
                title: 'تحديث حالة الحضور',
                message: 'تم تعديل حالة (${item.name}) إلى $action بنجاح.',
              );
            },
            itemBuilder: (c) => [
              PopupMenuItem(value: 'معذور رسمي', child: Text('تسجيل كـ معذور', style: GoogleFonts.tajawal(fontSize: 13))),
              PopupMenuItem(value: 'حاضر يدوي', child: Text('إثبات الحضور يدوياً', style: GoogleFonts.tajawal(fontSize: 13))),
              PopupMenuItem(value: 'إشعار ولي الأمر', child: Text('إرسال إشعار غياب', style: GoogleFonts.tajawal(fontSize: 13))),
            ],
          ),
        ],
      ),
    );
  }
}
