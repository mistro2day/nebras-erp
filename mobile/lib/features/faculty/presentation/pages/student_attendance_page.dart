import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';

class StudentAttendancePage extends StatefulWidget {
  const StudentAttendancePage({super.key});

  @override
  State<StudentAttendancePage> createState() => _StudentAttendancePageState();
}

class _StudentAttendancePageState extends State<StudentAttendancePage> {
  final List<Map<String, dynamic>> _students = [
    {'id': '1', 'name': 'أحمد محمود السعيد', 'status': 'present'},
    {'id': '2', 'name': 'إبراهيم خالد العتيبي', 'status': 'present'},
    {'id': '3', 'name': 'حمزة يوسف الشمري', 'status': 'absent'},
    {'id': '4', 'name': 'زياد عبد العزيز الزهراني', 'status': 'late'},
    {'id': '5', 'name': 'سلمان عبد الله الغامدي', 'status': 'present'},
    {'id': '6', 'name': 'عبد الرحمن فهد المطيري', 'status': 'present'},
  ];

  @override
  Widget build(BuildContext context) {
    int present = _students.where((s) => s['status'] == 'present').length;
    int absent = _students.where((s) => s['status'] == 'absent').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text("رصد تحضير الطلاب"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Class Selector Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: NebrasTheme.primary,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("الصف الثالث المتوسط (أ)", style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      Text("مادة الرياضيات · الحصة الأولى", style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                    child: Text("$present حاضر / $absent غائب", style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Students List
            Expanded(
              child: ListView.separated(
                itemCount: _students.length,
                separatorBuilder: (c, i) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final st = _students[index];
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: NebrasTheme.secondary.withOpacity(0.1),
                            child: Text("${index + 1}", style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, color: NebrasTheme.primary)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(st['name'], style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                          _buildStatusToggle(st, 'present', 'حاضر', NebrasTheme.success),
                          const SizedBox(width: 4),
                          _buildStatusToggle(st, 'absent', 'غائب', NebrasTheme.danger),
                          const SizedBox(width: 4),
                          _buildStatusToggle(st, 'late', 'متأخر', NebrasTheme.warning),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: NebrasTheme.success,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text("تم حفظ رصد الحضور بنجاح", style: GoogleFonts.tajawal())),
            );
          },
          child: Text("حفظ ورصد كشف الحضور", style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ),
    );
  }

  Widget _buildStatusToggle(Map<String, dynamic> st, String value, String label, Color color) {
    bool isSelected = st['status'] == value;
    return InkWell(
      onTap: () => setState(() => st['status'] = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: GoogleFonts.tajawal(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}
