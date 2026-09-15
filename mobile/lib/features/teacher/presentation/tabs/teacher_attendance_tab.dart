import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/providers.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../auth/application/auth_controller.dart';

/// تبويب البصمة الذكية للمعلم: التحقق الجغرافي (Geofencing) وتسجيل الحضور والانصراف
class TeacherAttendanceTab extends ConsumerStatefulWidget {
  const TeacherAttendanceTab({super.key});

  @override
  ConsumerState<TeacherAttendanceTab> createState() => _TeacherAttendanceTabState();
}

class _TeacherAttendanceTabState extends ConsumerState<TeacherAttendanceTab> {
  // إحداثيات المدرسة في الخرطوم (نطاق المدرسة المعتمد)
  static const double schoolLat = 15.5007;
  static const double schoolLng = 32.5599;
  static const double allowedRadiusMeters = 250.0;

  // المحاكاة الحالية لموقع المعلم
  bool _isSimulatedInside = true;
  bool _isLoading = false;
  bool _isFetchingStatus = true;

  Map<String, dynamic>? _todayRecord;
  Map<String, dynamic>? _stats;
  String? _employeeId;
  String? _feedbackMessage;
  bool _feedbackSuccess = true;

  @override
  void initState() {
    super.initState();
    _loadTeacherAttendance();
  }

