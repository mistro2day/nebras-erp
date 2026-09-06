/// بيانات الموقع الجغرافي اللحظي
class GPSLocation {
  final double latitude;
  final double longitude;
  final double speedKmh;
  final double heading;
  final int batteryLevel;
  final String recordedAt;

  GPSLocation({
    required this.latitude,
    required this.longitude,
    required this.speedKmh,
    required this.heading,
    required this.batteryLevel,
    required this.recordedAt,
  });

  factory GPSLocation.fromJson(Map<String, dynamic> json) {
    return GPSLocation(
      latitude: (json['latitude'] as num?)?.toDouble() ?? 15.5007,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 32.5599,
      speedKmh: (json['speed_kmh'] as num?)?.toDouble() ?? 0.0,
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      batteryLevel: json['battery_level'] as int? ?? 100,
      recordedAt: json['recorded_at'] as String? ?? '',
    );
  }
}

/// بيانات محطة التوقف في المسار
class RouteStopInfo {
  final String id;
  final String nameAr;
  final int sequence;
  final double latitude;
  final double longitude;
  final int geofenceRadius;

  RouteStopInfo({
    required this.id,
    required this.nameAr,
    required this.sequence,
    required this.latitude,
    required this.longitude,
    required this.geofenceRadius,
  });

  factory RouteStopInfo.fromJson(Map<String, dynamic> json) {
    return RouteStopInfo(
      id: json['id'] as String? ?? '',
      nameAr: json['name_ar'] as String? ?? 'محطة',
      sequence: json['sequence'] as int? ?? 1,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 15.5007,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 32.5599,
      geofenceRadius: json['geofence_radius'] as int? ?? 100,
    );
  }
}

/// سجل حضور راكب/طالب
class PassengerAttendance {
  final String passengerId;
  final String status; // boarded, dropped_off, absent
  final String timestamp;

  PassengerAttendance({
    required this.passengerId,
    required this.status,
    required this.timestamp,
  });

  factory PassengerAttendance.fromJson(Map<String, dynamic> json) {
    return PassengerAttendance(
      passengerId: json['passenger_id'] as String? ?? '',
      status: json['status'] as String? ?? 'scheduled',
      timestamp: json['timestamp'] as String? ?? '',
    );
  }
}

/// تفاصيل الرحلة المباشرة للتتبع
class LiveTripDetails {
  final String tripId;
  final String status; // scheduled, running, completed, cancelled
  final String routeName;
  final String routeCode;
  final String vehiclePlate;
  final String vehicleNumber;
  final String ownershipType;
  final String ownerName;
  final String ownerPhone;
  final String driverName;
  final String driverLicense;
  final GPSLocation? latestLocation;
  final List<GPSLocation> breadcrumbs;
  final List<RouteStopInfo> stops;
  final List<PassengerAttendance> attendances;

  LiveTripDetails({
    required this.tripId,
    required this.status,
    required this.routeName,
    required this.routeCode,
    required this.vehiclePlate,
    required this.vehicleNumber,
    required this.ownershipType,
    required this.ownerName,
    required this.ownerPhone,
    required this.driverName,
    required this.driverLicense,
    this.latestLocation,
    required this.breadcrumbs,
    required this.stops,
    required this.attendances,
  });

  factory LiveTripDetails.fromJson(Map<String, dynamic> json) {
    final locJson = json['latest_location'] as Map<String, dynamic>?;
    final breadcrumbsList = (json['breadcrumbs'] as List<dynamic>? ?? [])
        .map((b) => GPSLocation(
              latitude: (b['lat'] as num?)?.toDouble() ?? 15.5007,
              longitude: (b['lng'] as num?)?.toDouble() ?? 32.5599,
              speedKmh: (b['speed'] as num?)?.toDouble() ?? 0.0,
              heading: 0.0,
              batteryLevel: 100,
              recordedAt: '',
            ))
        .toList();

    final stopsList = (json['stops'] as List<dynamic>? ?? [])
        .map((s) => RouteStopInfo.fromJson(s as Map<String, dynamic>))
        .toList();

    final attList = (json['attendances'] as List<dynamic>? ?? [])
        .map((a) => PassengerAttendance.fromJson(a as Map<String, dynamic>))
        .toList();

    return LiveTripDetails(
      tripId: json['trip_id'] as String? ?? '',
      status: json['status'] as String? ?? 'scheduled',
      routeName: json['route_name'] as String? ?? '',
      routeCode: json['route_code'] as String? ?? '',
      vehiclePlate: json['vehicle_plate'] as String? ?? '',
      vehicleNumber: json['vehicle_number'] as String? ?? '',
      ownershipType: json['ownership_type'] as String? ?? 'مستأجرة بعقد',
      ownerName: json['owner_name'] as String? ?? '',
      ownerPhone: json['owner_phone'] as String? ?? '',
      driverName: json['driver_name'] as String? ?? 'كابتن الرحلة',
      driverLicense: json['driver_license'] as String? ?? '',
      latestLocation: locJson != null ? GPSLocation.fromJson(locJson) : null,
      breadcrumbs: breadcrumbsList,
      stops: stopsList,
      attendances: attList,
    );
  }
}
