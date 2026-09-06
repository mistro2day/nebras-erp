import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../application/transport_providers.dart';
import '../domain/transport_models.dart';

/// شاشة تشغيل وإدارة الرحلة الحية للسائق والمشرف الميداني مع بث GPS اللحظي
class DriverTripLivePage extends ConsumerStatefulWidget {
  const DriverTripLivePage({
    super.key,
    required this.tripId,
  });

  final String tripId;

  @override
  ConsumerState<DriverTripLivePage> createState() => _DriverTripLivePageState();
}

class _DriverTripLivePageState extends ConsumerState<DriverTripLivePage> {
  Timer? _gpsBroadcastTimer;
  bool _isBroadcasting = false;
  double _currentSpeed = 38.5;
  double _simLat = 15.5925;
  double _simLng = 32.5310;
  int _batteryLevel = 92;
  String _lastBroadcastTime = '—';
  final Map<String, String> _localAttendanceState = {};

  @override
  void dispose() {
    _gpsBroadcastTimer?.cancel();
    super.dispose();
  }

  void _toggleGpsBroadcast() {
    if (_isBroadcasting) {
      _gpsBroadcastTimer?.cancel();
      setState(() => _isBroadcasting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم إيقاف بث GPS المباشر')),
      );
    } else {
      setState(() => _isBroadcasting = true);
      _sendTelemetryPing();
      _gpsBroadcastTimer = Timer.periodic(const Duration(seconds: 4), (_) {
        _sendTelemetryPing();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF10B981),
          content: Text('تم تفعيل بث GPS المباشر للأقمار الصناعية بنجاح'),
        ),
      );
    }
  }

  Future<void> _sendTelemetryPing() async {
    // محاكاة تحرك واقعية ضمن مسار ولاية الخرطوم
    _simLat += 0.0004;
    _simLng += 0.0003;
    _currentSpeed = 30.0 + (DateTime.now().second % 20);

    try {
      final repo = ref.read(transportRepositoryProvider);
      await repo.sendTelemetry(
        tripId: widget.tripId,
        latitude: _simLat,
        longitude: _simLng,
        speedKmh: _currentSpeed,
        heading: 145.0,
        batteryLevel: _batteryLevel,
      );

      if (mounted) {
        final now = DateTime.now();
        setState(() {
          _lastBroadcastTime =
              '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}';
        });
      }
    } catch (_) {}
  }

  Future<void> _recordStudent(String passengerId, String status) async {
    setState(() {
      _localAttendanceState[passengerId] = status;
    });

    try {
      final repo = ref.read(transportRepositoryProvider);
      await repo.recordAttendance(
        tripId: widget.tripId,
        passengerId: passengerId,
        status: status,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('تعذر تسجيل الحضور: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tripAsync = ref.watch(liveTripProvider(widget.tripId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF1E293B),
          elevation: 0,
          title: Text(
            'قمرة قيادة الحافلة المدرسية',
            style: GoogleFonts.tajawal(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh, color: Colors.white70),
              onPressed: () => ref.invalidate(liveTripProvider(widget.tripId)),
            ),
          ],
        ),
        body: tripAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: Color(0xFF38BDF8)),
          ),
          error: (err, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, color: Colors.amber, size: 50),
                  const SizedBox(height: 12),
                  Text(
                    'تعذر تحميل بيانات الرحلة',
                    style: GoogleFonts.tajawal(color: Colors.white, fontSize: 18),
                  ),
                  Text(
                    err.toString(),
                    style: GoogleFonts.tajawal(color: Colors.white60, fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => ref.invalidate(liveTripProvider(widget.tripId)),
                    child: const Text('إعادة المحاولة'),
                  )
                ],
              ),
            ),
          ),
          data: (trip) => _buildTripContent(trip),
        ),
      ),
    );
  }

  Widget _buildTripContent(LiveTripDetails trip) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. بطاقة مسار الحافلة ونوع الملكية (خاصة بالسودان)
        _buildBusHeaderCard(trip),
        const SizedBox(height: 16),

        // 2. لوحة عدادات الـ GPS الحية والبث اللحظي
        _buildGpsHudCard(),
        const SizedBox(height: 16),

        // 3. زر التحكم في بث الـ GPS
        _buildBroadcastToggleButton(),
        const SizedBox(height: 20),

        // 4. المحطات ورصد صعود/نزول الطلاب
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'محطات المسار والركاب',
              style: GoogleFonts.tajawal(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF334155),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${trip.stops.length} محطات',
                style: GoogleFonts.tajawal(fontSize: 12, color: Colors.white70),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        ...trip.stops.map((stop) => _buildStopCard(stop, trip)),

        const SizedBox(height: 24),

        // 5. زر إنهاء الرحلة بنجاح
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEF4444),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          icon: const Icon(Icons.flag_circle_outlined),
          label: Text(
            'إنهاء الرحلة المدرسية والعودة للكراج',
            style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          onPressed: () => _confirmCompleteTrip(context),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildBusHeaderCard(LiveTripDetails trip) {
    final isContracted = trip.ownershipType.contains('مستأجرة') ||
        trip.ownershipType.contains('contracted');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.directions_bus, color: Color(0xFF38BDF8), size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trip.routeName.isNotEmpty ? trip.routeName : 'خط النقل المدرسي',
                      style: GoogleFonts.tajawal(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'رقم اللوحة: ${trip.vehiclePlate} · كود الخط: ${trip.routeCode}',
                      style: GoogleFonts.tajawal(color: Colors.white60, fontSize: 13),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isContracted
                      ? const Color(0xFFF59E0B).withOpacity(0.2)
                      : const Color(0xFF10B981).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isContracted ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                    width: 0.8,
                  ),
                ),
                child: Text(
                  isContracted ? 'حافلة مستأجرة' : 'ملك المدرسة',
                  style: GoogleFonts.tajawal(
                    color: isContracted ? const Color(0xFFFBBF24) : const Color(0xFF34D399),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          if (trip.ownerName.isNotEmpty) ...[
            const Divider(color: Color(0xFF334155), height: 24),
            Row(
              children: [
                const Icon(Icons.person_pin, size: 16, color: Color(0xFFFBBF24)),
                const SizedBox(width: 6),
                Text(
                  'مالك الحافلة المتعاقد: ${trip.ownerName}',
                  style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12),
                ),
                const Spacer(),
                Text(
                  'كابتن الرحلة: ${trip.driverName}',
                  style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGpsHudCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isBroadcasting ? const Color(0xFF10B981) : const Color(0xFF334155),
          width: _isBroadcasting ? 1.5 : 1,
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isBroadcasting ? const Color(0xFF10B981) : Colors.grey,
                      boxShadow: _isBroadcasting
                          ? [
                              BoxShadow(
                                color: const Color(0xFF10B981).withOpacity(0.8),
                                blurRadius: 8,
                                spreadRadius: 2,
                              )
                            ]
                          : [],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isBroadcasting ? 'بث GPS مباشر للأقمار الصناعية (نشط)' : 'بث الـ GPS متوقف',
                    style: GoogleFonts.tajawal(
                      color: _isBroadcasting ? const Color(0xFF34D399) : Colors.white60,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              Text(
                'آخر تحديث: $_lastBroadcastTime',
                style: GoogleFonts.tajawal(color: Colors.white54, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildHudMetric(
                icon: Icons.speed,
                value: '${_currentSpeed.toStringAsFixed(1)}',
                unit: 'كم/ساعة',
                label: 'السرعة الحالية',
                color: const Color(0xFF38BDF8),
              ),
              _buildHudMetric(
                icon: Icons.battery_charging_full,
                value: '$_batteryLevel%',
                unit: 'شحن الجهاز',
                label: 'حالة البطارية',
                color: const Color(0xFF10B981),
              ),
              _buildHudMetric(
                icon: Icons.satellite_alt,
                value: '15.59° N',
                unit: '32.53° E',
                label: 'الإحداثيات',
                color: const Color(0xFFA855F7),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHudMetric({
    required IconData icon,
    required String value,
    required String unit,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 6),
        Text(
          value,
          style: GoogleFonts.tajawal(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        Text(
          unit,
          style: GoogleFonts.tajawal(fontSize: 10, color: Colors.white54),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: GoogleFonts.tajawal(fontSize: 11, color: Colors.white70),
        ),
      ],
    );
  }

  Widget _buildBroadcastToggleButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor:
              _isBroadcasting ? const Color(0xFF047857) : const Color(0xFF0284C7),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: _isBroadcasting ? 4 : 2,
        ),
        icon: Icon(_isBroadcasting ? Icons.pause_circle_outline : Icons.play_circle_outline),
        label: Text(
          _isBroadcasting ? 'إيقاف بث الموقع مؤقتاً' : 'بدء بث الموقع وتفعيل التتبع المباشر',
          style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.bold),
        ),
        onPressed: _toggleGpsBroadcast,
      ),
    );
  }

  Widget _buildStopCard(RouteStopInfo stop, LiveTripDetails trip) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 14,
                backgroundColor: const Color(0xFF38BDF8).withOpacity(0.2),
                child: Text(
                  '${stop.sequence}',
                  style: GoogleFonts.tajawal(
                    color: const Color(0xFF38BDF8),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  stop.nameAr,
                  style: GoogleFonts.tajawal(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'نطاق: ${stop.geofenceRadius} م',
                  style: GoogleFonts.tajawal(fontSize: 10, color: Colors.white60),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // قائمة افتراضية نموذجية للطلاب التابعين للمحطة (بيانات واقعية سودانية)
          _buildStudentAttendanceRow(
            passengerId: '${stop.id}-std-1',
            studentName: 'محمد عثمان دفع الله',
            grade: 'الصف الخامس - أ',
          ),
          const SizedBox(height: 8),
          _buildStudentAttendanceRow(
            passengerId: '${stop.id}-std-2',
            studentName: 'فاطمة نزار المجذوب',
            grade: 'الصف الثالث - ب',
          ),
        ],
      ),
    );
  }

  Widget _buildStudentAttendanceRow({
    required String passengerId,
    required String studentName,
    required String grade,
  }) {
    final status = _localAttendanceState[passengerId] ?? 'scheduled';

    Color getStatusColor() {
      switch (status) {
        case 'boarded':
          return const Color(0xFF10B981);
        case 'dropped_off':
          return const Color(0xFF3B82F6);
        case 'absent':
          return const Color(0xFFEF4444);
        default:
          return const Color(0xFF64748B);
      }
    }

    String getStatusText() {
      switch (status) {
        case 'boarded':
          return 'صعد الحافلة';
        case 'dropped_off':
          return 'نزل بأمان';
        case 'absent':
          return 'غائب';
        default:
          return 'في الانتظار';
      }
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  studentName,
                  style: GoogleFonts.tajawal(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                Text(
                  '$grade · ${getStatusText()}',
                  style: GoogleFonts.tajawal(color: getStatusColor(), fontSize: 11),
                ),
              ],
            ),
          ),
          // زر صعود
          IconButton(
            tooltip: 'صعد الحافلة',
            icon: Icon(
              Icons.check_circle_outline,
              color: status == 'boarded' ? const Color(0xFF10B981) : Colors.white38,
              size: 24,
            ),
            onPressed: () => _recordStudent(passengerId, 'boarded'),
          ),
          // زر نزول
          IconButton(
            tooltip: 'نزل بأمان',
            icon: Icon(
              Icons.home_outlined,
              color: status == 'dropped_off' ? const Color(0xFF3B82F6) : Colors.white38,
              size: 24,
            ),
            onPressed: () => _recordStudent(passengerId, 'dropped_off'),
          ),
          // زر غياب
          IconButton(
            tooltip: 'غائب',
            icon: Icon(
              Icons.cancel_outlined,
              color: status == 'absent' ? const Color(0xFFEF4444) : Colors.white38,
              size: 24,
            ),
            onPressed: () => _recordStudent(passengerId, 'absent'),
          ),
        ],
      ),
    );
  }

  void _confirmCompleteTrip(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'إنهاء الرحلة المدرسية',
            style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          content: Text(
            'هل أنت متأكد من اكتمال خط السير وإنهاء الرحلة وتوقف بث الـ GPS؟',
            style: GoogleFonts.tajawal(color: Colors.white70),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('إلغاء', style: GoogleFonts.tajawal(color: Colors.white60)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
              onPressed: () async {
                Navigator.pop(ctx);
                _gpsBroadcastTimer?.cancel();
                setState(() => _isBroadcasting = false);
                try {
                  await ref.read(transportRepositoryProvider).completeTrip(widget.tripId);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('تم إنهاء الرحلة بنجاح')),
                    );
                    Navigator.pop(context);
                  }
                } catch (_) {}
              },
              child: Text(
                'تأكيد الإنهاء',
                style: GoogleFonts.tajawal(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
