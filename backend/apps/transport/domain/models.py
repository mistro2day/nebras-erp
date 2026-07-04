from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
from apps.assets.domain.models import Asset  # ربط الحافلات كأصول

# 1. VehicleCategory (فئات المركبات)
class VehicleCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم الفئة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم الفئة بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز فئة المركبة")

    class Meta:
        db_table = 'nebras_transport_vehicle_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "فئة المركبة"
        verbose_name_plural = "فئات المركبات"

    def __str__(self):
        return self.name_ar


# 2. VehicleType (طراز ونوع الحافلة/السيارة)
class VehicleType(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="نوع المركبة بالعربي (مثال: حافلة مدرسية كبيرة)")
    name_en = models.CharField(max_length=150, verbose_name="نوع المركبة بالإنجليزي")

    class Meta:
        db_table = 'nebras_transport_vehicle_types'
        verbose_name = "طراز ونوع المركبة"
        verbose_name_plural = "طرازات وأنواع المركبات"

    def __str__(self):
        return self.name_ar


# 3. Fleet (الأسطول أو مجموعات النقل التابعة)
class Fleet(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم الأسطول بالعربي (مثال: أسطول باصات البنين)")
    name_en = models.CharField(max_length=150, verbose_name="اسم الأسطول بالإنجليزي")

    class Meta:
        db_table = 'nebras_transport_fleets'
        verbose_name = "الأسطول"
        verbose_name_plural = "أساطيل النقل والسيارات"


# 4. Vehicle (المركبة وتفاصيلها الفنية)
class Vehicle(CombinedSharedModel):
    STATUS_CHOICES = (
        ('available', 'جاهزة ومتاحة للتشغيل'),
        ('on_trip', 'في رحلة حالياً'),
        ('maintenance', 'في مركز الصيانة والإصلاح'),
        ('out_of_service', 'خارج الخدمة مؤقتاً/تالفة'),
    )
    asset = models.OneToOneField(Asset, on_delete=models.CASCADE, related_name='vehicle_details', verbose_name="الأصل المقابل")
    vehicle_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم الحافلة/المركبة الداخلي")
    plate_number = models.CharField(max_length=50, verbose_name="رقم لوحة المركبة")
    vin = models.CharField(max_length=100, blank=True, null=True, verbose_name="رقم الشاصيه (VIN)")
    capacity = models.IntegerField(default=30, verbose_name="السعة المقعدية القصوى")
    fuel_type = models.CharField(max_length=50, default='diesel', verbose_name="نوع الوقود (ديزل، بنزين)")
    odometer_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="قراءة العداد الحالية (كم)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', verbose_name="حالة المركبة")

    class Meta:
        db_table = 'nebras_transport_vehicles'
        unique_together = ('tenant_id', 'vehicle_number')
        verbose_name = "المركبة"
        verbose_name_plural = "أسطول المركبات والحافلات"

    def __str__(self):
        return f"{self.vehicle_number} - {self.plate_number}"


# 5. Driver (سائقي الحافلات)
class Driver(CombinedSharedModel):
    employee_id = models.UUIDField(db_index=True, verbose_name="الموظف المعين كسائق (من شؤون الموظفين)")
    license_number = models.CharField(max_length=100, verbose_name="رقم رخصة القيادة")
    license_type = models.CharField(max_length=100, verbose_name="فئة الرخصة (ثقيل، عمومي، خصوصي)")

    class Meta:
        db_table = 'nebras_transport_drivers'
        verbose_name = "السائق"
        verbose_name_plural = "سائقي الحافلات والمركبات"


# 6. DriverLicense (تفاصيل رخص القيادة وتواريخ انتهاء الصلاحية)
class DriverLicense(CombinedSharedModel):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='licenses', verbose_name="السائق")
    license_number = models.CharField(max_length=100, verbose_name="رقم الرخصة")
    expiry_date = models.DateField(verbose_name="تاريخ انتهاء صلاحية الرخصة")

    class Meta:
        db_table = 'nebras_transport_driver_licenses'
        verbose_name = "رخصة سائق"
        verbose_name_plural = "تفاصيل رخص قيادة السائقين"


# 7. DriverAssignment (تخصيص وإسناد السائقين للمركبات)
class DriverAssignment(CombinedSharedModel):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='assignments', verbose_name="السائق")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='driver_assignments', verbose_name="المركبة")
    assigned_date = models.DateField(default=timezone.now, verbose_name="تاريخ التخصيص")
    is_active = models.BooleanField(default=True, verbose_name="نشط وجاري قيادة المركبة")

    class Meta:
        db_table = 'nebras_transport_driver_assignments'
        verbose_name = "إسناد سائق"
        verbose_name_plural = "إسنادات السائقين للمركبات"