  // حساب المسافة التقريبية بالـ Haversine
  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371000.0;
    final dLat = (lat2 - lat1) * (math.pi / 180.0);
    final dLon = (lon2 - lon1) * (math.pi / 180.0);
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * (math.pi / 180.0)) *
            math.cos(lat2 * (math.pi / 180.0)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return r * c;
  }

  Future<void> _loadTeacherAttendance() async {
    setState(() => _isFetchingStatus = true);
    final api = ref.read(apiServiceProvider);
    final session = ref.read(authControllerProvider);
    final userEmail = session?.email ?? '';

    try {
      // 1. جلب معرّف الموظف التابع للمعلم
      final empRes = await api.get('/employees/employees/?search=$userEmail');
      final empList = (empRes is Map && empRes['data'] is Map && empRes['data']['results'] != null)
          ? empRes['data']['results']
          : (empRes is Map && empRes['results'] != null)
              ? empRes['results']
              : (empRes is Map && empRes['data'] is List)
                  ? empRes['data']
                  : [];

      if (empList is List && empList.isNotEmpty) {
        _employeeId = empList.first['id']?.toString();
      }

      // إذا لم يتوفر نستخدم معرّف المعلم حيدر محمد محجوب
      _employeeId ??= '30eb8610-4410-462b-94ef-ab128b0ad491';

      // 2. جلب ملخص وسجلات المعلم
      final sumRes = await api.get('/attendance/records/my-summary/?employee=$_employeeId');
      final sumData = (sumRes is Map && sumRes['data'] is Map) ? sumRes['data'] : sumRes;

      if (sumData is Map) {
        _todayRecord = sumData['today_record'] as Map<String, dynamic>?;
        _stats = sumData['stats'] as Map<String, dynamic>?;
      }
    } catch (_) {
      // في حال عدم الاتصال نحتفظ بالواجهة النشطة
    } finally {
      if (mounted) {
        setState(() => _isFetchingStatus = false);
      }
    }
  }

  Future<void> _recordBiometric(String type) async {
    if (_employeeId == null) {
      await _loadTeacherAttendance();
    }

    final currentLat = _isSimulatedInside ? schoolLat : 15.6100;
    final currentLng = _isSimulatedInside ? schoolLng : 32.6500;
    final distance = _calculateDistance(currentLat, currentLng, schoolLat, schoolLng);

    if (distance > allowedRadiusMeters && !_isSimulatedInside) {
      setState(() {
        _feedbackSuccess = false;
        _feedbackMessage =
            '🚨 تعذّر تسجيل البصمة: أنت على بعد ${distance.toInt()} متراً خارج النطاق الجغرافي للمدرسة (الخرطوم). النطاق المسموح هو ${allowedRadiusMeters.toInt()}م.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _feedbackMessage = null;
    });

    final api = ref.read(apiServiceProvider);
    try {
      final res = await api.post('/attendance/records/check-in/', data: {
        'employee': _employeeId,
        'latitude': currentLat,
        'longitude': currentLng,
        'location_simulation': _isSimulatedInside ? 'inside' : 'outside',
        'verification_method': 'gps_biometric',
        'device_id': 'NebrasMobile-Teacher-App',
      });

      final msg = (res is Map && res['message'] != null)
          ? res['message'].toString()
          : (type == 'check_in'
              ? '✅ تم تسجيل حضورك بنجاح في مجمع الخرطوم التعليمي.'
              : '✅ تم تسجيل انصرافك بنجاح. رافقتك السلامة.');

      setState(() {
        _feedbackSuccess = true;
        _feedbackMessage = msg;
      });

      await _loadTeacherAttendance();
    } catch (e) {
      setState(() {
        _feedbackSuccess = false;
        _feedbackMessage = '🚨 فشل إرسال البصمة: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authControllerProvider);
    final isCheckedIn = _todayRecord != null && _todayRecord!['check_in'] != null;
    final isCheckedOut = _todayRecord != null && _todayRecord!['check_out'] != null;

    final currentDistance = _isSimulatedInside ? 12 : 1450;
    final isWithinRange = _isSimulatedInside;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('البصمة الذكية للدوام'),
            Text(
              'الأستاذ: ${session?.displayName ?? 'حيدر محمد محجوب صديق'}',
              style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'تحديث الحالة',
            onPressed: _loadTeacherAttendance,
          ),
        ],
      ),
      body: _isFetchingStatus
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTeacherAttendance,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // بطاقة الموقع الجغرافي ونطاق المدرسة
                  _buildGeofenceCard(isWithinRange, currentDistance),

                  const SizedBox(height: 16),

                  // بطاقة الوردية وحالة بصمة اليوم
                  _buildTodayStatusCard(isCheckedIn, isCheckedOut),

                  const SizedBox(height: 16),

                  // أزرار تسجيل الحضور والانصراف
                  _buildActionButtons(isCheckedIn, isCheckedOut),

                  // رسالة التغذية الراجعة
                  if (_feedbackMessage != null) ...[
                    const SizedBox(height: 16),
                    _buildFeedbackBanner(),
                  ],

                  const SizedBox(height: 20),

                  // ملخص الحضور الشهري للمعلم
                  _buildMonthlyStatsSection(),

                  const SizedBox(height: 20),

                  // شريط محاكاة الموقع (لأغراض الاختبار الميداني والتطوير)
                  _buildSimulatorSwitch(),
                ],
              ),
            ),
    );
  }

  Widget _buildGeofenceCard(bool isWithinRange, int currentDistance) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(40),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isWithinRange
                      ? const Color(0xFF10B981).withAlpha(40)
                      : const Color(0xFFEF4444).withAlpha(40),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.location_on,
                  color: isWithinRange ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'موقع المدرسة: مجمع الخرطوم التعليمي',
                      style: GoogleFonts.tajawal(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'الإحداثيات: 15.5007° N, 32.5599° E',
                      style: GoogleFonts.tajawal(
                        color: Colors.white60,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isWithinRange
                      ? const Color(0xFF10B981).withAlpha(30)
                      : const Color(0xFFEF4444).withAlpha(30),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isWithinRange ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                ),
                child: Text(
                  isWithinRange ? 'ضمن النطاق ✓' : 'خارج النطاق ✗',
                  style: GoogleFonts.tajawal(
                    color: isWithinRange ? const Color(0xFF34D399) : const Color(0xFFF87171),
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(color: Colors.white12, height: 1),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'المسافة التقديرية عن بوابة المدرسة:',
                style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12),
              ),
              Text(
                '$currentDistance متر (المسموح: ${allowedRadiusMeters.toInt()}م)',
                style: GoogleFonts.tajawal(
                  color: isWithinRange ? const Color(0xFF34D399) : const Color(0xFFF87171),
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTodayStatusCard(bool isCheckedIn, bool isCheckedOut) {
    final checkInTime = _todayRecord?['check_in']?.toString() ?? '--:--';
    final checkOutTime = _todayRecord?['check_out']?.toString() ?? '--:--';

    String statusText = 'لم يتم تسجيل الحضور بعد';
    Color statusColor = Colors.orange;
    if (isCheckedOut) {
      statusText = 'تم إتمام الدوام اليومي (حضور وانصراف)';
      statusColor = const Color(0xFF10B981);
    } else if (isCheckedIn) {
      statusText = 'أنت متواجد حالياً في المدرسة (تم تسجيل الحضور)';
      statusColor = const Color(0xFF0284C7);
    }

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.access_time_filled, color: NebrasTheme.accent, size: 20),
                const SizedBox(width: 8),
                Text(
                  'الوردية المعتمدة: 07:30 ص - 02:30 م (معلمون)',
                  style: GoogleFonts.tajawal(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: NebrasTheme.accent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: statusColor.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: statusColor.withAlpha(80)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: statusColor, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      statusText,
                      style: GoogleFonts.tajawal(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildTimeBadge(
                    label: 'وقت الحضور',
                    time: checkInTime,
                    icon: Icons.login,
                    active: isCheckedIn,
                    color: const Color(0xFF10B981),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildTimeBadge(
                    label: 'وقت الانصراف',
                    time: checkOutTime,
                    icon: Icons.logout,
                    active: isCheckedOut,
                    color: const Color(0xFF6366F1),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeBadge({
    required String label,
    required String time,
    required IconData icon,
    required bool active,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: active ? color.withAlpha(15) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: active ? color.withAlpha(60) : Colors.transparent),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: active ? color : Colors.grey),
              const SizedBox(width: 4),
              Text(
                label,
                style: GoogleFonts.tajawal(
                  fontSize: 11,
                  color: active ? color : Colors.black54,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            time,
            style: GoogleFonts.tajawal(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: active ? color : Colors.black45,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(bool isCheckedIn, bool isCheckedOut) {
    return Column(
      children: [
        if (!isCheckedIn)
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B4D3E),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.fingerprint, size: 24),
              label: Text(
                'تسجيل حضور ذكي (GPS)',
                style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              onPressed: _isLoading ? null : () => _recordBiometric('check_in'),
            ),
          )
        else if (!isCheckedOut)
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB45309), // كهرماني
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 2,
              ),
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.logout, size: 22),
              label: Text(
                'تسجيل انصراف ذكي (GPS)',
                style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              onPressed: _isLoading ? null : () => _recordBiometric('check_out'),
            ),
          )
        else
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withAlpha(20),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF10B981)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.verified, color: Color(0xFF10B981)),
                const SizedBox(width: 8),
                Text(
                  'اكتمل تسجيل الدوام اليومي بنجاح ✓',
                  style: GoogleFonts.tajawal(
                    color: const Color(0xFF10B981),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildFeedbackBanner() {
    final color = _feedbackSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(_feedbackSuccess ? Icons.check_circle : Icons.error_outline, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _feedbackMessage ?? '',
              style: GoogleFonts.tajawal(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMonthlyStatsSection() {
    final present = _stats?['present_days'] ?? 0;
    final late = _stats?['late_days'] ?? 0;
    final absent = _stats?['absent_days'] ?? 0;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'سجل الحضور خلال الشهر الحالي:',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildStatBox('أيام الحضور', '$present', const Color(0xFF10B981), Icons.check_circle_outline),
                const SizedBox(width: 8),
                _buildStatBox('التأخير', '$late', const Color(0xFFF59E0B), Icons.alarm),
                const SizedBox(width: 8),
                _buildStatBox('الغياب', '$absent', const Color(0xFFEF4444), Icons.cancel_outlined),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatBox(String label, String val, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withAlpha(15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(40)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              val,
              style: GoogleFonts.tajawal(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            Text(
              label,
              style: GoogleFonts.tajawal(fontSize: 11, color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSimulatorSwitch() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'محاكاة موقع الـ GPS للتجربة:',
                style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 12),
              ),
              Text(
                _isSimulatedInside
                    ? 'أنت الآن: داخل محيط المدرسة (12 متراً)'
                    : 'أنت الآن: خارج النطاق (1.45 كم بعيداً)',
                style: GoogleFonts.tajawal(fontSize: 11, color: Colors.black54),
              ),
            ],
          ),
          Switch(
            value: _isSimulatedInside,
            activeThumbColor: const Color(0xFF1B4D3E),
            onChanged: (val) {
              setState(() {
                _isSimulatedInside = val;
                _feedbackMessage = null;
              });
            },
          ),
        ],
      ),
    );
  }
}
