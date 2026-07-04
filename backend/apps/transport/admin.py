from django.contrib import admin
from apps.transport.domain.models import (
    VehicleCategory, VehicleType, Fleet, Vehicle, Driver, DriverLicense,
    DriverAssignment, TransportSupervisor, Route, RouteStop, Trip,
    TripSchedule, Passenger, PassengerAssignment, StudentPickupPoint,
    StudentDropPoint, TripAttendance, VehicleInspection, FuelStation,
    FuelTransaction, OdometerReading, VehicleAccident, TransportIncident,
    VehicleInsurance, VehicleRegistration, VehiclePermit, TransportVendor
)

@admin.register(VehicleCategory)
class VehicleCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'tenant_id')
    search_fields = ('code', 'name_ar')

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('vehicle_number', 'plate_number', 'capacity', 'fuel_type', 'status')
    list_filter = ('status', 'fuel_type')
    search_fields = ('vehicle_number', 'plate_number')

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'license_number', 'license_type')
    search_fields = ('license_number',)

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'estimated_distance_km')
    search_fields = ('code', 'name_ar')

@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ('route', 'vehicle', 'driver', 'status', 'start_time')
    list_filter = ('status',)

@admin.register(FuelTransaction)
class FuelTransactionAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'liters', 'cost', 'transaction_date')
    list_filter = ('transaction_date',)

admin.site.register(VehicleType)
admin.site.register(Fleet)
admin.site.register(DriverLicense)
admin.site.register(DriverAssignment)
admin.site.register(TransportSupervisor)
admin.site.register(RouteStop)
admin.site.register(TripSchedule)
admin.site.register(Passenger)
admin.site.register(PassengerAssignment)
admin.site.register(StudentPickupPoint)
admin.site.register(StudentDropPoint)
admin.site.register(TripAttendance)
admin.site.register(VehicleInspection)
admin.site.register(FuelStation)
admin.site.register(OdometerReading)
admin.site.register(VehicleAccident)
admin.site.register(TransportIncident)
admin.site.register(VehicleInsurance)
admin.site.register(VehicleRegistration)
admin.site.register(VehiclePermit)
admin.site.register(TransportVendor)