# 8. TransportSupervisor (مشرفي النقل / الباصات)
class TransportSupervisor(CombinedSharedModel):
    employee_id = models.UUIDField(db_index=True, verbose_name="المشرف (من شؤون الموظفين)")
    phone_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم الهاتف")

    class Meta:
        db_table = 'nebras_transport_supervisors'
        verbose_name = "مشرف حافلة"
        verbose_name_plural = "مشرفي الحافلات والنقل"


# 9. Route (مسارات وخطوط النقل المدرسي)
class Route(CombinedSharedModel):
    name_ar = models.CharField(max_length=200, verbose_name="اسم مسار النقل بالعربي")
    name_en = models.CharField(max_length=200, verbose_name="اسم مسار النقل بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز المسار")
    estimated_distance_km = models.DecimalField(max_digits=8, decimal_places=2, default=0.00, verbose_name="المسافة التقريبية (كم)")

    class Meta:
        db_table = 'nebras_transport_routes'
        unique_together = ('tenant_id', 'code')
        verbose_name = "مسار النقل"
        verbose_name_plural = "مسارات وخطوط النقل"

    def __str__(self):
        return self.name_ar


# 10. RouteStop (المحطات ونقاط التجمع التابعة للمسار)
class RouteStop(CombinedSharedModel):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='stops', verbose_name="المسار")
    stop_name_ar = models.CharField(max_length=150, verbose_name="اسم المحطة بالعربي")
    stop_name_en = models.CharField(max_length=150, verbose_name="اسم المحطة بالإنجليزي")
    sequence_number = models.IntegerField(default=1, verbose_name="ترتيب المحطة بالمسار")

    class Meta:
        db_table = 'nebras_transport_route_stops'
        verbose_name = "محطة مسار"
        verbose_name_plural = "محطات نقاط التجمع بالمسارات"


# 11. Trip (الرحلات والتشغيل الفعلي)
class Trip(CombinedSharedModel):
    STATUS_CHOICES = (
        ('scheduled', 'مجدولة بانتظار الانطلاق'),
        ('running', 'قيد التحرك والتشغيل حالياً'),
        ('completed', 'اكتملت الرحلة بنجاح'),
        ('cancelled', 'ملغاة'),
    )
    route = models.ForeignKey(Route, on_delete=models.PROTECT, verbose_name="مسار الرحلة")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='trips', verbose_name="المركبة المستخدمة")
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name='trips', verbose_name="سائق الرحلة")
    supervisor = models.ForeignKey(TransportSupervisor, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="مشرف الحافلة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', verbose_name="حالة الرحلة")
    start_time = models.DateTimeField(blank=True, null=True, verbose_name="وقت الانطلاق الفعلي")
    end_time = models.DateTimeField(blank=True, null=True, verbose_name="وقت الوصول الفعلي")

    class Meta:
        db_table = 'nebras_transport_trips'
        verbose_name = "رحلة نقل"
        verbose_name_plural = "رحلات النقل والتحركات"


# 12. TripSchedule (جداول مواعيد الرحلات المتكررة)
class TripSchedule(CombinedSharedModel):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, verbose_name="المسار")
    departure_time = models.TimeField(verbose_name="وقت التحرك المعتاد")

    class Meta:
        db_table = 'nebras_transport_trip_schedules'
        verbose_name = "جدولة رحلة"
        verbose_name_plural = "جداول مواعيد الرحلات"


# 13. Passenger (قائمة الركاب المسموح لهم كطالب/معلم)
class Passenger(CombinedSharedModel):
    user_id = models.UUIDField(db_index=True, verbose_name="الراكب (طالب/معلم)")
    status = models.CharField(max_length=50, default='active', verbose_name="حالة الاشتراك بالنقل")

    class Meta:
        db_table = 'nebras_transport_passengers'
        verbose_name = "راكب"
        verbose_name_plural = "الركاب المشتركين بالنقل"


# 14. PassengerAssignment (تخصيص الركاب بمسار ونقاط تجمع محددة)
class PassengerAssignment(CombinedSharedModel):
    passenger = models.ForeignKey(Passenger, on_delete=models.CASCADE, related_name='assignments', verbose_name="الراكب")
    route = models.ForeignKey(Route, on_delete=models.CASCADE, verbose_name="المسار المخصص")

    class Meta:
        db_table = 'nebras_transport_passenger_assignments'
        verbose_name = "تخصيص راكب"
        verbose_name_plural = "تخصيصات الركاب بالمسارات"


