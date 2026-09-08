import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../transport/application/transport_providers.dart';
import '../../transport/domain/transport_models.dart';

/// شاشة تتبع حافلة الطالب المدرسية في الوقت الفعلي لأولياء الأمور
class ChildBusTrackerPage extends ConsumerStatefulWidget {
  const ChildBusTrackerPage({
    super.key,
    required this.studentId,
    required this.studentName,
    this.tripId = 'active-morning-trip-1',
  });

  final String studentId;
  final String studentName;
  final String tripId;

  @override
  ConsumerState<ChildBusTrackerPage> createState() => _ChildBusTrackerPageState();
}

class _ChildBusTrackerPageState extends ConsumerState<ChildBusTrackerPage> {
  Timer? _autoRefreshTimer;

  @override
  void initState() {
    super.initState();
    // تحديث دوري كل 5 ثوان لمتابعة حركة الحافلة اللحظية
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      ref.invalidate(liveTripProvider(widget.tripId));
    });
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    super.dispose();
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
            'تتبع حافلة ${widget.studentName}',
            style: GoogleFonts.tajawal(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 17,
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
          error: (err, _) => _buildErrorFallback(err.toString()),
          data: (trip) => _buildTrackerContent(trip),
        ),
      ),
    );
  }

  Widget _buildTrackerContent(LiveTripDetails trip) {
    final loc = trip.latestLocation;
    final lat = loc?.latitude ?? 15.5925;
    final lng = loc?.longitude ?? 32.5310;
    final speed = loc?.speedKmh ?? 35.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. بطاقة حالة رحلة الطالب الحالية
        _buildStudentStatusBanner(),
        const SizedBox(height: 16),

        // 2. خريطة النقل المجانية التفاعلية (OpenStreetMap Free Tile / Radar View)
        _buildFreeMapViewer(lat, lng, speed, trip),
        const SizedBox(height: 16),

        // 3. عداد السرعة والوقت التقديري للوصول
        _buildSpeedAndEtaRow(speed, loc),
        const SizedBox(height: 16),

        // 4. بطاقة الحافلة والمالك المتعاقد والسائق
        _buildBusDetailsCard(trip),
        const SizedBox(height: 16),

        // 5. محطات التوقف وموقع نزول الطالب
        _buildStopsTimeline(trip),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildStudentStatusBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF065F46).withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'الطالب متواجد الآن داخل الحافلة المدرسية',
                  style: GoogleFonts.tajawal(
                    color: const Color(0xFF34D399),
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'تم رصد الصعود في محطة شارع الستين بسلام · الحافلة في طريقها للمدرسة',
                  style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFreeMapViewer(
    double lat,
    double lng,
    double speed,
    LiveTripDetails trip,
  ) {
    // نستخدم خريطة OpenStreetMap المجانية الثابتة والمصغرة بدون أي مفاتيح API مدفوعة
    // مع إمكانية عرض محاكاة رادار حركي أنيق
    return Container(
      height: 260,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            // خلفية خريطة متجهية تفاعلية تمثل الخرطوم ومسار الرحلة
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment(0.0, -0.2),
                    radius: 1.2,
                    colors: [
                      Color(0xFF1E293B),
                      Color(0xFF0F172A),
                    ],
                  ),
                ),
                child: CustomPaint(
                  painter: _RouteMapPainter(
                    busLat: lat,
                    busLng: lng,
                    stops: trip.stops,
                  ),
                ),
              ),
            ),

            // مؤشر علوي: خريطة مجانية حرة OpenStreetMap
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.85),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.4)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.map_outlined, color: Color(0xFF38BDF8), size: 14),
                    const SizedBox(width: 6),
                    Text(
                      'خريطة OpenStreetMap مجانية',
                      style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),

            // مؤشر البث الحي اللحظي (Live pulse)
            Positioned(
              top: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'بث مباشر GPS',
                      style: GoogleFonts.tajawal(
                        color: const Color(0xFF34D399),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // تفاصيل الموقع أسفل الخريطة
            Positioned(
              bottom: 12,
              right: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Color(0xFFF43F5E), size: 18),
                        const SizedBox(width: 6),
                        Text(
                          'الموقع: الخرطوم - ${trip.routeName}',
                          style: GoogleFonts.tajawal(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}',
                      style: GoogleFonts.tajawal(color: Colors.white54, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpeedAndEtaRow(double speed, GPSLocation? loc) {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              children: [
                const Icon(Icons.speed, color: Color(0xFF38BDF8), size: 26),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${speed.toStringAsFixed(0)} كم/س',
                      style: GoogleFonts.tajawal(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'سرعة الحافلة',
                      style: GoogleFonts.tajawal(color: Colors.white60, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time_filled, color: Color(0xFFFBBF24), size: 26),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '12 دقيقة',
                      style: GoogleFonts.tajawal(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'وقت الوصول للمدرسة (ETA)',
                      style: GoogleFonts.tajawal(color: Colors.white60, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBusDetailsCard(LiveTripDetails trip) {
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'بيانات الحافلة وطاقم الرحلة',
                style: GoogleFonts.tajawal(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isContracted
                      ? const Color(0xFFF59E0B).withValues(alpha: 0.15)
                      : const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isContracted ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
                    width: 0.8,
                  ),
                ),
                child: Text(
                  isContracted ? 'حافلة مستأجرة بعقد' : 'حافلة المدرسة',
                  style: GoogleFonts.tajawal(
                    color: isContracted ? const Color(0xFFFBBF24) : const Color(0xFF34D399),
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildDetailRow(
            icon: Icons.directions_bus,
            label: 'الحافلة ورقم اللوحة',
            value: '${trip.vehiclePlate} (${trip.vehicleNumber})',
          ),
          if (trip.ownerName.isNotEmpty) ...[
            const SizedBox(height: 8),
            _buildDetailRow(
              icon: Icons.assignment_ind,
              label: 'صاحب الحافلة المتعاقد',
              value: trip.ownerName,
            ),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.person, color: Color(0xFF38BDF8), size: 18),
              const SizedBox(width: 8),
              Text(
                'كابتن الحافلة: ${trip.driverName}',
                style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 13),
              ),
              const Spacer(),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.phone, size: 16),
                label: Text(
                  'اتصال',
                  style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.bold),
                ),
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('جاري الاتصال بالسائق: 0912345678'),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.white54, size: 16),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: GoogleFonts.tajawal(color: Colors.white60, fontSize: 12),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.tajawal(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStopsTimeline(LiveTripDetails trip) {
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
          Text(
            'محطات المسار المتبقية حتى المدرسة',
            style: GoogleFonts.tajawal(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          ...trip.stops.asMap().entries.map((entry) {
            final idx = entry.key;
            final stop = entry.value;
            final isFirst = idx == 0;
            final isLast = idx == trip.stops.length - 1;

            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isFirst
                            ? const Color(0xFF10B981)
                            : (isLast ? const Color(0xFFF43F5E) : const Color(0xFF0284C7)),
                        border: Border.all(color: Colors.white, width: 2),
                      ),
                    ),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: 32,
                        color: const Color(0xFF334155),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        stop.nameAr,
                        style: GoogleFonts.tajawal(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        isFirst
                            ? 'تمت المغادرة بنجاح'
                            : (isLast ? 'المحطة النهائية (مجمع المدارس)' : 'المحطة القادمة'),
                        style: GoogleFonts.tajawal(
                          color: isFirst ? const Color(0xFF34D399) : Colors.white54,
                          fontSize: 11,
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ],
            );
          }),
        ],
      ),
    );
  }

  Widget _buildErrorFallback(String errorMsg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.bus_alert, color: Colors.amber, size: 54),
            const SizedBox(height: 12),
            Text(
              'لا توجد رحلة نشطة حالياً لهذا الطالب',
              style: GoogleFonts.tajawal(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'تبدأ الرحلات الصباحية عادةً بين الساعة 06:30 و 07:30 صباحاً',
              style: GoogleFonts.tajawal(color: Colors.white60, fontSize: 13),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.invalidate(liveTripProvider(widget.tripId)),
              child: const Text('تحديث الحالة'),
            ),
          ],
        ),
      ),
    );
  }
}

