from rest_framework import serializers
from apps.transport.domain.models import (
    VehicleCategory, VehicleType, Fleet, Vehicle, Driver, DriverLicense,
    DriverAssignment, TransportSupervisor, Route, RouteStop, Trip,
    TripSchedule, Passenger, PassengerAssignment, StudentPickupPoint,
    StudentDropPoint, TripAttendance, VehicleInspection, FuelStation,
    FuelTransaction, OdometerReading, VehicleAccident, TransportIncident,
    VehicleInsurance, VehicleRegistration, VehiclePermit, TransportVendor,
    FleetStatistics, TransportSettings, TransportAudit
)

class BaseTransportSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class VehicleCategorySerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehicleCategory
        fields = '__all__'

class VehicleTypeSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehicleType
        fields = '__all__'

class FleetSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = Fleet
        fields = '__all__'

class VehicleSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = Vehicle
        fields = '__all__'

class DriverSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = Driver
        fields = '__all__'

class DriverLicenseSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = DriverLicense
        fields = '__all__'

class DriverAssignmentSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = DriverAssignment
        fields = '__all__'

class TransportSupervisorSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TransportSupervisor
        fields = '__all__'

class RouteSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = Route
        fields = '__all__'

class RouteStopSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = RouteStop
        fields = '__all__'

class TripSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = Trip
        fields = '__all__'

class TripScheduleSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TripSchedule
        fields = '__all__'

class PassengerSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = Passenger
        fields = '__all__'

class PassengerAssignmentSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = PassengerAssignment
        fields = '__all__'

class StudentPickupPointSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = StudentPickupPoint
        fields = '__all__'

class StudentDropPointSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = StudentDropPoint
        fields = '__all__'

class TripAttendanceSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TripAttendance
        fields = '__all__'

class VehicleInspectionSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehicleInspection
        fields = '__all__'

class FuelStationSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = FuelStation
        fields = '__all__'

class FuelTransactionSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = FuelTransaction
        fields = '__all__'

class OdometerReadingSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = OdometerReading
        fields = '__all__'

class VehicleAccidentSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehicleAccident
        fields = '__all__'

class TransportIncidentSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TransportIncident
        fields = '__all__'

class VehicleInsuranceSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehicleInsurance
        fields = '__all__'

class VehicleRegistrationSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehicleRegistration
        fields = '__all__'

class VehiclePermitSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = VehiclePermit
        fields = '__all__'

class TransportVendorSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TransportVendor
        fields = '__all__'

class FleetStatisticsSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = FleetStatistics
        fields = '__all__'

class TransportSettingsSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TransportSettings
        fields = '__all__'

class TransportAuditSerializer(BaseTransportSerializer):
    class Meta(BaseTransportSerializer.Meta):
        model = TransportAudit
        fields = '__all__'