# 15. StudentPickupPoint (نقاط الركوب المخصصة للطالب صباحاً)
class StudentPickupPoint(CombinedSharedModel):
    student_id = models.UUIDField(db_index=True, verbose_name="الطالب")
    stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, verbose_name="محطة الركوب")

    class Meta:
        db_table = 'nebras_transport_pickup_points'
        verbose_name = "نقطة ركوب طالب"
        verbose_name_plural = "نقاط ركوب الطلاب الصباحية"


# 16. StudentDropPoint (نقاط الهبوط المخصصة للطالب مساءً)
class StudentDropPoint(CombinedSharedModel):
    student_id = models.UUIDField(db_index=True, verbose_name="الطالب")
    stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, verbose_name="محطة الهبوط والنزول")

    class Meta:
        db_table = 'nebras_transport_drop_points'
        verbose_name = "نقطة نزول طالب"
        verbose_name_plural = "نقاط هبوط ونزول الطلاب المسائية"


# 17. TripAttendance (تسجيل حضور الركاب بالباص صعوداً وهبوطاً)
class TripAttendance(CombinedSharedModel):
    STATUS_CHOICES = (
        ('boarded', 'صعد للحافلة بنجاح'),
        ('dropped_off', 'نزل من الحافلة بنجاح'),
        ('absent', 'غائب ولم يصعد'),
        ('no_show', 'لم يحضر بالمحطة'),
    )
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='attendances', verbose_name="الرحلة")
    passenger = models.ForeignKey(Passenger, on_delete=models.CASCADE, verbose_name="الراكب")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='boarded', verbose_name="حالة حضور الراكب")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="وقت تسجيل العملية")

    class Meta:
        db_table = 'nebras_transport_trip_attendance'
        verbose_name = "تحضير راكب"
        verbose_name_plural = "تحضير ركاب الرحلات"


# 18. VehicleInspection (الفحص الفني والأمان اليومي للحافلة)
class VehicleInspection(CombinedSharedModel):
    STATUS_CHOICES = (
        ('passed', 'اجتاز فحص الأمان بنجاح'),
        ('failed', 'فشل في الفحص ويوجد ملاحظات/أعطال'),
    )
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='inspections', verbose_name="المركبة")
    inspection_date = models.DateField(default=timezone.now, verbose_name="تاريخ الفحص")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='passed', verbose_name="نتيجة الفحص الفني")
    notes = models.TextField(blank=True, null=True, verbose_name="تفاصيل الملاحظات وعوامل الخطر")

    class Meta:
        db_table = 'nebras_transport_inspections'
        verbose_name = "فحص مركبة"
        verbose_name_plural = "سجلات فحوصات المركبات الفنية"


# 19. FuelStation (محطات الوقود المعتمدة للتموين)
class FuelStation(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم المحطة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم المحطة بالإنجليزي")

    class Meta:
        db_table = 'nebras_transport_fuel_stations'
        verbose_name = "محطة وقود"
        verbose_name_plural = "محطات وقود التموين"


# 20. FuelTransaction (حركات تعبئة وتموين الوقود)
class FuelTransaction(CombinedSharedModel):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name='fuel_transactions', verbose_name="المركبة")
    station = models.ForeignKey(FuelStation, on_delete=models.PROTECT, verbose_name="محطة الوقود")
    liters = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="كمية الوقود باللتر")
    cost = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="تكلفة الوقود الإجمالية")
    transaction_date = models.DateField(default=timezone.now, verbose_name="تاريخ تعبئة الوقود")
    odometer_reading = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="قراءة العداد عند التعبئة")
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد استهلاك الوقود المنعكس بالمالية")

    class Meta:
        db_table = 'nebras_transport_fuel_transactions'
        verbose_name = "عملية تموين وقود"
        verbose_name_plural = "سجلات تعبئة وتموين الوقود"


# 21. OdometerReading (تتبع قراءات عداد الكيلومترات للمركبات)
class OdometerReading(CombinedSharedModel):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='odometer_readings', verbose_name="المركبة")
    reading_date = models.DateField(default=timezone.now, verbose_name="تاريخ القراءة")
    reading_value = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="قراءة العداد (كم)")

    class Meta:
        db_table = 'nebras_transport_odometer_readings'
        verbose_name = "قراءة عداد"
        verbose_name_plural = "سجلات قراءات عداد المسافات"