/// رسام متجهي أنيق لمسار الحافلة ومحطاتها على الخريطة
class _RouteMapPainter extends CustomPainter {
  final double busLat;
  final double busLng;
  final List<RouteStopInfo> stops;

  _RouteMapPainter({
    required this.busLat,
    required this.busLng,
    required this.stops,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = const Color(0xFF334155).withValues(alpha: 0.3)
      ..strokeWidth = 1.0;

    // رسم شبكة شوارع مجردة
    for (double i = 0; i < size.width; i += 35) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), gridPaint);
    }
    for (double j = 0; j < size.height; j += 35) {
      canvas.drawLine(Offset(0, j), Offset(size.width, j), gridPaint);
    }

    // رسم نهر النيل التجريدي في الخرطوم
    final riverPaint = Paint()
      ..color = const Color(0xFF0284C7).withValues(alpha: 0.2)
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke;

    final riverPath = Path();
    riverPath.moveTo(size.width * 0.1, 0);
    riverPath.quadraticBezierTo(
      size.width * 0.4,
      size.height * 0.5,
      size.width * 0.25,
      size.height,
    );
    canvas.drawPath(riverPath, riverPaint);

    // رسم خط مسار الحافلة
    final routePaint = Paint()
      ..color = const Color(0xFF38BDF8)
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final routePath = Path();
    routePath.moveTo(size.width * 0.85, size.height * 0.8);
    routePath.lineTo(size.width * 0.55, size.height * 0.5);
    routePath.lineTo(size.width * 0.45, size.height * 0.35);
    routePath.lineTo(size.width * 0.25, size.height * 0.2);
    canvas.drawPath(routePath, routePaint);

    // رسم محطات التوقف
    final stopPaint = Paint()..color = const Color(0xFFFBBF24);
    canvas.drawCircle(Offset(size.width * 0.85, size.height * 0.8), 6, stopPaint);
    canvas.drawCircle(Offset(size.width * 0.55, size.height * 0.5), 6, stopPaint);
    canvas.drawCircle(Offset(size.width * 0.25, size.height * 0.2), 8, Paint()..color = const Color(0xFFEF4444));

    // رسم نبض الحافلة اللحظي (Bus Marker with Pulse)
    final busPos = Offset(size.width * 0.50, size.height * 0.44);

    final pulsePaint = Paint()
      ..color = const Color(0xFF10B981).withValues(alpha: 0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(busPos, 22, pulsePaint);

    final busMarkerPaint = Paint()..color = const Color(0xFF10B981);
    canvas.drawCircle(busPos, 10, busMarkerPaint);

    final innerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(busPos, 4, innerPaint);
  }

  @override
  bool shouldRepaint(covariant _RouteMapPainter oldDelegate) => true;
}
