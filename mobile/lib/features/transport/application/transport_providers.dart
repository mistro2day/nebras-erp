import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_service.dart';
import '../../../core/providers.dart';
import '../domain/transport_models.dart';

class TransportRepository {
  final ApiService _api;

  TransportRepository(this._api);

  /// جلب بيانات التتبع الحي للرحلة (الموقع اللحظي، المحطات، وسجل الطلاب)
  Future<LiveTripDetails> getLiveTracking(String tripId) async {
    final res = await _api.get('/api/v1/transport/trips/$tripId/live-tracking/');
    return LiveTripDetails.fromJson(res as Map<String, dynamic>);
  }

  /// إرسال إحداثيات GPS المباشرة من السائق / مشرف الحافلة
  Future<Map<String, dynamic>> sendTelemetry({
    required String tripId,
    required double latitude,
    required double longitude,
    required double speedKmh,
    required double heading,
    int batteryLevel = 100,
  }) async {
    final res = await _api.post(
      '/api/v1/transport/trips/$tripId/telemetry/',
      data: {
        'latitude': latitude,
        'longitude': longitude,
        'speed_kmh': speedKmh,
        'heading': heading,
        'battery_level': batteryLevel,
      },
    );
    return res as Map<String, dynamic>;
  }

  /// رصد حضور وصعود أو نزول الراكب / الطالب
  Future<Map<String, dynamic>> recordAttendance({
    required String tripId,
    required String passengerId,
    required String status, // 'boarded', 'dropped_off', 'absent'
  }) async {
    final res = await _api.post(
      '/api/v1/transport/trips/$tripId/attendance/',
      data: {
        'passenger_id': passengerId,
        'status': status,
      },
    );
    return res as Map<String, dynamic>;
  }

  /// بدء الرحلة
  Future<void> startTrip(String tripId) async {
    await _api.post('/api/v1/transport/trips/$tripId/start/');
  }

  /// إنهاء الرحلة
  Future<void> completeTrip(String tripId) async {
    await _api.post('/api/v1/transport/trips/$tripId/complete/');
  }

  /// جلب أسطول الحافلات النشط حالياً
  Future<List<dynamic>> getLiveFleet() async {
    final res = await _api.get('/api/v1/transport/trips/live-fleet/');
    return res as List<dynamic>;
  }
}

final transportRepositoryProvider = Provider<TransportRepository>((ref) {
  return TransportRepository(ref.watch(apiServiceProvider));
});

/// مزود جلب التتبع المباشر لرحلة محددة
final liveTripProvider =
    FutureProvider.family<LiveTripDetails, String>((ref, tripId) async {
  final repo = ref.watch(transportRepositoryProvider);
  return repo.getLiveTracking(tripId);
});

/// مزود قائمة الحافلات العاملة في الميدان
final liveFleetListProvider = FutureProvider<List<dynamic>>((ref) async {
  final repo = ref.watch(transportRepositoryProvider);
  return repo.getLiveFleet();
});
