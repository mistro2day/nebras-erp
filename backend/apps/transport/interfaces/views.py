from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
import uuid

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.transport.domain.models import (
    VehicleCategory, VehicleType, Fleet, Vehicle, Driver, DriverLicense,
    DriverAssignment, TransportSupervisor, Route, RouteStop, Trip,
    TripSchedule, Passenger, PassengerAssignment, StudentPickupPoint,
    StudentDropPoint, TripAttendance, VehicleInspection, FuelStation,
    FuelTransaction, OdometerReading, VehicleAccident, TransportIncident,
    VehicleInsurance, VehicleRegistration, VehiclePermit, TransportVendor,
    FleetStatistics, TransportSettings, TransportAudit,
    BusRentalAgreement, BusRentalPayment, VehicleGPSLocation
)
from apps.transport.interfaces.serializers import (
    VehicleCategorySerializer, VehicleTypeSerializer, FleetSerializer, VehicleSerializer,
    DriverSerializer, DriverLicenseSerializer, DriverAssignmentSerializer, TransportSupervisorSerializer,
    RouteSerializer, RouteStopSerializer, TripSerializer, TripScheduleSerializer, PassengerSerializer,
    PassengerAssignmentSerializer, StudentPickupPointSerializer, StudentDropPointSerializer,
    TripAttendanceSerializer, VehicleInspectionSerializer, FuelStationSerializer, FuelTransactionSerializer,
    OdometerReadingSerializer, VehicleAccidentSerializer, TransportIncidentSerializer,
    VehicleInsuranceSerializer, VehicleRegistrationSerializer, VehiclePermitSerializer,
    TransportVendorSerializer, FleetStatisticsSerializer, TransportSettingsSerializer, TransportAuditSerializer,
    BusRentalAgreementSerializer, BusRentalPaymentSerializer, VehicleGPSLocationSerializer
)
from apps.transport.application.services import TripService, FuelService, VehicleInspectionService



class VehicleCategoryViewSet(BaseCRUDViewSet):
    model_class = VehicleCategory
    serializer_class = VehicleCategorySerializer


class VehicleTypeViewSet(BaseCRUDViewSet):
    model_class = VehicleType
    serializer_class = VehicleTypeSerializer


class FleetViewSet(BaseCRUDViewSet):
    model_class = Fleet
    serializer_class = FleetSerializer


class VehicleViewSet(BaseCRUDViewSet):
    model_class = Vehicle
    serializer_class = VehicleSerializer

    @action(detail=True, methods=['post'], url_path='fuel')
    def fuel(self, request, pk=None):
        tenant_id = request.tenant_id
        station_id = request.data.get('station_id')
        liters = request.data.get('liters', 0.0)
        cost = request.data.get('cost', 0.0)
        odometer = request.data.get('odometer', 0.0)
        debit_gl_account_id = request.data.get('debit_gl_account_id')
        credit_gl_account_id = request.data.get('credit_gl_account_id')

        if not station_id or not debit_gl_account_id or not credit_gl_account_id:
            return Response({'error': 'station_id, debit_gl_account_id, credit_gl_account_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        tx = FuelService.record_fuel_transaction(
            tenant_id=tenant_id,
            vehicle_id=pk,
            station_id=station_id,
            liters=liters,
            cost=cost,
            odometer=odometer,
            debit_gl_account_id=debit_gl_account_id,
            credit_gl_account_id=credit_gl_account_id,
            user_id=request.user.id if request.user else None
        )
        serializer = FuelTransactionSerializer(tx)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='inspect')
    def inspect(self, request, pk=None):
        tenant_id = request.tenant_id
        inspection_status = request.data.get('status', 'passed')
        notes = request.data.get('notes')

        inspection = VehicleInspectionService.record_inspection(
            tenant_id=tenant_id,
            vehicle_id=pk,
            status=inspection_status,
            notes=notes,
            user_id=request.user.id if request.user else None
        )
        serializer = VehicleInspectionSerializer(inspection)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DriverViewSet(BaseCRUDViewSet):
    model_class = Driver
    serializer_class = DriverSerializer


class DriverLicenseViewSet(BaseCRUDViewSet):
    model_class = DriverLicense
    serializer_class = DriverLicenseSerializer


class DriverAssignmentViewSet(BaseCRUDViewSet):
    model_class = DriverAssignment
    serializer_class = DriverAssignmentSerializer


