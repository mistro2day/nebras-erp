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
    FleetStatistics, TransportSettings, TransportAudit
)
from apps.transport.interfaces.serializers import (
    VehicleCategorySerializer, VehicleTypeSerializer, FleetSerializer, VehicleSerializer,
    DriverSerializer, DriverLicenseSerializer, DriverAssignmentSerializer, TransportSupervisorSerializer,
    RouteSerializer, RouteStopSerializer, TripSerializer, TripScheduleSerializer, PassengerSerializer,
    PassengerAssignmentSerializer, StudentPickupPointSerializer, StudentDropPointSerializer,
    TripAttendanceSerializer, VehicleInspectionSerializer, FuelStationSerializer, FuelTransactionSerializer,
    OdometerReadingSerializer, VehicleAccidentSerializer, TransportIncidentSerializer,
    VehicleInsuranceSerializer, VehicleRegistrationSerializer, VehiclePermitSerializer,
    TransportVendorSerializer, FleetStatisticsSerializer, TransportSettingsSerializer, TransportAuditSerializer
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


class TripViewSet(BaseCRUDViewSet):
    model_class = Trip
    serializer_class = TripSerializer

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم أسطول النقل والمواصلات."""
        tenant_id = request.tenant_id
        
        total_vehicles = Vehicle.objects.filter(tenant_id=tenant_id).count()
        active_trips = Trip.objects.filter(tenant_id=tenant_id, status='running').count()
        total_drivers = Driver.objects.filter(tenant_id=tenant_id).count()
        failed_inspections = VehicleInspection.objects.filter(tenant_id=tenant_id, status='failed', inspection_date=timezone.now().date()).count()

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
