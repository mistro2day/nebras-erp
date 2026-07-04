from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.transport.interfaces.views import (
    VehicleCategoryViewSet, VehicleTypeViewSet, FleetViewSet, VehicleViewSet,
    DriverViewSet, DriverLicenseViewSet, DriverAssignmentViewSet, TransportSupervisorViewSet,
    RouteViewSet, RouteStopViewSet, TripViewSet, TripScheduleViewSet, PassengerViewSet,
    PassengerAssignmentViewSet, StudentPickupPointViewSet, StudentDropPointViewSet,
    TripAttendanceViewSet, VehicleInspectionViewSet, FuelStationViewSet, FuelTransactionViewSet,
    OdometerReadingViewSet, VehicleAccidentViewSet, TransportIncidentViewSet,
    VehicleInsuranceViewSet, VehicleRegistrationViewSet, VehiclePermitViewSet,
    TransportVendorViewSet, FleetStatisticsViewSet, TransportSettingsViewSet, TransportAuditViewSet
)

router = DefaultRouter()
router.register('vehicle-categories', VehicleCategoryViewSet, basename='vehicle-category')
router.register('vehicle-types', VehicleTypeViewSet, basename='vehicle-type')
router.register('fleets', FleetViewSet, basename='fleet')
router.register('vehicles', VehicleViewSet, basename='vehicle')
router.register('drivers', DriverViewSet, basename='driver')
router.register('driver-licenses', DriverLicenseViewSet, basename='driver-license')
router.register('driver-assignments', DriverAssignmentViewSet, basename='driver-assignment')
router.register('supervisors', TransportSupervisorViewSet, basename='supervisor')
router.register('routes', RouteViewSet, basename='route')
router.register('stops', RouteStopViewSet, basename='stop')
router.register('trips', TripViewSet, basename='trip')
router.register('trip-schedules', TripScheduleViewSet, basename='trip-schedule')
router.register('passengers', PassengerViewSet, basename='passenger')
router.register('passenger-assignments', PassengerAssignmentViewSet, basename='passenger-assignment')
router.register('pickups', StudentPickupPointViewSet, basename='pickup')
router.register('drops', StudentDropPointViewSet, basename='drop')
router.register('attendances', TripAttendanceViewSet, basename='attendance')
router.register('inspections', VehicleInspectionViewSet, basename='inspection')
router.register('fuel-stations', FuelStationViewSet, basename='fuel-station')
router.register('fuel-transactions', FuelTransactionViewSet, basename='fuel-transaction')
router.register('odometers', OdometerReadingViewSet, basename='odometer')
router.register('accidents', VehicleAccidentViewSet, basename='accident')
router.register('incidents', TransportIncidentViewSet, basename='incident')
router.register('insurances', VehicleInsuranceViewSet, basename='insurance')
router.register('registrations', VehicleRegistrationViewSet, basename='registration')
router.register('permits', VehiclePermitViewSet, basename='permit')
router.register('vendors', TransportVendorViewSet, basename='vendor')
router.register('statistics', FleetStatisticsViewSet, basename='statistics')
router.register('settings', TransportSettingsViewSet, basename='settings')
router.register('audits', TransportAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