class TransportSupervisorViewSet(BaseCRUDViewSet):
    model_class = TransportSupervisor
    serializer_class = TransportSupervisorSerializer


class RouteViewSet(BaseCRUDViewSet):
    model_class = Route
    serializer_class = RouteSerializer


class RouteStopViewSet(BaseCRUDViewSet):
    model_class = RouteStop
    serializer_class = RouteStopSerializer


def _safe_tenant_filter(qs, request):
    tenant = getattr(request, 'tenant', None)
    if tenant and hasattr(tenant, 'id'):
        return qs.filter(tenant_id=tenant.id)
    t_id = getattr(request, 'tenant_id', None)
    if t_id:
        try:
            return qs.filter(tenant_id=uuid.UUID(str(t_id)))
        except (ValueError, AttributeError):
            pass
    return qs


class TripViewSet(BaseCRUDViewSet):
    model_class = Trip
    serializer_class = TripSerializer

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم أسطول النقل والمواصلات."""
        total_vehicles = _safe_tenant_filter(Vehicle.objects.all(), request).count()
        active_trips = _safe_tenant_filter(Trip.objects.filter(status='running'), request).count()
        total_drivers = _safe_tenant_filter(Driver.objects.all(), request).count()
        failed_inspections = _safe_tenant_filter(VehicleInspection.objects.filter(status='failed', inspection_date=timezone.now().date()), request).count()

        stats = {
            'total_vehicles': total_vehicles,
            'active_trips': active_trips,
            'total_drivers': total_drivers,
            'failed_inspections': failed_inspections
        }
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        tenant_id = request.tenant_id
        trip = TripService.start_trip(tenant_id, pk, request.user.id if request.user else None)
        serializer = self.get_serializer(trip)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        tenant_id = request.tenant_id
        trip = TripService.complete_trip(tenant_id, pk, request.user.id if request.user else None)
        serializer = self.get_serializer(trip)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='attendance')
    def attendance(self, request, pk=None):
        tenant_id = request.tenant_id
        passenger_id = request.data.get('passenger_id')
        attendance_status = request.data.get('status', 'boarded')

        if not passenger_id:
            return Response({'error': 'passenger_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        attendance = TripService.record_attendance(
            tenant_id=tenant_id,
            trip_id=pk,
            passenger_id=passenger_id,
            status=attendance_status,
            user_id=request.user.id if request.user else None
        )
        serializer = TripAttendanceSerializer(attendance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='telemetry')
    def record_telemetry(self, request, pk=None):
        """بث واستقبال إحداثيات GPS المباشرة من تطبيق الجوال للسائق/مشرف الحافلة."""
        trip = self.get_object()
        tenant_id = trip.tenant_id

        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        speed_kmh = request.data.get('speed_kmh', 0.0)
        heading = request.data.get('heading', 0.0)
        battery_level = request.data.get('battery_level', 100)

        if latitude is None or longitude is None:
            return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

        # تحديث حالة الرحلة للتشغيل التلقائي عند بدء البث
        if trip.status == 'scheduled':
            trip.status = 'running'
            trip.start_time = timezone.now()
            trip.save(update_fields=['status', 'start_time'])
            if trip.vehicle and trip.vehicle.status != 'on_trip':
                trip.vehicle.status = 'on_trip'
                trip.vehicle.save(update_fields=['status'])

        loc = VehicleGPSLocation.objects.create(
            tenant_id=tenant_id,
            trip=trip,
            vehicle=trip.vehicle,
            latitude=latitude,
            longitude=longitude,
            speed_kmh=speed_kmh,
            heading=heading,
            battery_level=battery_level,
            recorded_at=timezone.now()
        )

        return Response({
            'success': True,
            'location_id': str(loc.id),
            'trip_id': str(trip.id),
            'trip_status': trip.status,
            'recorded_at': loc.recorded_at.isoformat()
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='live-tracking')
    def live_tracking(self, request, pk=None):
        """تتبع الرحلة الحية لخريطة ولي الأمر والإدارة (الموقع اللحظي، المحطات، والمسار)."""
        trip = self.get_object()
        latest_loc = trip.gps_breadcrumbs.order_by('-recorded_at').first()
        breadcrumbs = trip.gps_breadcrumbs.order_by('-recorded_at')[:15]

        # نقاط محطات المسار
        stops_data = []
        if trip.route:
            for s in trip.route.stops.all().order_by('sequence_number'):
                stops_data.append({
                    'id': str(s.id),
                    'name_ar': s.stop_name_ar,
                    'sequence': s.sequence_number,
                    'latitude': float(s.latitude) if s.latitude else 15.5007,
                    'longitude': float(s.longitude) if s.longitude else 32.5599,
                    'geofence_radius': s.geofence_radius_meters
                })

        # ركاب الرحلة وحالتهم
        attendances_data = []
        for att in trip.attendances.all():
            attendances_data.append({
                'passenger_id': str(att.passenger_id),
                'status': att.status,
                'timestamp': att.timestamp.strftime('%H:%M') if att.timestamp else ''
            })

        latest_loc_dict = None
        if latest_loc:
            latest_loc_dict = {
                'latitude': float(latest_loc.latitude),
                'longitude': float(latest_loc.longitude),
                'speed_kmh': float(latest_loc.speed_kmh),
                'heading': float(latest_loc.heading),
                'battery_level': latest_loc.battery_level,
                'recorded_at': latest_loc.recorded_at.strftime('%Y-%m-%d %H:%M:%S')
            }

        # أسماء السائقين والمالك
        driver_name = "سائق حافلة معتمد"
        try:
            from apps.hr.domain.models import Employee
            emp = Employee.objects.filter(id=trip.driver.employee_id).first()
            if emp:
                driver_name = emp.full_name_ar or emp.full_name_en or driver_name
        except Exception:
            pass

        return Response({
            'trip_id': str(trip.id),
            'status': trip.status,
            'route_name': trip.route.name_ar if trip.route else '',
            'route_code': trip.route.code if trip.route else '',
            'vehicle_plate': trip.vehicle.plate_number if trip.vehicle else '',
            'vehicle_number': trip.vehicle.vehicle_number if trip.vehicle else '',
            'ownership_type': trip.vehicle.get_ownership_type_display() if trip.vehicle else '',
            'owner_name': trip.vehicle.owner_name if trip.vehicle else '',
            'owner_phone': trip.vehicle.owner_phone if trip.vehicle else '',
            'driver_name': driver_name,
            'driver_license': trip.driver.license_number if trip.driver else '',
            'latest_location': latest_loc_dict,
            'breadcrumbs': [
                {'lat': float(b.latitude), 'lng': float(b.longitude), 'speed': float(b.speed_kmh)}
                for b in breadcrumbs
            ],
            'stops': stops_data,
            'attendances': attendances_data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='live-fleet')
    def live_fleet(self, request):
        """جلب جميع الحافلات النشطة على الخريطة للوحة تشغيل الأسطول."""
        running_trips = _safe_tenant_filter(Trip.objects.filter(status='running'), request).select_related('route', 'vehicle', 'driver')

        fleet_data = []
        for t in running_trips:
            last_loc = t.gps_breadcrumbs.order_by('-recorded_at').first()
            fleet_data.append({
                'trip_id': str(t.id),
                'route_name': t.route.name_ar if t.route else '',
                'vehicle_plate': t.vehicle.plate_number if t.vehicle else '',
                'vehicle_number': t.vehicle.vehicle_number if t.vehicle else '',
                'ownership_type': t.vehicle.get_ownership_type_display() if t.vehicle else '',
                'owner_name': t.vehicle.owner_name if t.vehicle else '',
                'capacity': t.vehicle.capacity if t.vehicle else 0,
                'status': t.status,
                'latitude': float(last_loc.latitude) if last_loc else 15.5007,
                'longitude': float(last_loc.longitude) if last_loc else 32.5599,
                'speed_kmh': float(last_loc.speed_kmh) if last_loc else 0.0,
                'recorded_at': last_loc.recorded_at.strftime('%H:%M:%S') if last_loc else ''
            })

        return Response({'active_count': len(fleet_data), 'fleet': fleet_data}, status=status.HTTP_200_OK)



class TripScheduleViewSet(BaseCRUDViewSet):
    model_class = TripSchedule
    serializer_class = TripScheduleSerializer


class PassengerViewSet(BaseCRUDViewSet):
    model_class = Passenger
    serializer_class = PassengerSerializer


class PassengerAssignmentViewSet(BaseCRUDViewSet):
    model_class = PassengerAssignment
    serializer_class = PassengerAssignmentSerializer


class StudentPickupPointViewSet(BaseCRUDViewSet):
    model_class = StudentPickupPoint
    serializer_class = StudentPickupPointSerializer


class StudentDropPointViewSet(BaseCRUDViewSet):
    model_class = StudentDropPoint
    serializer_class = StudentDropPointSerializer


class TripAttendanceViewSet(BaseCRUDViewSet):
    model_class = TripAttendance
    serializer_class = TripAttendanceSerializer


class VehicleInspectionViewSet(BaseCRUDViewSet):
    model_class = VehicleInspection
    serializer_class = VehicleInspectionSerializer


class FuelStationViewSet(BaseCRUDViewSet):
    model_class = FuelStation
    serializer_class = FuelStationSerializer


class FuelTransactionViewSet(BaseCRUDViewSet):
    model_class = FuelTransaction
    serializer_class = FuelTransactionSerializer


class OdometerReadingViewSet(BaseCRUDViewSet):
    model_class = OdometerReading
    serializer_class = OdometerReadingSerializer


class VehicleAccidentViewSet(BaseCRUDViewSet):
    model_class = VehicleAccident
    serializer_class = VehicleAccidentSerializer


class TransportIncidentViewSet(BaseCRUDViewSet):
    model_class = TransportIncident
    serializer_class = TransportIncidentSerializer


class VehicleInsuranceViewSet(BaseCRUDViewSet):
    model_class = VehicleInsurance
    serializer_class = VehicleInsuranceSerializer


class VehicleRegistrationViewSet(BaseCRUDViewSet):
    model_class = VehicleRegistration
    serializer_class = VehicleRegistrationSerializer


class VehiclePermitViewSet(BaseCRUDViewSet):
    model_class = VehiclePermit
    serializer_class = VehiclePermitSerializer


class TransportVendorViewSet(BaseCRUDViewSet):
    model_class = TransportVendor
    serializer_class = TransportVendorSerializer


class FleetStatisticsViewSet(BaseCRUDViewSet):
    model_class = FleetStatistics
    serializer_class = FleetStatisticsSerializer


class TransportSettingsViewSet(BaseCRUDViewSet):
    model_class = TransportSettings
    serializer_class = TransportSettingsSerializer


class TransportAuditViewSet(BaseCRUDViewSet):
    model_class = TransportAudit
    serializer_class = TransportAuditSerializer


class BusRentalAgreementViewSet(BaseCRUDViewSet):
    model_class = BusRentalAgreement
    serializer_class = BusRentalAgreementSerializer

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        try:
            res_data = response.data.get('data') if isinstance(response.data, dict) else response.data
            agreement_id = res_data.get('id') if isinstance(res_data, dict) else None
            if agreement_id:
                agr = BusRentalAgreement.objects.filter(id=agreement_id).first()
                if agr and agr.vehicle:
                    v = agr.vehicle
                    v.ownership_type = 'contracted'
                    v.owner_name = agr.owner_name
                    v.owner_phone = agr.owner_phone
                    v.monthly_rent_sdg = agr.monthly_rent_sdg
                    v.rent_payment_method = agr.payment_method
                    v.owner_bank_account = agr.bank_account_number
                    v.save(update_fields=['ownership_type', 'owner_name', 'owner_phone', 'monthly_rent_sdg', 'rent_payment_method', 'owner_bank_account'])

                    # إنشاء دفعة استحقاق للشهر الحالي تلقائياً
                    BusRentalPayment.objects.create(
                        tenant_id=agr.tenant_id,
                        agreement=agr,
                        vehicle=v,
                        rental_period="إيجار شهر سبتمبر 2026",
                        amount_sdg=agr.monthly_rent_sdg,
                        payment_method=agr.payment_method,
                        status='pending',
                        notes="استحقاق الإيجار الشهري الدوري"
                    )
        except Exception:
            pass
        return response


class BusRentalPaymentViewSet(BaseCRUDViewSet):
    model_class = BusRentalPayment
    serializer_class = BusRentalPaymentSerializer

    @action(detail=True, methods=['post'], url_path='mark-paid')
    def mark_paid(self, request, pk=None):
        tenant_id = request.tenant_id
        payment = self.get_object()
        ref_number = request.data.get('reference_number', payment.reference_number)
        method = request.data.get('payment_method', payment.payment_method)

        payment.status = 'paid'
        payment.reference_number = ref_number
        payment.payment_method = method
        payment.payment_date = timezone.localdate()
        payment.save(update_fields=['status', 'reference_number', 'payment_method', 'payment_date'])

        return Response(self.get_serializer(payment).data, status=status.HTTP_200_OK)

