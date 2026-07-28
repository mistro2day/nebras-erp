import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  bool _isLoading = true;
  int _presentCount = 0;
  List<dynamic> _liveRecords = [];

  @override
  void initState() {
    super.initState();
    _fetchLiveStatus();
  }

  Future<void> _fetchLiveStatus() async {
    final res = await ApiClient.get('/attendance/records/live-status/');
    setState(() {
      _isLoading = false;
      if (res['data'] != null) {
        _presentCount = res['data']['total_present_today'] ?? 0;
        _liveRecords = res['data']['records'] ?? [];
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("لوحة تحكم الإدارة والرقابة"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () {
              setState(() => _isLoading = true);
              _fetchLiveStatus();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Live Attendance Ring Card (Google Stitch Admin Widget)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [NebrasTheme.primary, NebrasTheme.accent],
                        begin: Alignment.topRight,
                        end: Alignment.bottomLeft,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [BoxShadow(color: NebrasTheme.primary.withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 6))],
                    ),
                    child: Column(
                      children: [
                        Text("مؤشر حضور المعلمين اللحظي", style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 14)),
                        const SizedBox(height: 16),
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 130,
                              height: 130,
                              child: CircularProgressIndicator(
                                value: 0.94,
                                strokeWidth: 12,
                                backgroundColor: Colors.white24,
                                valueColor: const AlwaysStoppedAnimation<Color>(NebrasTheme.success),
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text("94%", style: GoogleFonts.tajawal(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                                Text("حضور مبكر", style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70)),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text("تم تسجيل حضور $_presentCount معلم من أصل 45 اليوم", style: GoogleFonts.tajawal(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Pending Requests Section
                  Text("طلبات تنتظر الاعتماد (2)", style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),

                  _buildApprovalCard("أستاذ محمد خالد", "طلب إجازة مرضية", "اليوم - 27 يوليو", Icons.sick_rounded),
                  _buildApprovalCard("أستاذة سارة محمود", "طلب استئذان مبكر", "ساعتان (12:00 م)", Icons.access_time_filled_rounded),

                  const SizedBox(height: 24),

                  // Live Teachers Attendance List
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("سجل الحضور اللحظي اليوم", style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text("${_liveRecords.length} سجلات", style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (_liveRecords.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text("لا توجد بصمات مسجلة اليوم حتى الآن", style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _liveRecords.length,
                      separatorBuilder: (c, i) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final rec = _liveRecords[index];
                        return Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.black.withOpacity(0.06)),
                          ),
                          child: Row(
                            children: [
                              const CircleAvatar(
                                backgroundColor: NebrasTheme.background,
                                child: Icon(Icons.person, color: NebrasTheme.primary),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(rec['employee_name'] ?? 'معلم', style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 15)),
                                    Text("حضور: ${rec['check_in'] ?? '--:--'} · ${rec['verification_method']}", style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: NebrasTheme.success.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text("حاضر", style: GoogleFonts.tajawal(color: NebrasTheme.success, fontWeight: FontWeight.bold, fontSize: 12)),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
    );
  }

  Widget _buildApprovalCard(String name, String type, String time, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: NebrasTheme.secondary.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: NebrasTheme.secondary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 14)),
                  Text("$type · $time", style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.check_circle_rounded, color: NebrasTheme.success),
              onPressed: () {},
            ),
            IconButton(
              icon: const Icon(Icons.cancel_rounded, color: NebrasTheme.danger),
              onPressed: () {},
            ),
          ],
        ),
      ),
    );
  }
}
