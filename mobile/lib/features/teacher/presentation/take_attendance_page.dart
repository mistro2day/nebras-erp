import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_theme.dart';
import '../application/teacher_providers.dart';
import '../domain/models.dart';

/// شاشة رصد وتحضير حضور وغياب طلاب الشعبة بواسطة المعلم
class TakeAttendancePage extends ConsumerStatefulWidget {
  const TakeAttendancePage({
    super.key,
    required this.sectionId,
    required this.title,
    this.initialDate,
  });

  final String sectionId;
  final String title;
  final String? initialDate;

  @override
  ConsumerState<TakeAttendancePage> createState() => _TakeAttendancePageState();
}

class _TakeAttendancePageState extends ConsumerState<TakeAttendancePage> {
  late DateTime _selectedDate;
  List<StudentAttendanceItem> _students = [];
  bool _isInitialized = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialDate != null) {
      try {
        _selectedDate = DateTime.parse(widget.initialDate!);
      } catch (_) {
        _selectedDate = DateTime.now();
      }
    } else {
      _selectedDate = DateTime.now();
    }
  }

  String get _formattedDate {
    final y = _selectedDate.year.toString().padLeft(4, '0');
    final m = _selectedDate.month.toString().padLeft(2, '0');
    final d = _selectedDate.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  void _markAll(AttendanceStatus status) {
    setState(() {
      _students = _students.map((s) => s.copyWith(status: status)).toList();
    });
  }

  void _changeStatus(int index, AttendanceStatus status) {
    setState(() {
      _students[index].status = status;
    });
  }

  void _editNote(int index) {
    final item = _students[index];
    final controller = TextEditingController(text: item.notes);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'ملاحظة للطالب: ${item.name}',
                style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'اكتب سبباً للغياب أو التأخير (اختياري)...',
                  hintStyle: GoogleFonts.tajawal(fontSize: 13, color: Colors.black38),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: NebrasTheme.accent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () {
                  setState(() {
                    _students[index].notes = controller.text.trim();
                  });
                  Navigator.pop(ctx);
                },
                child: Text('حفظ الملاحظة',
                    style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitAttendance() async {
    if (_students.isEmpty) return;

    setState(() => _isSaving = true);
    try {
      final repo = ref.read(teacherRepositoryProvider);
      await repo.saveSectionAttendance(
        widget.sectionId,
        date: _formattedDate,
        records: _students,
      );

      // إعادة تحديث المزود
      ref.invalidate(sectionAttendanceProvider(
        SectionAttendanceQuery(sectionId: widget.sectionId, date: _formattedDate),
      ));

      if (!mounted) return;
      _showSuccessDialog();
    } catch (e) {
      if (!mounted) return;
      _showErrorDialog(e.toString());
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _showSuccessDialog() {
    final presentCount = _students.where((s) => s.status == AttendanceStatus.present).length;
    final absentCount = _students.where((s) => s.status == AttendanceStatus.absent).length;
    final lateCount = _students.where((s) => s.status == AttendanceStatus.late).length;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_circle, color: Colors.green, size: 40),
                ),
                const SizedBox(height: 16),
                Text('تم تثبيت الحضور بنجاح!',
                    style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  'تم حفظ كشف الحضور ليوم $_formattedDate بنجاح.\nحاضر: $presentCount | غائب: $absentCount | متأخر: $lateCount',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.tajawal(fontSize: 13, color: Colors.black54, height: 1.5),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: NebrasTheme.accent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.pop(context); // العودة لصفحة الفصول
                    },
                    child: Text('تم، العودة للفصول',
                        style: GoogleFonts.tajawal(
                            fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showErrorDialog(String error) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.error_outline, color: Colors.red, size: 40),
                ),
                const SizedBox(height: 16),
                Text('عذراً، حدث خطأ!',
                    style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  error,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.tajawal(fontSize: 13, color: Colors.black54),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey.shade800,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () => Navigator.pop(ctx),
                    child: Text('حسناً',
                        style: GoogleFonts.tajawal(
                            fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final query = SectionAttendanceQuery(
      sectionId: widget.sectionId,
      date: _formattedDate,
    );
    final async = ref.watch(sectionAttendanceProvider(query));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8F9FA),
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('رصد الحضور والغياب'),
              Text(
                widget.title,
                style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70),
              ),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.calendar_month),
              tooltip: 'تغيير التاريخ',
              onPressed: () async {
                final d = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2025),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                  locale: const Locale('ar'),
                );
                if (d != null) {
                  setState(() {
                    _selectedDate = d;
                    _isInitialized = false;
                  });
                }
              },
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: NebrasTheme.danger),
                  const SizedBox(height: 12),
                  Text(e.toString(),
                      textAlign: TextAlign.center,
                      style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.invalidate(sectionAttendanceProvider(query)),
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            ),
          ),
          data: (attData) {
            if (!_isInitialized) {
              _students = attData.students.map((e) => e.copyWith()).toList();
              _isInitialized = true;
            }

            if (_students.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.people_outline, size: 56, color: Colors.grey.shade400),
                      const SizedBox(height: 14),
                      Text('لا يوجد طلاب مسكنون في هذه الشعبة بعد.',
                          style: GoogleFonts.tajawal(fontSize: 16, color: Colors.black54)),
                    ],
                  ),
                ),
              );
            }

            final presentCount =
                _students.where((s) => s.status == AttendanceStatus.present).length;
            final absentCount =
                _students.where((s) => s.status == AttendanceStatus.absent).length;
            final lateCount =
                _students.where((s) => s.status == AttendanceStatus.late).length;
            final excusedCount =
                _students.where((s) => s.status == AttendanceStatus.excused).length;

            return Column(
              children: [
                // رأس التاريخ والمؤشرات السريعة
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(10),
                        blurRadius: 6,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // سطر شريط التاريخ والتحضير السريع
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: NebrasTheme.primary.withAlpha(20),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.event, size: 16, color: NebrasTheme.primary),
                                const SizedBox(width: 6),
                                Text(
                                  _formattedDate,
                                  style: GoogleFonts.tajawal(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: NebrasTheme.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          // زر التحضير السريع: الكل حاضر
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.green.shade700,
                              side: BorderSide(color: Colors.green.shade300),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8)),
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            ),
                            icon: const Icon(Icons.done_all, size: 16),
                            label: Text('الكل حاضر',
                                style: GoogleFonts.tajawal(
                                    fontWeight: FontWeight.bold, fontSize: 12)),
                            onPressed: () => _markAll(AttendanceStatus.present),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      // شريط المؤشرات الحية
                      Row(
                        children: [
                          _buildMiniStat('الطلاب', '${_students.length}', Colors.black87),
                          const SizedBox(width: 6),
                          _buildMiniStat('حاضر', '$presentCount', Colors.green.shade700),
                          const SizedBox(width: 6),
                          _buildMiniStat('غائب', '$absentCount', Colors.red.shade700),
                          const SizedBox(width: 6),
                          _buildMiniStat('متأخر', '$lateCount', Colors.orange.shade800),
                          const SizedBox(width: 6),
                          _buildMiniStat('معذور', '$excusedCount', Colors.blue.shade700),
                        ],
                      ),
                    ],
                  ),
                ),

                // قائمة الطلاب
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 90),
                    itemCount: _students.length,
                    itemBuilder: (ctx, idx) {
                      final s = _students[idx];
                      return _buildStudentCard(idx, s);
                    },
                  ),
                ),
              ],
            );
          },
        ),
        // زر التثبيت السفلي العائم
        bottomSheet: _students.isEmpty
            ? null
            : Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(20),
                      blurRadius: 10,
                      offset: const Offset(0, -3),
                    ),
                  ],
                ),
                child: SafeArea(
                  child: SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: NebrasTheme.accent,
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: _isSaving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.cloud_upload_outlined,
                              color: Colors.white, size: 20),
                      label: Text(
                        _isSaving ? 'جارٍ الحفظ والاعتماد...' : 'تثبيت كشف الحضور الآن',
                        style: GoogleFonts.tajawal(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      onPressed: _isSaving ? null : _submitAttendance,
                    ),
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 6),
        decoration: BoxDecoration(
          color: color.withAlpha(20),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          children: [
            Text(value,
                style: GoogleFonts.tajawal(
                    fontWeight: FontWeight.w800, fontSize: 13, color: color)),
            Text(label,
                style: GoogleFonts.tajawal(
                    fontSize: 10, color: color.withAlpha(210))),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentCard(int index, StudentAttendanceItem s) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: s.status == AttendanceStatus.absent
              ? Colors.red.shade200
              : s.status == AttendanceStatus.late
                  ? Colors.orange.shade200
                  : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // سطر معلومات الطالب
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: s.status == AttendanceStatus.present
                    ? Colors.green.shade50
                    : s.status == AttendanceStatus.absent
                        ? Colors.red.shade50
                        : s.status == AttendanceStatus.late
                            ? Colors.orange.shade50
                            : Colors.blue.shade50,
                child: Text(
                  '${index + 1}',
                  style: GoogleFonts.tajawal(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: s.status == AttendanceStatus.present
                        ? Colors.green.shade700
                        : s.status == AttendanceStatus.absent
                            ? Colors.red.shade700
                            : s.status == AttendanceStatus.late
                                ? Colors.orange.shade800
                                : Colors.blue.shade700,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.name,
                      style: GoogleFonts.tajawal(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      'رقم القيد: ${s.studentNumber}',
                      style: GoogleFonts.tajawal(fontSize: 11, color: Colors.black45),
                    ),
                  ],
                ),
              ),
              // زر إضافة أو تعديل ملاحظة
              IconButton(
                icon: Icon(
                  s.notes.isNotEmpty ? Icons.note_alt : Icons.note_add_outlined,
                  size: 20,
                  color: s.notes.isNotEmpty ? NebrasTheme.accent : Colors.black26,
                ),
                tooltip: s.notes.isNotEmpty ? s.notes : 'إضافة ملاحظة',
                onPressed: () => _editNote(index),
              ),
            ],
          ),
          if (s.notes.isNotEmpty) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 14, color: Colors.orange),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      s.notes,
                      style: GoogleFonts.tajawal(fontSize: 11, color: Colors.black87),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 10),
          // أزرار الحالة الأربعة
          Row(
            children: [
              _buildStatusBtn(
                index: index,
                label: 'حاضر',
                targetStatus: AttendanceStatus.present,
                currentStatus: s.status,
                activeColor: Colors.green,
                icon: Icons.check,
              ),
              const SizedBox(width: 6),
              _buildStatusBtn(
                index: index,
                label: 'غائب',
                targetStatus: AttendanceStatus.absent,
                currentStatus: s.status,
                activeColor: Colors.red,
                icon: Icons.close,
              ),
              const SizedBox(width: 6),
              _buildStatusBtn(
                index: index,
                label: 'متأخر',
                targetStatus: AttendanceStatus.late,
                currentStatus: s.status,
                activeColor: Colors.orange.shade700,
                icon: Icons.access_time,
              ),
              const SizedBox(width: 6),
              _buildStatusBtn(
                index: index,
                label: 'بعذر',
                targetStatus: AttendanceStatus.excused,
                currentStatus: s.status,
                activeColor: Colors.blue.shade700,
                icon: Icons.medical_services_outlined,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBtn({
    required int index,
    required String label,
    required AttendanceStatus targetStatus,
    required AttendanceStatus currentStatus,
    required Color activeColor,
    required IconData icon,
  }) {
    final isSelected = currentStatus == targetStatus;
    return Expanded(
      child: InkWell(
        onTap: () => _changeStatus(index, targetStatus),
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 7),
          decoration: BoxDecoration(
            color: isSelected ? activeColor : const Color(0xFFF1F3F5),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? activeColor : Colors.transparent,
              width: 1.2,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 13,
                color: isSelected ? Colors.white : Colors.black45,
              ),
              const SizedBox(width: 4),
              Text(
                label,
                style: GoogleFonts.tajawal(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? Colors.white : Colors.black87,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