# 22. VehicleAccident (حوادث المركبات الموثقة)
class VehicleAccident(CombinedSharedModel):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='accidents', verbose_name="المركبة")
    accident_time = models.DateTimeField(default=timezone.now, verbose_name="وقت وقوع الحادث")
    description = models.TextField(verbose_name="توصيف الحادث والتلفيات الحاصلة")

    class Meta:
        db_table = 'nebras_transport_accidents'
        verbose_name = "حادث مركبة"
        verbose_name_plural = "سجلات حوادث المركبات"


# 23. TransportIncident (بلاغات التأخير والتعطل والمشاكل الميدانية بالمسار)
class TransportIncident(CombinedSharedModel):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='incidents', verbose_name="الرحلة")
    incident_time = models.DateTimeField(default=timezone.now, verbose_name="وقت البلاغ")
    description = models.TextField(verbose_name="توصيف المشكلة (عطل بالباص، زحام مروري، تأخر)")

    class Meta:
        db_table = 'nebras_transport_incidents'
        verbose_name = "بلاغ عطل أو تأخير"
        verbose_name_plural = "بلاغات الحوادث والمشاكل الميدانية"


# 24. VehicleInsurance (سجلات وثائق تأمين المركبات)
class VehicleInsurance(CombinedSharedModel):
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='insurance', verbose_name="المركبة")
    policy_number = models.CharField(max_length=100, verbose_name="رقم وثيقة التأمين")
    expiry_date = models.DateField(verbose_name="تاريخ انتهاء وثيقة التأمين")

    class Meta:
        db_table = 'nebras_transport_insurances'
        verbose_name = "تأمين مركبة"
        verbose_name_plural = "سجلات وثائق تأمين الحافلات"


# 25. VehicleRegistration (رخص سير واستمارات الحافلات)
class VehicleRegistration(CombinedSharedModel):
    vehicle = models.OneToOneField(Vehicle, on_delete=models.CASCADE, related_name='registration', verbose_name="المركبة")
    registration_number = models.CharField(max_length=100, verbose_name="رقم رخصة السير / الاستمارة")
    expiry_date = models.DateField(verbose_name="تاريخ انتهاء الاستمارة")

    class Meta:
        db_table = 'nebras_transport_registrations'
        verbose_name = "استمارة مركبة"
        verbose_name_plural = "رخص سير واستمارات الحافلات"


# 26. VehiclePermit (تصاريح التشغيل الصادرة للحافلات المدرسية)
class VehiclePermit(CombinedSharedModel):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='permits', verbose_name="المركبة")
    permit_number = models.CharField(max_length=100, verbose_name="رقم تصريح التشغيل المدرسي")
    expiry_date = models.DateField(verbose_name="تاريخ انتهاء التصريح")

    class Meta:
        db_table = 'nebras_transport_permits'
        verbose_name = "تصريح تشغيل"
        verbose_name_plural = "تصاريح التشغيل للحافلات المدرسية"


# 27. TransportVendor (موردي تأجير وصيانة الحافلات الخارجيين)
class TransportVendor(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم المورد بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم المورد بالإنجليزي")

    class Meta:
        db_table = 'nebras_transport_vendors'
        verbose_name = "مورد خارجي"
        verbose_name_plural = "موردي قطاع النقل الخارجيين"


# 28. FleetStatistics (إحصائيات الأسطول التراكمية)
class FleetStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    total_vehicles = models.IntegerField(default=0, verbose_name="عدد المركبات الكلي")
    running_trips_count = models.IntegerField(default=0, verbose_name="عدد الرحلات النشطة")

    class Meta:
        db_table = 'nebras_transport_statistics'
        verbose_name = "إحصائية أسطول"
        verbose_name_plural = "إحصائيات أسطول الحافلات الدورية"


# 29. TransportSettings (إعدادات وسياسات النقل المدرسي)
class TransportSettings(CombinedSharedModel):
    max_capacity_buffer = models.IntegerField(default=2, verbose_name="مقاعد إضافية مسموح بها كحد أقصى")
    safety_check_required = models.BooleanField(default=True, verbose_name="إلزامية الفحص اليومي لعوامل السلامة")

    class Meta:
        db_table = 'nebras_transport_settings'
        verbose_name = "إعدادات النقل"
        verbose_name_plural = "إعدادات وسياسات قطاع النقل والأسطول"


# 30. TransportAudit (سجل تدقيق تحركات وحجوزات النقل الحساسة)
class TransportAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100, verbose_name="نوع العملية")
    performed_by = models.UUIDField(null=True, blank=True, verbose_name="المستخدم المنفذ")
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict, verbose_name="تفاصيل العملية")

    class Meta:
        db_table = 'nebras_transport_audits'
        verbose_name = "سجل تدقيق النقل"
        verbose_name_plural = "سجلات تدقيق عمليات النقل والأسطول"