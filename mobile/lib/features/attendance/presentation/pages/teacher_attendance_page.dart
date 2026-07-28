import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/network/api_client.dart';

class TeacherAttendancePage extends StatefulWidget {
  const TeacherAttendancePage({super.key});

  @override
  State<TeacherAttendancePage> createState() => _TeacherAttendancePageState();
}

class _TeacherAttendancePageState extends State<TeacherAttendancePage> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Timer _timer;
  DateTime _now = DateTime.now();

  bool _isClockedIn = false;
  bool _isOutsideGeofence = false;
  bool _isLoading = false;
  String? _checkInTime;
  String? _checkOutTime;
  final String _employeeId = "00000000-0000-0000-0000-000000000001"; // Default seed employee ID

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (mounted) {
        setState(() {
          _now = DateTime.now();
        });
      }
    });

    _loadSummary();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _timer.cancel();
    super.dispose();
  }

  Future<void> _loadSummary() async {
    final res = await ApiClient.get('/attendance/records/my-summary/', queryParams: {'employee': _employeeId});
    if (res['data'] != null && res['data']['today_record'] != null) {
      final rec = res['data']['today_record'];
      setState(() {
        _checkInTime = rec['check_in'];
        _checkOutTime = rec['check_out'];
        _isClockedIn = _checkInTime != null && _checkOutTime == null;
      });
    }
  }

  Future<void> _handleClockInOut() async {
    setState(() => _isLoading = true);

    final payload = {
      'employee': _employeeId,
      'latitude': 24.7136,
      'longitude': 46.6753,
      'device_id': 'MOB-FLUTTER-DEVICE-01',
      'verification_method': 'gps_biometric',
      if (_isOutsideGeofence) 'location_simulation': 'outside',
    };

    final res = await ApiClient.post('/attendance/records/check-in/', payload);

    setState(() => _isLoading = false);

    if (res['success'] == false && res['message'] != null) {
      _showNebrasModal(
        title: "تعذر تسجيل البصمة",
        message: res['message'],
        isError: true,
      );
    } else {
      _showNebrasModal(
        title: "تمت العملية بنجاح",
        message: res['message'] ?? "تم تسجيل الحركة بنجاح في قاعدة البيانات.",
        isError: false,
      );
      _loadSummary();
    }
  }

  void _showNebrasModal({required String title, required String message, required bool isError}) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: isError ? NebrasTheme.danger.withOpacity(0.1) : NebrasTheme.success.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isError ? Icons.error_outline : Icons.check_circle_outline,
                  color: isError ? NebrasTheme.danger : NebrasTheme.success,
                  size: 36,
                ),
              ),
              const SizedBox(height: 16),
              Text(title, style: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center, style: GoogleFonts.tajawal(fontSize: 14, color: NebrasTheme.textMuted)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isError ? NebrasTheme.danger : NebrasTheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: Text("تم", style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final period = dt.hour >= 12 ? 'م' : 'ص';
    final m = dt.minute.toString().padLeft(2, '0');
    final s = dt.second.toString().padLeft(2, '0');
    return '$hour:$m:$s $period';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("الحضور والانصراف الذكي"),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Employee Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 28,
                    backgroundColor: NebrasTheme.secondary,
                    child: Icon(Icons.person, color: Colors.white, size: 32),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("أستاذ أحمد علي النجار", style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold)),
                        Text("معلم الرياضيات · ثانوية نبراس الأهلية", style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Geofence GPS Badge Card
            GestureDetector(
              onTap: () {
                setState(() => _isOutsideGeofence = !_isOutsideGeofence);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: _isOutsideGeofence ? NebrasTheme.danger.withOpacity(0.08) : NebrasTheme.success.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _isOutsideGeofence ? NebrasTheme.danger : NebrasTheme.success, width: 1.2),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _isOutsideGeofence ? Icons.location_off_rounded : Icons.my_location_rounded,
                      color: _isOutsideGeofence ? NebrasTheme.danger : NebrasTheme.success,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _isOutsideGeofence ? "أنت خارج نطاق المدرسة (انقر للتغيير)" : "داخل نطاق ثانوية نبراس الأهلية (25m)",
                      style: GoogleFonts.tajawal(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: _isOutsideGeofence ? NebrasTheme.danger : NebrasTheme.success,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 32),

            // Smart Circular Attendance Button (Google Stitch Main Widget)
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final scale = 1.0 + (_pulseController.value * 0.05);
                return Transform.scale(
                  scale: scale,
                  child: GestureDetector(
                    onTap: _isLoading ? null : _handleClockInOut,
                    child: Container(
                      width: 220,
                      height: 220,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: _isClockedIn
                              ? [NebrasTheme.danger, const Color(0xFFDC2626)]
                              : [NebrasTheme.secondary, NebrasTheme.primary],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (_isClockedIn ? NebrasTheme.danger : NebrasTheme.secondary).withOpacity(0.35),
                            blurRadius: 24,
                            spreadRadius: 4,
                          )
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _isClockedIn ? Icons.logout_rounded : Icons.fingerprint_rounded,
                            size: 48,
                            color: Colors.white,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _formatTime(_now),
                            style: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _isClockedIn ? "تسجيل الانصراف" : "تسجيل الحضور",
                            style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),

            const SizedBox(height: 32),

            // Today's Clock In / Out Time Badges
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.black12),
                    ),
                    child: Column(
                      children: [
                        Text("وقت الحضور", style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
                        const SizedBox(height: 4),
                        Text(_checkInTime ?? "--:--", style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: NebrasTheme.success)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.black12),
                    ),
                    child: Column(
                      children: [
                        Text("وقت الانصراف", style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
                        const SizedBox(height: 4),
                        Text(_checkOutTime ?? "--:--", style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: NebrasTheme.secondary)),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Quick Actions (استئذان - إجازة - تعديل)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildQuickActionBtn(Icons.time_to_leave_rounded, "طلب استئذان"),
                _buildQuickActionBtn(Icons.edit_calendar_rounded, "تصحيح حضور"),
                _buildQuickActionBtn(Icons.beach_access_rounded, "تقديم إجازة"),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionBtn(IconData icon, String label) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: NebrasTheme.primary.withOpacity(0.06),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: NebrasTheme.primary, size: 24),
        ),
        const SizedBox(height: 6),
        Text(label, style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
      ],
    );
  }
}
